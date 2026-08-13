import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization, prefer",
  "Access-Control-Max-Age": "86400",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const MAX_RANGE_DAYS = 90

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function ymdUTC(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function defaultRange(): { start: string; end: string } {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  return { start: ymdUTC(start), end: ymdUTC(end) }
}

function normalizeRange(body: { startDate?: string; endDate?: string }): {
  start: string
  end: string
  error?: string
} {
  const fallback = defaultRange()
  let start = body.startDate?.trim() || fallback.start
  let end = body.endDate?.trim() || fallback.end

  const startD = parseYmd(start)
  const endD = parseYmd(end)
  if (!startD || !endD) {
    return { ...fallback, error: "Dates must be YYYY-MM-DD." }
  }
  if (startD > endD) {
    return { ...fallback, error: "Start date must be on or before end date." }
  }

  const yesterday = parseYmd(fallback.end)!
  if (endD > yesterday) end = ymdUTC(yesterday)
  const endFinal = parseYmd(end)!
  let startFinal = startD
  if (startFinal > endFinal) startFinal = endFinal

  const spanDays =
    Math.floor((endFinal.getTime() - startFinal.getTime()) / (24 * 60 * 60 * 1000)) + 1
  if (spanDays > MAX_RANGE_DAYS) {
    startFinal = new Date(endFinal)
    startFinal.setUTCDate(startFinal.getUTCDate() - (MAX_RANGE_DAYS - 1))
  }

  return { start: ymdUTC(startFinal), end: ymdUTC(endFinal) }
}

function daysInRange(start: string, end: string): number {
  const a = parseYmd(start)!
  const b = parseYmd(end)!
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

function cloudflareAuthHeaders(): Record<string, string> | null {
  const token =
    Deno.env.get("CLOUDFLARE_ANALYTICS_API_TOKEN")?.trim() ||
    Deno.env.get("CLOUDFLARE_API_TOKEN")?.trim() ||
    Deno.env.get("CLOUDFLARE_ACCOUNT_TOKEN")?.trim()
  if (token) {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  }
  const apiKey = Deno.env.get("CLOUDFLARE_API_KEY")?.trim()
  const email = Deno.env.get("CLOUDFLARE_EMAIL")?.trim()
  if (apiKey && email) {
    return {
      "X-Auth-Email": email,
      "X-Auth-Key": apiKey,
      "Content-Type": "application/json",
    }
  }
  return null
}

type PageViewRow = { label: string; pageViews: number; visits: number }

function mapRumRank(
  groups: Array<{
    count?: number
    sum?: { visits?: number }
    dimensions?: { metric?: string | null }
  }>,
): PageViewRow[] {
  return (groups || [])
    .map((g) => {
      const raw = g?.dimensions?.metric
      const label =
        raw == null || String(raw).trim() === "" ? "None (direct)" : String(raw).trim()
      return {
        label,
        pageViews: Number(g?.count ?? 0),
        visits: Number(g?.sum?.visits ?? 0),
      }
    })
    .filter((r) => r.pageViews > 0)
}

/** Accounts this API token can actually query (GraphQL viewer) — avoids URI/policy account mismatch. */
async function listTokenAccounts(
  headers: Record<string, string>,
): Promise<{ accounts: Array<{ accountTag: string; name: string }>; error?: string }> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: `{
        viewer {
          accounts {
            accountTag
            name
          }
        }
      }`,
    }),
  })
  const payload = await res.json()
  if (!res.ok || payload.errors?.length) {
    const msg =
      payload.errors?.map((e: { message?: string }) => e.message).filter(Boolean).join("; ") ||
      `Cloudflare GraphQL HTTP ${res.status}`
    return { accounts: [], error: msg }
  }
  const raw = payload?.data?.viewer?.accounts ?? []
  const accounts = raw
    .map((a: { accountTag?: string; name?: string }) => ({
      accountTag: String(a.accountTag || "").trim(),
      name: String(a.name || "").trim(),
    }))
    .filter((a: { accountTag: string }) => a.accountTag)
  return { accounts }
}

async function resolveCloudflareAccountId(
  headers: Record<string, string>,
): Promise<{ accountId: string | null; error?: string }> {
  const listed = await listTokenAccounts(headers)
  const accounts: Array<{ accountTag: string; name: string }> = [...listed.accounts]

  if (!accounts.length) {
    // Fallback: REST accounts list (same token scope)
    const res = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=50", {
      headers,
    })
    const json = await res.json()
    if (!res.ok || json.success === false) {
      return {
        accountId: null,
        error:
          listed.error ||
          json?.errors?.[0]?.message ||
          `Could not list Cloudflare accounts (HTTP ${res.status}).`,
      }
    }
    for (const a of json.result || []) {
      if (a?.id) {
        accounts.push({ accountTag: String(a.id), name: String(a.name || "") })
      }
    }
  }

  if (!accounts.length) {
    return {
      accountId: null,
      error:
        listed.error ||
        "No Cloudflare accounts visible to CLOUDFLARE_ANALYTICS_API_TOKEN. Recreate the token on the account that owns spanationwide.org.",
    }
  }

  const override = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")?.trim()
  if (override) {
    const allowed = accounts.some((a) => a.accountTag === override)
    if (!allowed) {
      return {
        accountId: null,
        error:
          `CLOUDFLARE_ACCOUNT_ID=${override} is not allowed by this API token (allowed: ${accounts
            .map((a) => a.accountTag)
            .join(", ")}). Unset that secret or set it to the token’s account id.`,
      }
    }
    return { accountId: override }
  }

  const preferred =
    accounts.find((a) => /span|nationwide/i.test(a.name)) ||
    accounts[0]
  return { accountId: preferred.accountTag }
}

/** spanationwide.org zone — auto-install Web Analytics sites use site_tag === zone id. */
const SPAN_ZONE_ID = "d8283cfe50b0e9188183602f6361be34"

async function resolveZoneIdAsSiteTag(
  headers: Record<string, string>,
): Promise<string | null> {
  const fromEnv = Deno.env.get("CLOUDFLARE_ZONE_ID")?.trim()
  if (fromEnv) return fromEnv

  const res = await fetch(
    "https://api.cloudflare.com/client/v4/zones?name=spanationwide.org&per_page=5",
    { headers },
  )
  const json = await res.json()
  if (res.ok && json.success !== false) {
    const zone = (json.result || []).find((z: { name?: string; id?: string }) =>
      String(z?.name || "").toLowerCase().includes("spanationwide.org"),
    ) || json.result?.[0]
    if (zone?.id) return String(zone.id)
  }

  // Known zone for this project (same as members-provision). Works when Web Analytics
  // auto-install is on — CF uses the zone tag as the RUM site_tag.
  return SPAN_ZONE_ID
}

async function resolveWebAnalyticsSiteTag(
  headers: Record<string, string>,
  accountId: string,
): Promise<{ siteTag: string | null; error?: string }> {
  const override = Deno.env.get("CLOUDFLARE_WEB_ANALYTICS_SITE_TAG")?.trim()
  if (override) return { siteTag: override }

  // Prefer REST site catalogue when the token can call it (often needs Account Settings Read,
  // not just Account Analytics Read — which is GraphQL-only).
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/rum/site_info/list`,
    { headers },
  )
  const json = await res.json()
  if (res.ok && json.success !== false) {
    const sites: Array<{
      site_tag?: string
      site_name?: string
      ruleset?: { zone_name?: string; host?: string; zone_tag?: string }
    }> = json.result || []
    const match =
      sites.find((s) => {
        const blob = `${s.site_name || ""} ${s.ruleset?.zone_name || ""} ${s.ruleset?.host || ""}`.toLowerCase()
        return blob.includes("spanationwide.org")
      }) || sites[0]

    if (match?.site_tag) return { siteTag: String(match.site_tag) }
    if (match?.ruleset?.zone_tag) return { siteTag: String(match.ruleset.zone_tag) }
  }

  const zoneTag = await resolveZoneIdAsSiteTag(headers)
  if (zoneTag) {
    console.log(
      "web-analytics-summary: rum/site_info/list unavailable; using zone id as siteTag",
      zoneTag,
      json?.errors?.[0]?.message || `HTTP ${res.status}`,
    )
    return { siteTag: zoneTag }
  }

  const listMsg =
    json?.errors?.[0]?.message || `Could not list Web Analytics sites (HTTP ${res.status}).`
  return {
    siteTag: null,
    error:
      `${listMsg} Set secret CLOUDFLARE_WEB_ANALYTICS_SITE_TAG to the site id from Cloudflare → Web Analytics → Manage site (or add Account Settings Read so /rum/site_info/list works).`,
  }
}

function rumSiteFilterClause(siteTag: string | null): string {
  if (!siteTag) return ""
  return `{ OR: [{ siteTag: "${siteTag}" }] }`
}

function buildRumQuery(
  accountId: string,
  datetimeGeq: string,
  datetimeLeq: string,
  dayLimit: number,
  siteTag: string | null,
): string {
  const siteClause = rumSiteFilterClause(siteTag)
  const andParts = [
    `{ datetime_geq: "${datetimeGeq}", datetime_leq: "${datetimeLeq}" }`,
  ]
  if (siteClause) andParts.push(siteClause)
  // Narrow to our hostname when we don't have a reliable siteTag.
  if (!siteTag) {
    andParts.push(`{ OR: [{ requestHost: "spanationwide.org" }, { requestHost: "www.spanationwide.org" }] }`)
  }
  const filter = `filter: { AND: [${andParts.join(",\n              ")}] }`

  return `
    query {
      viewer {
        accounts(filter: { accountTag: "${accountId}" }) {
          total: rumPageloadEventsAdaptiveGroups(
            ${filter}
            limit: 1
          ) {
            count
            sum { visits }
          }
          daily: rumPageloadEventsAdaptiveGroups(
            limit: ${dayLimit}
            ${filter}
            orderBy: [date_ASC]
          ) {
            count
            sum { visits }
            dimensions { date }
          }
          byReferer: rumPageloadEventsAdaptiveGroups(
            limit: 20
            ${filter}
            orderBy: [count_DESC]
          ) {
            count
            sum { visits }
            dimensions { metric: refererHost }
          }
          byPath: rumPageloadEventsAdaptiveGroups(
            limit: 25
            ${filter}
            orderBy: [count_DESC]
          ) {
            count
            sum { visits }
            dimensions { metric: requestPath }
          }
          byCountry: rumPageloadEventsAdaptiveGroups(
            limit: 20
            ${filter}
            orderBy: [count_DESC]
          ) {
            count
            sum { visits }
            dimensions { metric: countryName }
          }
          byHost: rumPageloadEventsAdaptiveGroups(
            limit: 10
            ${filter}
            orderBy: [count_DESC]
          ) {
            count
            sum { visits }
            dimensions { metric: requestHost }
          }
          byBrowser: rumPageloadEventsAdaptiveGroups(
            limit: 15
            ${filter}
            orderBy: [count_DESC]
          ) {
            count
            sum { visits }
            dimensions { metric: userAgentBrowser }
          }
        }
      }
    }
  `
}

async function runRumQuery(
  headers: Record<string, string>,
  query: string,
): Promise<{ account: Record<string, unknown> | null; error?: string }> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  })
  const payload = await res.json()
  if (!res.ok || payload.errors?.length) {
    const msg =
      payload.errors?.map((e: { message?: string }) => e.message).filter(Boolean).join("; ") ||
      `Cloudflare GraphQL HTTP ${res.status}`
    return { account: null, error: msg }
  }
  return { account: payload?.data?.viewer?.accounts?.[0] ?? null }
}

async function fetchWebAnalyticsPageViews(start: string, end: string) {
  const headers = cloudflareAuthHeaders()
  if (!headers) {
    return {
      configured: false,
      error: "Cloudflare API token is not configured on the server.",
    }
  }

  const { accountId, error: accountError } = await resolveCloudflareAccountId(headers)
  if (!accountId) {
    return { configured: true, error: accountError || "Missing Cloudflare account id." }
  }

  const { siteTag, error: siteError } = await resolveWebAnalyticsSiteTag(headers, accountId)
  if (!siteTag) {
    return { configured: true, error: siteError || "Missing Web Analytics site tag." }
  }

  const datetimeGeq = `${start}T00:00:00Z`
  const datetimeLeq = `${end}T23:59:59Z`
  const dayLimit = Math.min(daysInRange(start, end) + 2, MAX_RANGE_DAYS + 5)

  // Account-scoped Web Analytics (RUM) — same source as CF “Web analytics” UI.
  let usedSiteTag: string | null = siteTag
  let { account, error: gqlError } = await runRumQuery(
    headers,
    buildRumQuery(accountId, datetimeGeq, datetimeLeq, dayLimit, siteTag),
  )

  // Auto-install site_tag is usually the zone id, but if that yields empty rows,
  // retry filtered by hostname only (still Account Analytics Read).
  const empty =
    !gqlError &&
    account &&
    Number((account as { total?: Array<{ count?: number }> }).total?.[0]?.count ?? 0) === 0
  if (empty || (gqlError && /siteTag|not authorized|Authentication/i.test(gqlError))) {
    const retry = await runRumQuery(
      headers,
      buildRumQuery(accountId, datetimeGeq, datetimeLeq, dayLimit, null),
    )
    if (!retry.error && retry.account) {
      account = retry.account
      gqlError = undefined
      usedSiteTag = null
    } else if (!account) {
      gqlError = retry.error || gqlError
    }
  }

  if (gqlError) {
    return { configured: true, error: gqlError }
  }
  if (!account) {
    return { configured: true, error: "No Cloudflare account analytics returned." }
  }

  const rum = account as {
    total?: Array<{ count?: number; sum?: { visits?: number } }>
    daily?: Array<{ count?: number; sum?: { visits?: number }; dimensions?: { date?: string } }>
    byReferer?: Array<{ count?: number; sum?: { visits?: number }; dimensions?: { metric?: string | null } }>
    byPath?: Array<{ count?: number; sum?: { visits?: number }; dimensions?: { metric?: string | null } }>
    byCountry?: Array<{ count?: number; sum?: { visits?: number }; dimensions?: { metric?: string | null } }>
    byHost?: Array<{ count?: number; sum?: { visits?: number }; dimensions?: { metric?: string | null } }>
    byBrowser?: Array<{ count?: number; sum?: { visits?: number }; dimensions?: { metric?: string | null } }>
  }

  const totalRow = rum.total?.[0]
  const pageViews = Number(totalRow?.count ?? 0)
  const visits = Number(totalRow?.sum?.visits ?? 0)

  const series = (rum.daily || []).map((g) => ({
    date: String(g?.dimensions?.date ?? ""),
    pageViews: Number(g?.count ?? 0),
    visits: Number(g?.sum?.visits ?? 0),
  }))

  return {
    configured: true,
    source: "web_analytics",
    accountId,
    siteTag: usedSiteTag || siteTag,
    range: { start, end },
    totals: { pageViews, visits },
    series,
    referers: mapRumRank(rum.byReferer || []),
    paths: mapRumRank(rum.byPath || []),
    countries: mapRumRank(rum.byCountry || []),
    hosts: mapRumRank(rum.byHost || []),
    browsers: mapRumRank(rum.byBrowser || []),
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders })
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""))
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: member, error: memberError } = await admin
      .from("members")
      .select("member_id, volunteer, applications, bills, registration")
      .eq("user_id", user.id)
      .maybeSingle()

    if (memberError || !isExec(member)) {
      return new Response(JSON.stringify({ error: "Exec access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let body: { startDate?: string; endDate?: string } = {}
    if (req.method === "POST") {
      try {
        body = (await req.json()) as { startDate?: string; endDate?: string }
      } catch {
        body = {}
      }
    } else {
      const url = new URL(req.url)
      body = {
        startDate: url.searchParams.get("startDate") || undefined,
        endDate: url.searchParams.get("endDate") || undefined,
      }
    }

    const range = normalizeRange(body)
    const cloudflare = await fetchWebAnalyticsPageViews(range.start, range.end)

    return new Response(
      JSON.stringify({
        ok: true,
        fetchedAt: new Date().toISOString(),
        rangeWarning: range.error || null,
        cloudflare,
        medium: {
          href: "https://medium.com/me/stats",
          note: "Medium has no public stats API — open Medium Stats while signed into the SPAN account.",
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("web-analytics-summary error", err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

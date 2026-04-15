import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
// Support both spellings (secrets are easy to mis-name). Trim to avoid copy/paste newline breaks.
const OPENSTATES_API_KEY = (
  Deno.env.get("OPENSTATES_API_KEY") ?? Deno.env.get("OPEN_STATES_API_KEY") ?? ""
).trim()

const OPENSTATES_BASE = "https://v3.openstates.org"

function openStatesUserErrorMessage(status: number, data: unknown): string {
  if (data && typeof data === "object" && "detail" in data) {
    const d = (data as Record<string, unknown>).detail
    if (typeof d === "string" && d.trim()) return d.trim()
    if (Array.isArray(d) && d.length) {
      try {
        return JSON.stringify(d)
      } catch {
        /* fall through */
      }
    }
  }
  if (status === 401) {
    return "Open States rejected the API key. Set OPENSTATES_API_KEY (or OPEN_STATES_API_KEY) in Edge Function secrets and redeploy."
  }
  if (status === 403) return "Open States returned forbidden for this key or resource."
  if (status === 404) return "Open States returned not found for this resource."
  return `Open States request failed (HTTP ${status}).`
}

/** Open States accepts apikey in query or X-API-KEY; include both for compatibility. */
function openStatesUrl(pathWithQuery: string): string {
  const sep = pathWithQuery.includes("?") ? "&" : "?"
  const key = encodeURIComponent(OPENSTATES_API_KEY)
  return `${OPENSTATES_BASE}${pathWithQuery}${sep}apikey=${key}`
}

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

/** Allow US state + DC Open States jurisdiction strings only (no arbitrary URLs). */
function validateJurisdiction(j: unknown): string | null {
  const s = typeof j === "string" ? j.trim() : ""
  if (
    /^ocd-jurisdiction\/country:us\/state:[a-z]{2}\/government$/i.test(s) ||
    /^ocd-jurisdiction\/country:us\/district:dc\/government$/i.test(s)
  ) {
    return s
  }
  return null
}

function validateCommitteeId(id: unknown): string | null {
  const s = typeof id === "string" ? id.trim() : ""
  if (!s.startsWith("ocd-organization/")) return null
  if (/[\s?#]/.test(s) || s.includes("..")) return null
  return s
}

function validatePersonId(id: unknown): string | null {
  const s = typeof id === "string" ? id.trim() : ""
  if (!s.startsWith("ocd-person/")) return null
  if (/[\s?#]/.test(s) || s.includes("..")) return null
  return s
}

function buildCommitteesQuery(params: {
  jurisdiction: string
  page: number
  perPage: number
  chamber?: string
  name?: string
}): string {
  const q = new URLSearchParams()
  q.set("jurisdiction", params.jurisdiction)
  q.set("page", String(params.page))
  q.set("per_page", String(params.perPage))
  if (params.chamber && ["lower", "upper", "legislature"].includes(params.chamber)) {
    q.set("chamber", params.chamber)
  }
  if (params.name && params.name.trim()) {
    q.set("name", params.name.trim().slice(0, 200))
  }
  return `/committees?${q.toString()}`
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    if (!OPENSTATES_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENSTATES_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const jwt = authHeader.replace("Bearer ", "")
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: callerMember } = await admin
      .from("members")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!isExec(callerMember)) {
      return new Response(JSON.stringify({ error: "Only executive directors can use Open States proxy" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body = await req.json() as Record<string, unknown>
    const op = typeof body.op === "string" ? body.op : ""

    if (op === "committees_list") {
      const jurisdiction = validateJurisdiction(body.jurisdiction)
      if (!jurisdiction) {
        return new Response(JSON.stringify({ error: "Invalid or missing jurisdiction" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const page = Math.max(1, Math.min(500, Number(body.page) || 1))
      // Open States validates per_page ∈ [1, 20] (stricter than older docs).
      const perPage = Math.max(1, Math.min(20, Number(body.per_page) || 20))
      const chamber = typeof body.chamber === "string" ? body.chamber : undefined
      const name = typeof body.name === "string" ? body.name : undefined
      const path = buildCommitteesQuery({ jurisdiction, page, perPage, chamber, name })
      const url = openStatesUrl(path)
      const resp = await fetch(url, {
        headers: {
          "X-API-KEY": OPENSTATES_API_KEY,
          Accept: "application/json",
        },
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: openStatesUserErrorMessage(resp.status, data),
            upstreamStatus: resp.status,
            upstreamDetail: data,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (op === "committee_detail") {
      const committeeId = validateCommitteeId(body.committee_id)
      if (!committeeId) {
        return new Response(JSON.stringify({ error: "Invalid or missing committee_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const enc = encodeURIComponent(committeeId)
      // Memberships are omitted unless explicitly included (OpenAPI default include=[]).
      const url = openStatesUrl(`/committees/${enc}?include=memberships`)
      const resp = await fetch(url, {
        headers: {
          "X-API-KEY": OPENSTATES_API_KEY,
          Accept: "application/json",
        },
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: openStatesUserErrorMessage(resp.status, data),
            upstreamStatus: resp.status,
            upstreamDetail: data,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    /** Batch GET /people?id=...&id=... (max 25) for full person records (email, links, contact_details). */
    if (op === "people_by_ids") {
      const raw = body.person_ids
      if (!Array.isArray(raw) || raw.length === 0) {
        return new Response(JSON.stringify({ error: "person_ids must be a non-empty array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const ids: string[] = []
      for (const x of raw) {
        const v = validatePersonId(x)
        if (v && !ids.includes(v)) ids.push(v)
        if (ids.length >= 25) break
      }
      if (ids.length === 0) {
        return new Response(JSON.stringify({ error: "No valid ocd-person ids" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const q = new URLSearchParams()
      for (const id of ids) {
        q.append("id", id)
      }
      const url = openStatesUrl(`/people?${q.toString()}`)
      const resp = await fetch(url, {
        headers: {
          "X-API-KEY": OPENSTATES_API_KEY,
          Accept: "application/json",
        },
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: openStatesUserErrorMessage(resp.status, data),
            upstreamStatus: resp.status,
            upstreamDetail: data,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Unknown op" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("openstates-proxy error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })

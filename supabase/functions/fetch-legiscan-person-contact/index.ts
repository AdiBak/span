import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

// Must be set as a Supabase secret (server-side), NOT VITE_LEGISCAN_API_KEY.
const LEGISCAN_API_KEY = Deno.env.get("LEGISCAN_API_KEY") ?? ""

const PERSON_CACHE_BUSTER = "v1"

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function escapeContactString(s: unknown): string {
  return String(s ?? "").trim()
}

function extractContact(person: unknown): { email: string; phone: string; webmailUrl: string } {
  const p = (person && typeof person === "object" ? person : {}) as Record<string, unknown>
  const bio = (p.bio && typeof p.bio === "object" ? p.bio : {}) as Record<string, unknown>
  const bioSocial = (bio.social && typeof bio.social === "object" ? bio.social : {}) as Record<string, unknown>
  const emailRaw =
    p.email ||
    p.contact_email ||
    p.office_email ||
    p.work_email ||
    p.public_email ||
    bioSocial.email ||
    ""
  const phoneRaw =
    p.phone ||
    p.phone_number ||
    p.office_phone ||
    p.capitol_phone ||
    p.contact_phone ||
    bioSocial.capitol_phone ||
    bioSocial.district_phone ||
    bioSocial.phone ||
    ""
  const webmailRaw =
    p.webmail ||
    p.web_mail ||
    p.webmail_url ||
    p.web_mail_url ||
    p.contact_url ||
    p.contact_form_url ||
    p.contact_form ||
    bioSocial.webmail ||
    bioSocial.website ||
    ""

  const email = escapeContactString(emailRaw)
  const phone = escapeContactString(phoneRaw).replace(/\s+/g, " ")
  const webmailUrl = escapeContactString(webmailRaw)
  return { email, phone, webmailUrl }
}

function normalizeStateCode(state: unknown): string | null {
  const s = String(state ?? "").trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(s)) return s
  return null
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
    const body = await req.json() as { people_id?: string | number; op?: string; state?: string }
    const op = body?.op === "session_people" ? "session_people" : "get_person"

    if (!LEGISCAN_API_KEY) {
      return new Response(JSON.stringify({ error: "LEGISCAN_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify caller is an exec
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
      return new Response(JSON.stringify({ error: "Only executive directors can fetch contact info" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (op === "session_people") {
      const state = normalizeStateCode(body?.state)
      if (!state) {
        return new Response(JSON.stringify({ error: "state (2-letter code) is required for session_people" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const sessionsUrl = `https://api.legiscan.com/?key=${encodeURIComponent(
        LEGISCAN_API_KEY
      )}&op=getSessionList&state=${encodeURIComponent(state)}`
      const sessionsResp = await fetch(sessionsUrl)
      if (!sessionsResp.ok) {
        return new Response(JSON.stringify({ error: `LegiScan getSessionList failed: HTTP ${sessionsResp.status}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const sessionsData = await sessionsResp.json()
      if (sessionsData?.status && sessionsData.status !== "OK") {
        return new Response(JSON.stringify({ error: `LegiScan getSessionList returned ${sessionsData.status}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const rawSessions = Array.isArray(sessionsData?.sessions)
        ? sessionsData.sessions
        : Object.values((sessionsData?.sessions || {}) as Record<string, unknown>)
      const sessions = rawSessions.filter((x) => x && typeof x === "object") as Record<string, unknown>[]
      if (!sessions.length) {
        return new Response(JSON.stringify({ ok: true, people: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const sorted = [...sessions].sort((a, b) => {
        const aCurrent = Number(Boolean(a?.current))
        const bCurrent = Number(Boolean(b?.current))
        if (aCurrent !== bCurrent) return bCurrent - aCurrent
        const aYear = Number(a?.year_start || 0)
        const bYear = Number(b?.year_start || 0)
        if (aYear !== bYear) return bYear - aYear
        return Number(b?.session_id || 0) - Number(a?.session_id || 0)
      })
      const sessionId = sorted[0]?.session_id
      if (!sessionId) {
        return new Response(JSON.stringify({ ok: true, people: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const peopleUrl = `https://api.legiscan.com/?key=${encodeURIComponent(
        LEGISCAN_API_KEY
      )}&op=getSessionPeople&id=${encodeURIComponent(String(sessionId))}`
      const peopleResp = await fetch(peopleUrl)
      if (!peopleResp.ok) {
        return new Response(JSON.stringify({ error: `LegiScan getSessionPeople failed: HTTP ${peopleResp.status}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const peopleData = await peopleResp.json()
      if (peopleData?.status && peopleData.status !== "OK") {
        return new Response(JSON.stringify({ error: `LegiScan getSessionPeople returned ${peopleData.status}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const rawPeople = peopleData?.sessionpeople || peopleData?.people || peopleData?.data || peopleData
      const people = Array.isArray(rawPeople)
        ? rawPeople.filter(Boolean)
        : Object.values((rawPeople || {}) as Record<string, unknown>).filter((x) => x && typeof x === "object")

      return new Response(JSON.stringify({ ok: true, people }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const people_id = body?.people_id
    if (!people_id) {
      return new Response(JSON.stringify({ error: "people_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Fetch person from LegiScan (server-side: no CORS).
    const url = `https://api.legiscan.com/?key=${encodeURIComponent(LEGISCAN_API_KEY)}&op=getPerson&id=${encodeURIComponent(
      String(people_id)
    )}&cachebust=${encodeURIComponent(PERSON_CACHE_BUSTER)}`

    const resp = await fetch(url)
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `LegiScan getPerson failed: HTTP ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const data = await resp.json()
    if (data?.status && data.status !== "OK") {
      return new Response(JSON.stringify({ error: `LegiScan getPerson returned ${data.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    const person =
      data?.person ||
      data?.data?.person ||
      data?.people ||
      data?.person_data ||
      data?.legislator ||
      data

    const contact = extractContact(person)

    return new Response(
      JSON.stringify({ ok: true, contact }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("fetch-legiscan-person-contact error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })


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
  const emailRaw =
    p.email ||
    p.contact_email ||
    p.office_email ||
    p.work_email ||
    p.public_email ||
    ""
  const phoneRaw =
    p.phone ||
    p.phone_number ||
    p.office_phone ||
    p.capitol_phone ||
    p.contact_phone ||
    ""
  const webmailRaw =
    p.webmail ||
    p.web_mail ||
    p.webmail_url ||
    p.web_mail_url ||
    p.contact_url ||
    p.contact_form_url ||
    p.contact_form ||
    ""

  const email = escapeContactString(emailRaw)
  const phone = escapeContactString(phoneRaw).replace(/\s+/g, " ")
  const webmailUrl = escapeContactString(webmailRaw)
  return { email, phone, webmailUrl }
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
    const body = await req.json() as { people_id?: string | number }
    const { people_id } = body
    if (!people_id) {
      return new Response(JSON.stringify({ error: "people_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

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

    // Fetch person from LegiScan (server-side: no CORS).
    const url = `https://api.legiscan.com/?key=${encodeURIComponent(LEGISCAN_API_KEY)}&op=getPerson&people_id=${encodeURIComponent(
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


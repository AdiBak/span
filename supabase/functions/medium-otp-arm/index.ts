import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const MEDIUM_FORWARD_URL = Deno.env.get("MEDIUM_FORWARD_URL") ?? ""
const MEDIUM_FORWARD_SECRET = Deno.env.get("MEDIUM_FORWARD_SECRET") ?? ""

function hasBlog(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const b = member.blog
  return b === true || b === "true"
}

function isSpanEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@spanationwide.org")
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

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!MEDIUM_FORWARD_URL || !MEDIUM_FORWARD_SECRET) {
    return new Response(JSON.stringify({ error: "Medium forward not configured" }), {
      status: 503,
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

  try {
    const token = authHeader.replace("Bearer ", "")
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: row, error: memberError } = await admin
      .from("members")
      .select("member_id, email, blog")
      .eq("user_id", user.id)
      .maybeSingle()

    if (memberError || !row) {
      return new Response(JSON.stringify({ error: "Member record not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!hasBlog(row)) {
      return new Response(JSON.stringify({ error: "Blog access is not enabled for your account" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const forwardToEmail = (row.email as string | null)?.trim().toLowerCase() ?? ""
    if (!forwardToEmail || !isSpanEmail(forwardToEmail)) {
      return new Response(
        JSON.stringify({ error: "Your SPAN email must be set to an @spanationwide.org address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const forwardRes = await fetch(MEDIUM_FORWARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: MEDIUM_FORWARD_SECRET,
        forwardToEmail,
      }),
    })

    const text = await forwardRes.text()
    let body: Record<string, unknown> = {}
    try {
      body = JSON.parse(text) as Record<string, unknown>
    } catch {
      /* ignore */
    }

    if (!forwardRes.ok || body.ok !== true) {
      console.error("Apps Script forward failed", forwardRes.status, text)
      return new Response(
        JSON.stringify({
          error: typeof body.error === "string" ? body.error : "Failed to register Medium forward",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("medium-otp-arm", err)
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })

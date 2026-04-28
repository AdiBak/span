import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""

/** Comma-separated director emails; falls back to HR_REPORT_NOTIFY_TO then Joel. */
function resignationNotifyRecipients(): string[] {
  const raw =
    Deno.env.get("RESIGNATION_NOTIFY_TO")?.trim() ||
    Deno.env.get("HR_REPORT_NOTIFY_TO")?.trim() ||
    "joel.blessan@spanationwide.org"
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

const FROM_ADDRESS = "SPAN <contact@spanationwide.org>"
const DASHBOARD_URL = Deno.env.get("PRODUCTION_URL")?.trim() || "https://spanationwide.org/dashboard.html"

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
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
    const body = (await req.json()) as { resignation_id?: string }
    const resignationId = String(body.resignation_id ?? "").trim()
    if (!resignationId) {
      return new Response(JSON.stringify({ error: "resignation_id is required" }), {
        status: 400,
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

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
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
      .select("member_id")
      .eq("user_id", user.id)
      .maybeSingle()

    const callerId = callerMember?.member_id as string | undefined
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Member profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: row, error: rowErr } = await admin
      .from("member_resignations")
      .select("resignation_id, member_id, message, status, created_at")
      .eq("resignation_id", resignationId)
      .maybeSingle()

    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: "Resignation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (String(row.member_id) !== String(callerId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: mem } = await admin
      .from("members")
      .select("first_name, last_name, email")
      .eq("member_id", row.member_id)
      .maybeSingle()

    const name =
      `${String(mem?.first_name ?? "").trim()} ${String(mem?.last_name ?? "").trim()}`.trim() || "Member"
    const email = String(mem?.email ?? "").trim()
    const msg = String(row.message ?? "").trim()
    const createdAt = row.created_at
      ? new Date(String(row.created_at)).toLocaleString("en-US", { timeZone: "America/New_York" })
      : ""

    const year = new Date().getFullYear()
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #16213e; font-size: 24px; margin: 0;">SPAN</h1>
          <p style="color: #6c757d; font-size: 14px; margin: 4px 0 0;">Students for Patient Advocacy Nationwide</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 28px;">
          <p style="font-size: 16px; color: #16213e; margin: 0 0 14px;"><strong>Resignation request — please schedule an exit conversation</strong></p>
          <p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 18px;">
            A member has begun the resignation process through the dashboard. Reach out to schedule a conversation with them before their departure is finalized.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #212529;">
            <tr><td style="padding: 8px 0; vertical-align: top; width: 140px;"><strong>Member</strong></td><td style="padding: 8px 0;">${escapeHtml(name)}${email ? ` &lt;${escapeHtml(email)}&gt;` : ""}</td></tr>
            <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Request ID</strong></td><td style="padding: 8px 0;">${escapeHtml(String(row.resignation_id))}</td></tr>
            <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Submitted</strong></td><td style="padding: 8px 0;">${escapeHtml(createdAt)} (ET)</td></tr>
          </table>
          <p style="font-size: 15px; color: #212529; margin: 20px 0 10px;"><strong>Message from member</strong></p>
          <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; white-space: pre-wrap;">${escapeHtml(msg) || "<em>None provided</em>"}</div>
          <p style="font-size: 14px; margin-top: 22px; line-height: 1.6;">
            Next step: coordinate a meeting, then update status under
            <strong>Executive conduct &amp; resignations</strong> on the dashboard when you’ve met.<br/>
            <a href="${escapeHtml(DASHBOARD_URL)}" style="color: #0b6ef9;">Open dashboard</a>
          </p>
        </div>
        <div style="text-align: center; margin-top: 22px;">
          <p style="font-size: 12px; color: #adb5bd;">&copy; ${year} Students for Patient Advocacy Nationwide</p>
        </div>
      </div>
    `

    const to = resignationNotifyRecipients()
    if (to.length === 0) {
      return new Response(JSON.stringify({ error: "No notify recipients configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set")
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject: `[SPAN] Resignation request — ${name}`,
        html,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error("Resend API error:", resendResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const notifiedAt = new Date().toISOString()
    await admin
      .from("member_resignations")
      .update({
        directors_notified_at: notifiedAt,
        status: "requested",
        updated_at: notifiedAt,
      })
      .eq("resignation_id", resignationId)

    const resendData = await resendResponse.json()
    return new Response(JSON.stringify({ ok: true, email_id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("notify-resignation-request error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })

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

/** Comma-separated. Default: Joel. Override in Supabase secrets, e.g. HR_REPORT_NOTIFY_TO */
function notifyRecipients(): string[] {
  const raw =
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
    const body = (await req.json()) as { report_id?: string }
    const reportId = String(body.report_id ?? "").trim()
    if (!reportId) {
      return new Response(JSON.stringify({ error: "report_id is required" }), {
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

    const { data: report, error: reportError } = await admin
      .from("hr_reports")
      .select(
        "report_id, submitted_by, nature_of_complaint, regarding_member_id, regarding_name, regarding_contact, date_occurred, details, status, created_at"
      )
      .eq("report_id", reportId)
      .maybeSingle()

    if (reportError || !report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (String(report.submitted_by) !== String(callerId)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: submitter } = await admin
      .from("members")
      .select("first_name, last_name, email")
      .eq("member_id", report.submitted_by)
      .maybeSingle()

    const submitterName = submitter
      ? `${String(submitter.first_name ?? "").trim()} ${String(submitter.last_name ?? "").trim()}`.trim() ||
        "Member"
      : "Member"
    const submitterEmail = String(submitter?.email ?? "").trim()

    const nature = String(report.nature_of_complaint ?? "").trim()
    let regardingDisplay = String(report.regarding_name ?? "").trim()
    if (!regardingDisplay && report.regarding_member_id) {
      const { data: regMember } = await admin
        .from("members")
        .select("first_name, last_name")
        .eq("member_id", report.regarding_member_id)
        .maybeSingle()
      if (regMember) {
        regardingDisplay =
          `${String(regMember.first_name ?? "").trim()} ${String(regMember.last_name ?? "").trim()}`.trim()
      }
    }
    const regarding =
      regardingDisplay ||
      (report.regarding_member_id ? `(member id: ${report.regarding_member_id})` : "—")
    const regardingContact = String(report.regarding_contact ?? "").trim()
    const dateOccurred = String(report.date_occurred ?? "").trim()
    const details = String(report.details ?? "").trim()
    const createdAt = report.created_at
      ? new Date(String(report.created_at)).toLocaleString("en-US", { timeZone: "America/New_York" })
      : ""

    const subjectNature = nature.length > 60 ? `${nature.slice(0, 57)}…` : nature || "HR report"

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px 16px;">
        <p style="font-size: 16px; color: #16213e; margin: 0 0 16px;"><strong>New HR report filed</strong> on the SPAN dashboard.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #212529;">
          <tr><td style="padding: 8px 0; vertical-align: top; width: 140px;"><strong>Report ID</strong></td><td style="padding: 8px 0;">${escapeHtml(String(report.report_id))}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Submitted by</strong></td><td style="padding: 8px 0;">${escapeHtml(submitterName)}${submitterEmail ? ` &lt;${escapeHtml(submitterEmail)}&gt;` : ""}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Nature</strong></td><td style="padding: 8px 0;">${escapeHtml(nature)}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Regarding</strong></td><td style="padding: 8px 0;">${escapeHtml(regarding)}</td></tr>
          ${
            regardingContact
              ? `<tr><td style="padding: 8px 0; vertical-align: top;"><strong>Outside contact</strong></td><td style="padding: 8px 0;">${escapeHtml(regardingContact)}</td></tr>`
              : ""
          }
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Date occurred</strong></td><td style="padding: 8px 0;">${escapeHtml(dateOccurred)}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Filed at</strong></td><td style="padding: 8px 0;">${escapeHtml(createdAt)} (ET)</td></tr>
        </table>
        <p style="font-size: 15px; color: #212529; margin: 20px 0 8px;"><strong>Details</strong></p>
        <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; white-space: pre-wrap;">${escapeHtml(details) || "<em>None provided</em>"}</div>
        <p style="font-size: 14px; margin-top: 24px;">
          <a href="${escapeHtml(DASHBOARD_URL)}" style="color: #0b6ef9;">Open dashboard</a> → HR Reports to review.
        </p>
        <p style="font-size: 12px; color: #6c757d; margin-top: 24px;">This message was sent because a confidential HR report was submitted. Do not forward indiscriminately.</p>
      </div>
    `

    const to = notifyRecipients()
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
        subject: `[SPAN] New HR report: ${subjectNature}`,
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

    const resendData = await resendResponse.json()
    return new Response(JSON.stringify({ ok: true, email_id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("notify-hr-report error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })

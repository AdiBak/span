import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""

const FROM_ADDRESS = "SPAN <contact@spanationwide.org>"
const DASHBOARD_URL =
  Deno.env.get("PRODUCTION_URL")?.trim() || "https://spanationwide.org/dashboard.html"

/** Comma-separated. Override via APPLICATION_NOTIFY_TO in Supabase secrets. */
function notifyRecipients(): string[] {
  const raw =
    Deno.env.get("APPLICATION_NOTIFY_TO")?.trim() ||
    Deno.env.get("HR_REPORT_NOTIFY_TO")?.trim() ||
    "joel.blessan@spanationwide.org,joelvblessan@gmail.com,vishank.panchbhavi@spanationwide.org,ben.kurian@spanationwide.org,shayan.saqib@spanationwide.org"
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

type WebhookPayload = {
  type?: string
  table?: string
  record?: Record<string, unknown> | null
}

type ApplicationRow = {
  application_id: string
  full_name: string | null
  email: string | null
  phone_number: string | null
  grade: string | null
  school: string | null
  country: string | null
  state: string | null
  hours_per_week: string | null
  referral_source: string | null
  referral_friend_name: string | null
  resume_file: string | null
  status: string | null
  created_at: string | null
  notify_sent_at: string | null
}

function resolveApplicationId(body: Record<string, unknown>): string {
  const direct = String(body.application_id ?? "").trim()
  if (direct) return direct

  const record = body.record as Record<string, unknown> | null | undefined
  if (record?.application_id) return String(record.application_id).trim()

  const webhook = body as WebhookPayload
  if (webhook.record?.application_id) {
    return String(webhook.record.application_id).trim()
  }
  return ""
}

function isWebhookInsert(body: Record<string, unknown>): boolean {
  const type = String(body.type ?? "").toUpperCase()
  const table = String(body.table ?? "").toLowerCase()
  return type === "INSERT" && table === "applications"
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
    const body = (await req.json()) as Record<string, unknown>
    const applicationId = resolveApplicationId(body)
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "application_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase env")
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: app, error: appError } = await admin
      .from("applications")
      .select(
        "application_id, full_name, email, phone_number, grade, school, country, state, hours_per_week, referral_source, referral_friend_name, resume_file, status, created_at, notify_sent_at"
      )
      .eq("application_id", applicationId)
      .maybeSingle()

    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const row = app as ApplicationRow

    if (row.notify_sent_at) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "already_notified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const status = String(row.status ?? "").toLowerCase()
    if (status !== "pending") {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "not_pending" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const fromWebhook = isWebhookInsert(body)
    if (!fromWebhook && row.created_at) {
      const created = new Date(row.created_at).getTime()
      const maxAgeMs = 30 * 60 * 1000
      if (Number.isFinite(created) && Date.now() - created > maxAgeMs) {
        return new Response(JSON.stringify({ error: "Application too old to notify" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

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

    const name = String(row.full_name ?? "").trim() || "Applicant"
    const email = String(row.email ?? "").trim()
    const school = String(row.school ?? "").trim()
    const grade = String(row.grade ?? "").trim()
    const country = String(row.country ?? "").trim()
    const state = String(row.state ?? "").trim()
    const location =
      country && state ? `${state}, ${country}` : country || state || "—"
    const hours = String(row.hours_per_week ?? "").trim() || "—"
    const referral = String(row.referral_source ?? "").trim() || "—"
    const friendRef = String(row.referral_friend_name ?? "").trim()
    const hasResume = Boolean(row.resume_file)
    const filedAt = row.created_at
      ? new Date(String(row.created_at)).toLocaleString("en-US", {
          timeZone: "America/New_York",
        })
      : ""

    const subjectName = name.length > 50 ? `${name.slice(0, 47)}…` : name

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px 16px;">
        <p style="font-size: 16px; color: #16213e; margin: 0 0 16px;"><strong>New SPAN application submitted</strong> on the public site.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #212529;">
          <tr><td style="padding: 8px 0; vertical-align: top; width: 140px;"><strong>Name</strong></td><td style="padding: 8px 0;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Email</strong></td><td style="padding: 8px 0;">${escapeHtml(email) || "—"}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Phone</strong></td><td style="padding: 8px 0;">${escapeHtml(String(row.phone_number ?? "").trim()) || "—"}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Grade</strong></td><td style="padding: 8px 0;">${escapeHtml(grade) || "—"}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>School</strong></td><td style="padding: 8px 0;">${escapeHtml(school) || "—"}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Location</strong></td><td style="padding: 8px 0;">${escapeHtml(location)}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Hours/week</strong></td><td style="padding: 8px 0;">${escapeHtml(hours)}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Referral</strong></td><td style="padding: 8px 0;">${escapeHtml(referral)}${friendRef ? ` (${escapeHtml(friendRef)})` : ""}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Resume</strong></td><td style="padding: 8px 0;">${hasResume ? "Yes (uploaded)" : "No"}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Submitted</strong></td><td style="padding: 8px 0;">${escapeHtml(filedAt)} (ET)</td></tr>
        </table>
        <p style="font-size: 14px; margin-top: 24px;">
          <a href="${escapeHtml(DASHBOARD_URL)}" style="color: #0b6ef9;">Open dashboard</a> → New Member Applications to review.
        </p>
      </div>
    `

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject: `[SPAN] New application: ${subjectName}`,
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
    const sentAt = new Date().toISOString()
    await admin
      .from("applications")
      .update({ notify_sent_at: sentAt })
      .eq("application_id", applicationId)

    return new Response(
      JSON.stringify({ ok: true, email_id: resendData.id, notified_at: sentAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("notify-new-application error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })

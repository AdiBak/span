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

const DEFAULT_FROM = "Joel Blessan <joel.blessan@spanationwide.org>"
const DEFAULT_CC = "vishank.panchbhavi@spanationwide.org,joelvblessan@gmail.com"

function fromAddress(): string {
  return (
    Deno.env.get("ONBOARDING_SCHEDULE_FROM")?.trim() ||
    Deno.env.get("INVITATION_FROM")?.trim() ||
    DEFAULT_FROM
  )
}

function ccList(): string[] {
  const raw =
    Deno.env.get("ONBOARDING_SCHEDULE_CC")?.trim() ||
    Deno.env.get("INVITATION_CC")?.trim() ||
    DEFAULT_CC
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

const SUBJECT = "Congratulations — next step: your SPAN onboarding call"

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildOnboardingScheduleEmailHtml(applicantName: string): string {
  const name = escapeHtml(String(applicantName).trim() || "there")
  const p =
    "font-size: 15px; color: #212529; line-height: 1.65; margin: 0 0 1rem 0;"
  return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #16213e; font-size: 24px; margin: 0;">SPAN</h1>
          <p style="color: #6c757d; font-size: 14px; margin: 4px 0 0;">Students for Patient Advocacy Nationwide</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 32px;">
          <p style="font-size: 16px; color: #212529; margin: 0 0 1rem 0;">Hello ${name},</p>
          <p style="${p}">
            Congratulations — we&apos;re excited to let you know you&apos;ve been selected to join SPAN (Students for Patient Advocacy Nationwide).
          </p>
          <p style="${p}">
            Please reply to this email with your availability over the <strong>next two weeks</strong> so we can schedule your <strong>onboarding call</strong>. We&apos;ll use that conversation to get you set up; more detailed welcome information will be shared during the call itself.
          </p>
          <p style="${p}">
            We look forward to onboarding you soon.
          </p>
          <p style="font-size: 15px; color: #212529; line-height: 1.65; margin: 1.25rem 0 0 0;">
            Best,<br/>
            <strong>Joel Blessan</strong><br/>
            Executive Director | Students for Patient Advocacy Nationwide<br/>
            <a href="mailto:joel.blessan@spanationwide.org" style="color: #0d6efd; text-decoration: none;">joel.blessan@spanationwide.org</a><br/>
            <a href="tel:+18326277795" style="color: #0d6efd; text-decoration: none;">832-627-7795</a>
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <p style="font-size: 12px; color: #adb5bd;">
            &copy; ${new Date().getFullYear()} Students for Patient Advocacy Nationwide
          </p>
        </div>
      </div>
    `
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
    const body = await req.json()
    const { applicant_name, applicant_email, dry_run } = body as {
      applicant_name?: string
      applicant_email?: string
      dry_run?: boolean
    }

    if (!applicant_name || !applicant_email) {
      return new Response(
        JSON.stringify({ error: "applicant_name and applicant_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
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
      return new Response(
        JSON.stringify({ error: "Only executive directors can send onboarding schedule emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const html = buildOnboardingScheduleEmailHtml(String(applicant_name))
    const cc = ccList()
    const from = fromAddress()
    const previewPayload = {
      dry_run: true,
      from,
      to: [String(applicant_email).trim()],
      cc,
      subject: SUBJECT,
      html,
    }

    if (dry_run === true) {
      return new Response(JSON.stringify(previewPayload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set")
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [String(applicant_email).trim()],
        cc,
        subject: SUBJECT,
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
    console.log("Onboarding schedule email sent:", resendData.id, "to:", applicant_email)

    return new Response(
      JSON.stringify({ ok: true, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("send-onboarding-schedule-email error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
}, { verifyJwt: false })

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

const FROM_ADDRESS = "SPAN <contact@spanationwide.org>"

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
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
    const { applicant_name, applicant_email } = await req.json()

    if (!applicant_name || !applicant_email) {
      return new Response(
        JSON.stringify({ error: "applicant_name and applicant_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Verify caller is an exec
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
        JSON.stringify({ error: "Only executive directors can send rejection emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set")
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Send rejection email via Resend
    const firstName = applicant_name.split(" ")[0] || applicant_name

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #16213e; font-size: 24px; margin: 0;">SPAN</h1>
          <p style="color: #6c757d; font-size: 14px; margin: 4px 0 0;">Students for Patient Advocacy Nationwide</p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 32px;">
          <p style="font-size: 16px; color: #212529; margin-top: 0;">Dear ${firstName},</p>
          <p style="font-size: 15px; color: #212529; line-height: 1.6;">
            Thank you for your interest in joining Students for Patient Advocacy Nationwide (SPAN) and for taking the time to submit your application.
          </p>
          <p style="font-size: 15px; color: #212529; line-height: 1.6;">
            After careful review, we regret to inform you that we are unable to offer you a position at this time. This was a difficult decision, and it does not diminish the value of your interest and effort.
          </p>
          <p style="font-size: 15px; color: #212529; line-height: 1.6;">
            We encourage you to apply again in the future, as new opportunities arise regularly. We wish you the very best in your endeavors.
          </p>
          <p style="font-size: 15px; color: #212529; line-height: 1.6; margin-bottom: 0;">
            Warm regards,<br/>
            <strong>The SPAN Team</strong>
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <p style="font-size: 12px; color: #adb5bd;">
            &copy; ${new Date().getFullYear()} Students for Patient Advocacy Nationwide
          </p>
        </div>
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
        to: [applicant_email],
        subject: "Your SPAN Application",
        html: emailHtml,
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
    console.log("Rejection email sent:", resendData.id, "to:", applicant_email)

    return new Response(
      JSON.stringify({ ok: true, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("send-rejection-email error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
}, { verifyJwt: false })

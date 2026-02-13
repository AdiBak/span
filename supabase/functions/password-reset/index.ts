import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""

const FROM_ADDRESS = "SPAN <contact@spanationwide.org>"

function generateRandomPassword(length = 24) {
  const charset =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()-_=+[]{}"
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }
  return password
}

async function sendPasswordResetEmail({
  toEmail,
  toName,
  tempPassword,
}: {
  toEmail: string
  toName: string
  tempPassword: string
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing; skipping password reset email")
    return { ok: false, reason: "missing_credentials" }
  }

  console.log("Sending password reset email via Resend to:", toEmail, "(password masked: ***" + tempPassword.slice(-4) + ")")

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPAN Password Reset</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f7fb; font-family:'Helvetica Neue', Arial, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb; padding:32px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(25,42,86,0.08);">
        <tr>
          <td style="padding:40px 48px 24px;">
            <img src="https://spanationwide.org/images/index/logo-wide-dark.png" alt="SPAN Logo" width="150" height="auto" style="display:block; margin-bottom:24px; max-width:100%; height:auto; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;">

            <p style="color:#1e2746; font-size:16px; margin:0 0 16px; line-height:1.5;">Hi ${toName},</p>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 24px;">
              We received a request to reset your password for your SPAN account. Use the temporary password below to log in, then change your password from your dashboard.
            </p>

            <div style="background:#f0f7ff; border:2px solid #0b6ef9; border-radius:8px; padding:24px; margin:32px 0; text-align:center;">
              <p style="color:#1e2746; font-size:14px; font-weight:600; margin:0 0 12px; text-transform:uppercase; letter-spacing:1px;">
                Your Temporary Password:
              </p>
              <div style="background:#ffffff; border:1px solid #0b6ef9; border-radius:6px; padding:16px; margin:0 auto; display:inline-block; font-family:'Courier New', monospace; font-size:18px; font-weight:600; color:#1e2746; letter-spacing:2px;">
                ${tempPassword}
              </div>
            </div>

            <div style="background:#f0f7ff; border-left:4px solid #0b6ef9; padding:16px; margin:24px 0; border-radius:4px;">
              <p style="color:#1e2746; font-size:15px; line-height:1.6; margin:0 0 8px;">
                <strong>How to use this password:</strong>
              </p>
              <ol style="color:#1e2746; font-size:14px; line-height:1.6; margin:0; padding-left:20px;">
                <li style="margin-bottom:8px;">Go to <a href="https://spanationwide.org/login.html" style="color:#0b6ef9; text-decoration:none;">spanationwide.org/login.html</a></li>
                <li style="margin-bottom:8px;">Log in with your SPAN email and the temporary password above</li>
                <li style="margin-bottom:8px;">Once logged in, go to your dashboard and change your password to something you'll remember</li>
                <li>If you didn't request a password reset, please contact us immediately</li>
              </ol>
            </div>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:24px 0 0;">
              If you have any questions or need assistance, please contact us at <a href="mailto:contact@spanationwide.org" style="color:#0b6ef9; text-decoration:none;">contact@spanationwide.org</a>.
            </p>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:24px 0 0;">
              Best regards,<br>
              <strong>The SPAN Team</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0b6ef9; color:#ffffff; text-align:center; padding:16px; font-size:13px;">
            &copy; SPAN - Students for Patient Advocacy Nationwide
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
  `

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject: "SPAN Password Reset",
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("Resend send failed", response.status, text)
    return { ok: false, status: response.status, body: text }
  }

  const data = await response.json()
  console.log("Resend password reset email sent:", data.id)
  return { ok: true }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request")
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables")
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Create admin client inside the handler to avoid initialization errors
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    let email
    try {
      const body = await req.json()
      email = body.email
    } catch (e) {
      console.error("Failed to parse request body:", e)
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Normalize email
    let normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail.includes("@")) {
      normalizedEmail += "@spanationwide.org"
    }

    console.log("Generating temporary password for:", normalizedEmail)

    // Find the user by email
    const { data: userList, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.error("Failed to list users:", listError)
      return new Response(
        JSON.stringify({ error: "Failed to find user", details: listError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const user = userList.users.find(
      (u) => (u.email ?? "").toLowerCase() === normalizedEmail
    )

    if (!user) {
      console.error("User not found:", normalizedEmail)
      return new Response(
        JSON.stringify({ error: "No account found with this email address" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Generate a temporary password
    const tempPassword = generateRandomPassword()
    console.log("Generated temporary password for", normalizedEmail, "length:", tempPassword.length)

    // Update the user's password
    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: tempPassword }
    )

    if (updateError) {
      console.error("Failed to update user password:", updateError)
      return new Response(
        JSON.stringify({ error: "Failed to reset password", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("Password updated successfully for user:", user.id)

    // Get user's name and personal email from members table if available
    const { data: memberData } = await adminClient
      .from("members")
      .select("first_name, last_name, original_email")
      .eq("email", normalizedEmail)
      .maybeSingle()

    const toName = memberData
      ? `${memberData.first_name || ""} ${memberData.last_name || ""}`.trim() || normalizedEmail
      : normalizedEmail

    // Use personal email (original_email) if available, otherwise fall back to SPAN email
    // This matches the pattern in members-provision where emails are sent to personal emails
    const originalEmailRaw = (memberData?.original_email as string | null) ?? ""
    const deliveryEmailCandidate = originalEmailRaw.trim()
    const deliveryEmail = deliveryEmailCandidate.length > 0 ? deliveryEmailCandidate : normalizedEmail

    console.log(`Sending password reset email to delivery email: ${deliveryEmail} (SPAN email: ${normalizedEmail})`)

    // Send email via Resend to the personal email with temporary password
    const emailResult = await sendPasswordResetEmail({
      toEmail: deliveryEmail,
      toName,
      tempPassword,
    })

    if (!emailResult.ok) {
      console.error("Failed to send password reset email:", emailResult)
      return new Response(
        JSON.stringify({ 
          error: "Failed to send password reset email", 
          details: emailResult.reason || "Email service error" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log("Password reset email sent successfully to:", deliveryEmail)

    return new Response(
      JSON.stringify({ success: true, message: "Password reset email sent with temporary password" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Unexpected error in password-reset function:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
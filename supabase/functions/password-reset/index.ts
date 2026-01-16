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

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send"

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
  const serviceId = Deno.env.get("EMAILJS_PASSWORD_RESET_SERVICE_ID")
  const templateId = Deno.env.get("EMAILJS_PASSWORD_RESET_TEMPLATE_ID")
  const publicKey = Deno.env.get("EMAILJS_PUBLIC_KEY")
  const privateKey = Deno.env.get("EMAILJS_PRIVATE_KEY")

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn("EmailJS credentials missing; skipping password reset email")
    return { ok: false, reason: "missing_credentials" }
  }

  const templateParams = {
    to_email: toEmail,
    to_name: toName,
    temp_password: tempPassword,
  }
  
  console.log("EmailJS template params (password masked):", {
    ...templateParams,
    temp_password: "***" + tempPassword.slice(-4)
  })

  console.log("Sending password reset email via EmailJS to:", toEmail)

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: templateParams,
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("EmailJS send failed", response.status, text)
    return { ok: false, status: response.status, body: text }
  }

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

    // Send email via EmailJS to the personal email with temporary password
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

import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type WebhookPayload = {
  type: string
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const INVITE_REDIRECT_URL =
  Deno.env.get("ONBOARDING_REDIRECT_URL") ?? "https://spanationwide.org/login.html"
const PRODUCTION_URL = Deno.env.get("PRODUCTION_URL") ?? "https://spanationwide.org"

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_ADDRESS = "SPAN <contact@spanationwide.org>"

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4"
const CLOUDFLARE_ZONE_ID = "d8283cfe50b0e9188183602f6361be34"
const CLOUDFLARE_ACCOUNT_ID = "c01cbe5d0d56079ec448c3f92297d09c"

/**
 * Sets up Cloudflare Email Routing for a new member
 * Creates a destination address and routing rule to forward SPAN email to personal email
 */
async function setupCloudflareEmailRouting({
  spanEmail,
  destinationEmail,
}: {
  spanEmail: string
  destinationEmail: string
}) {
  // Try Account API Token first (if available), then fall back to Global API Key
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN")
  const apiKey = Deno.env.get("CLOUDFLARE_API_KEY")
  const email = Deno.env.get("CLOUDFLARE_EMAIL")

  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Cloudflare Email Routing API supports API Tokens with Bearer authentication
  // Need two tokens: one for account-level (addresses) and one for zone-level (rules)
  const accountToken = Deno.env.get("CLOUDFLARE_ACCOUNT_TOKEN") // For addresses
  const zoneToken = Deno.env.get("CLOUDFLARE_ZONE_TOKEN") // For rules

  // Fallback to single token if both tokens not provided
  const singleToken = Deno.env.get("CLOUDFLARE_API_TOKEN")

  // Fallback to Global API Key if tokens not available
  if (!accountToken && !zoneToken && !singleToken && apiKey && email) {
    headers["X-Auth-Key"] = apiKey
    headers["X-Auth-Email"] = email
    console.log("Using Cloudflare Global API Key for authentication")
  } else if (accountToken || zoneToken || singleToken) {
    // Use API Token(s) with Bearer authentication
    const tokenToUse = accountToken || zoneToken || singleToken
    headers["Authorization"] = `Bearer ${tokenToUse}`
    console.log(
      "Using Cloudflare API Token for authentication",
      accountToken ? "(account token)" : zoneToken ? "(zone token)" : "(single token)",
    )
  } else {
    console.warn(
      "Cloudflare credentials missing; skipping email routing setup",
      "Have ACCOUNT_TOKEN:",
      !!accountToken,
      "Have ZONE_TOKEN:",
      !!zoneToken,
      "Have API_TOKEN:",
      !!singleToken,
      "Have API_KEY:",
      !!apiKey,
    )
    return { ok: false, reason: "missing_credentials" }
  }

  try {
    // Step 1: Create or get destination address
    // Use account-level endpoint for addresses (requires account token)
    const addressToken = accountToken || singleToken
    const addressHeaders = addressToken
      ? { ...headers, Authorization: `Bearer ${addressToken}` }
      : headers

    const listDestResponse = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`,
      {
        method: "GET",
        headers: addressHeaders,
      },
    )

    // Log authentication status
    if (!listDestResponse.ok) {
      const errorText = await listDestResponse.text()
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = JSON.stringify(errorJson, null, 2)
      } catch {
        // Keep as text if not JSON
      }
      console.error(
        "Cloudflare authentication failed (GET addresses)",
        "Status:",
        listDestResponse.status,
        "Error:",
        errorDetails,
        "Tip: Verify CLOUDFLARE_API_KEY and CLOUDFLARE_EMAIL match the account that owns the zone",
      )
      return {
        ok: false,
        status: listDestResponse.status,
        body: errorText,
        reason: "authentication_failed",
      }
    }

    let destinationTag: string | null = null
    const listData = await listDestResponse.json()
    if (listData.success && listData.result) {
      const existing = listData.result.find(
        (addr: { email: string }) => addr.email === destinationEmail,
      )
      if (existing) {
        destinationTag = existing.tag
        console.log("Destination address already exists", destinationEmail, destinationTag)
      }
    }

    // Create destination if it doesn't exist
    // Use account-level endpoint for creating addresses
    if (!destinationTag) {
      const createDestResponse = await fetch(
        `${CLOUDFLARE_API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/email/routing/addresses`,
        {
          method: "POST",
          headers: addressHeaders,
          body: JSON.stringify({
            email: destinationEmail,
          }),
        },
      )

      if (!createDestResponse.ok) {
        const errorText = await createDestResponse.text()
        let errorDetails = errorText
        try {
          const errorJson = JSON.parse(errorText)
          errorDetails = JSON.stringify(errorJson, null, 2)
        } catch {
          // Keep as text if not JSON
        }
        console.error(
          "Failed to create Cloudflare destination",
          createDestResponse.status,
          errorDetails,
        )
        return {
          ok: false,
          status: createDestResponse.status,
          body: errorText,
          reason: createDestResponse.status === 403 ? "authentication_failed" : "api_error",
        }
      }

      const destData = await createDestResponse.json()
      if (!destData.success) {
        console.error("Cloudflare API returned success=false", destData)
        return { ok: false, reason: "api_error", body: JSON.stringify(destData) }
      }

      destinationTag = destData.result?.tag
      console.log("Created Cloudflare destination", destinationEmail, destinationTag)
    }

    // Step 2: Create routing rule (forward spanEmail -> destinationEmail)
    // Use zone-level endpoint for rules (requires zone token)
    // Note: actions.value must be an array of email addresses, not destination tags
    const ruleToken = zoneToken || singleToken
    const ruleHeaders = ruleToken
      ? { ...headers, Authorization: `Bearer ${ruleToken}` }
      : headers

    const createRuleResponse = await fetch(
      `${CLOUDFLARE_API_BASE}/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
      {
        method: "POST",
        headers: ruleHeaders,
        body: JSON.stringify({
          name: `Forward ${spanEmail} to ${destinationEmail}`,
          enabled: true,
          priority: 1,
          matchers: [
            {
              type: "literal",
              field: "to",
              value: spanEmail,
            },
          ],
          actions: [
            {
              type: "forward",
              value: [destinationEmail], // Use email address, not destination tag
            },
          ],
        }),
      },
    )

    if (!createRuleResponse.ok) {
      const errorText = await createRuleResponse.text()
      console.error(
        "Failed to create Cloudflare routing rule",
        createRuleResponse.status,
        errorText,
      )
      return { ok: false, status: createRuleResponse.status, body: errorText }
    }

    const ruleData = await createRuleResponse.json()
    console.log("Created Cloudflare routing rule", ruleData.result?.tag)
    return { ok: true, destinationTag, ruleTag: ruleData.result?.tag }
  } catch (err) {
    console.error("Cloudflare API error", err)
    return { ok: false, error: String(err) }
  }
}

async function sendEmailViaResend({
  toEmail,
  toName,
  spanEmail,
  actionLink,
  otp,
  tempPassword,
  inviteType,
}: {
  toEmail: string
  toName: string
  spanEmail: string
  actionLink: string
  otp?: string
  tempPassword?: string
  inviteType: "invite" | "recovery"
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing; skipping outbound email")
    return { ok: false, reason: "missing_credentials" }
  }

  console.log("Sending onboarding email via Resend to:", toEmail, "type:", inviteType,
    "password masked:", tempPassword ? "***" + tempPassword.slice(-4) : "none")

  const tempPasswordBlock = tempPassword ? `
            <div style="background:#fff3cd; border-left:4px solid #ffc107; padding:16px; margin:24px 0; border-radius:4px;">
              <p style="color:#1e2746; font-size:15px; line-height:1.6; margin:0 0 12px;">
                <strong>Your Temporary Password:</strong>
              </p>
              <p style="color:#1e2746; font-size:18px; font-family:'Courier New', monospace; background:#ffffff; padding:12px; border-radius:4px; margin:0; word-break:break-all; text-align:center; font-weight:600; letter-spacing:1px;">
                ${tempPassword}
              </p>
              <p style="color:#856404; font-size:13px; margin:12px 0 0; line-height:1.5;">
                <strong>Important:</strong> Please save this password. You'll use it to log in for the first time. After completing registration, you can change your password in the dashboard.
              </p>
            </div>
  ` : ""

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SPAN!</title>
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
              Welcome to <strong>SPAN (Students for Patient Advocacy Nationwide)</strong>! We're thrilled to have you join our community and can't wait to see the impact you'll make.
            </p>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 24px;">
              Here's how to get started with your new SPAN login (<strong>${spanEmail}</strong>):
            </p>

            ${tempPasswordBlock}

            <ol style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 24px; padding-left:20px;">
              <li style="margin-bottom:16px;">
                <strong>Log in to your account:</strong><br>
                Click the button below to go to the login page. Enter your SPAN email (<strong>${spanEmail}</strong>) and the temporary password shown above. Alternatively, you can click the link in this email which will automatically log you in.
              </li>
              <li style="margin-bottom:16px;">
                <strong>Complete your registration:</strong><br>
                After logging in, you'll see a registration form that's been pre-filled with your information. Please review and complete all required fields, including uploading a profile photo. This form collects your contact information, school details, and other important background information.
              </li>
              <li style="margin-bottom:16px;">
                <strong>Set your password:</strong><br>
                After completing the registration form, you'll have full access to your dashboard where you can change your password to something more memorable.
              </li>
              <li style="margin-bottom:16px;">
                <strong>Verify email routing:</strong><br>
                Look out for a Cloudflare email asking you to verify this forwarding address so SPAN mail reaches your inbox.
              </li>
              <li style="margin-bottom:16px;">
                <strong>Explore the dashboard:</strong><br>
                Once your registration is complete, you'll have full access to track volunteer hours, browse resources, and get to know the team.
              </li>
              <li>
                <strong>Join Slack:</strong><br>
                Hop into our <a href="https://span-nhi9797.slack.com/join/shared_invite/zt-3m31djuer-w9OaPInrVZWeHYoipfoIYQ" style="color:#0b6ef9; text-decoration:none;">team workspace</a> for ongoing updates.
              </li>
            </ol>

            <div style="text-align:center; margin-bottom:32px;">
              <a href="${actionLink}" style="background:#0b6ef9; color:#ffffff; padding:14px 28px; border-radius:999px; text-decoration:none; font-weight:600; display:inline-block;">
                Go to Login Page
              </a>
            </div>

            <div style="background:#f0f7ff; border-left:4px solid #0b6ef9; padding:16px; margin:24px 0; border-radius:4px;">
              <p style="color:#1e2746; font-size:15px; line-height:1.6; margin:0;">
                <strong>Important:</strong> You'll need to complete the registration form before you can access all dashboard features. The form is pre-filled with information we have on file, so you just need to review, update if needed, and add any missing details (like your profile photo).
              </p>
            </div>

            <h3 style="color:#1e2746; font-size:18px; margin:0 0 12px;">Member Expectations</h3>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 16px;">
              As part of SPAN, you'll help advance youth-led healthcare advocacy and education. We ask members to stay engaged, represent SPAN professionally, collaborate across projects, and keep learning.
            </p>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 16px;">
              Questions? Contact Ben Kurian at <a href="tel:6145885400" style="color:#0b6ef9; text-decoration:none;">(614) 588-5400</a> or email <a href="mailto:contact@spanationwide.org" style="color:#0b6ef9; text-decoration:none;">contact@spanationwide.org</a>.
            </p>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0;">
              We're excited to have you on board and can't wait to see what you accomplish with SPAN!
            </p>

            <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:24px 0 0;">
              Best regards,<br>
              <strong>Ben Kurian</strong><br>
              Executive Director, SPAN
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#0b6ef9; color:#ffffff; text-align:center; padding:16px; font-size:13px;">
            &copy; ${spanEmail} &middot; ${inviteType.toUpperCase()}
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
      subject: inviteType === "invite" ? "Welcome to SPAN!" : "Your SPAN Account",
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error("Resend send failed", response.status, text)
    return { ok: false, status: response.status, body: text }
  }

  const data = await response.json()
  console.log("Resend onboarding email sent:", data.id)
  return { ok: true }
}

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

serve(
  async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = (await req.json()) as WebhookPayload
    const member = payload?.record ?? null

    if (!member) {
      return new Response(JSON.stringify({ status: "ignored", reason: "No record in payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const emailRaw = (member.email as string | null) ?? null
    if (!emailRaw) {
      return new Response(JSON.stringify({ status: "ignored", reason: "Member missing email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const email = emailRaw.trim().toLowerCase()
    const originalEmailRaw = (member.original_email as string | null) ?? ""
    const deliveryEmailCandidate = originalEmailRaw.trim()
    const deliveryEmail = deliveryEmailCandidate.length > 0 ? deliveryEmailCandidate : email

    console.log(
      "Provisioning member email",
      email,
      "member_id",
      member.member_id,
      "delivery_email",
      deliveryEmail,
    )
    const memberId = member.member_id as string | undefined
    const userIdInRow = member.user_id as string | null

    // Provision auth user, handling duplicates gracefully
    let userId: string | null = null
    let inviteType: "invite" | "recovery" = "invite"
    let createdNewUser = false
    let shouldSendEmail = true

    const password = generateRandomPassword()
    console.log("Generated password for", email, "length:", password.length)
    const displayName = [member.first_name, member.last_name]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(" ")

    // First, check if user already exists to avoid unnecessary createUser call
    const normalizedEmail = email.toLowerCase()
    const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
      perPage: 200,
    })
    
    let existingUser: { id: string; email?: string | null } | null = null
    if (!listError && listData?.users) {
      existingUser = listData.users.find(
        (user) => (user.email ?? "").toLowerCase() === normalizedEmail,
      ) || null
    }

    // Generate invite link BEFORE creating user (for new users)
    // This avoids the "email_exists" error when generating invite links
    let linkData:
      | Awaited<ReturnType<typeof adminClient.auth.admin.generateLink>>["data"]
      | null = null

    if (existingUser) {
      // User already exists - use their existing user_id
      console.log("User already exists in auth", existingUser.id, "for", email)
      userId = existingUser.id
      inviteType = "recovery"
      createdNewUser = false
      // Only send email if user_id wasn't already linked to this member
      if (userIdInRow && userIdInRow === userId) {
        console.log("User already linked to member, skipping email send")
        shouldSendEmail = false
      } else {
        // Generate recovery link for existing user
        const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: INVITE_REDIRECT_URL,
          },
        })

        if (recoveryError) {
          console.error("Failed to generate recovery link", recoveryError)
          return new Response("Failed to generate recovery link", {
            status: 500,
            headers: corsHeaders,
          })
        }

        linkData = recoveryData
        console.log("Recovery link generated", inviteType, recoveryData)
      }
    } else {
      // User doesn't exist - create user FIRST, then generate invite link
      // Note: We create the user first because generateLink with type "invite" may create the user automatically
      console.log("User doesn't exist, creating user first")
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        // Set email_confirm to true so new members can log in immediately with the temporary password
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          first_name: member.first_name ?? null,
          last_name: member.last_name ?? null,
          role: member.role ?? null,
        },
      })

      if (createError) {
        const code = (createError as { code?: string }).code
        console.log("createUser error code", code, "message", (createError as { message?: string }).message)
        console.error("createUser error detail", createError)
        
        // If email_exists error occurs (shouldn't happen after our check, but handle it anyway)
        if (code === "email_exists") {
          inviteType = "recovery"
          // Try to find the user again
          const { data: retryListData, error: retryListError } = await adminClient.auth.admin.listUsers({
            perPage: 200,
          })
          if (retryListError) {
            console.error("Failed to list users after email_exists", retryListError)
            return new Response("Failed to list existing users", {
              status: 500,
              headers: corsHeaders,
            })
          }
          const existing = retryListData?.users?.find(
            (user) => (user.email ?? "").toLowerCase() === normalizedEmail,
          )
          if (!existing) {
            console.error("email_exists but user not found in listUsers", JSON.stringify(retryListData))
            return new Response("Failed to locate existing user", {
              status: 500,
              headers: corsHeaders,
            })
          }
          console.log("Found existing auth user", existing.id, "for", email)
          userId = existing.id
          if (userIdInRow && userIdInRow === userId) {
            shouldSendEmail = false
          }
          // Generate recovery link for existing user
          const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
              redirectTo: INVITE_REDIRECT_URL,
            },
          })
          if (recoveryError) {
            console.error("Failed to generate recovery link", recoveryError)
            return new Response("Failed to generate recovery link", {
              status: 500,
              headers: corsHeaders,
            })
          }
          linkData = recoveryData
        } else {
          console.error("Failed to create auth user", createError)
          return new Response("Failed to create auth user", { status: 500, headers: corsHeaders })
        }
      } else {
        // User created successfully - create action link manually since user can log in with temp password
        userId = createdUser?.user?.id ?? null
        createdNewUser = true
        inviteType = "invite"
        
        console.log("User created successfully, creating action link for login page")
        // Since email_confirm is true, user can log in directly with temp password
        // Create a simple action link pointing to login page
        linkData = {
          properties: {
            action_link: INVITE_REDIRECT_URL,
            email_otp: "",
          },
        } as typeof linkData
        console.log("Action link created for new user", linkData)
      }
    }

    if (!userId) {
      return new Response("User ID missing after provisioning", {
        status: 500,
        headers: corsHeaders,
      })
    }

    if (memberId && userId !== userIdInRow) {
      const { error: updateError } = await adminClient
        .from("members")
        .update({ user_id: userId })
        .eq("member_id", memberId)

      if (updateError) {
        console.error("Failed to update members.user_id", updateError)
        return new Response("Failed to update members.user_id", {
          status: 500,
          headers: corsHeaders,
        })
      }
    }

    // Link has already been generated above (before user creation for new users, or for existing users)
    // Now we just need to send the email if needed

    // Set up Cloudflare email routing (non-blocking - if it fails, member provisioning still succeeds)
    if (deliveryEmail && deliveryEmail !== email) {
      const cloudflareResult = await setupCloudflareEmailRouting({
        spanEmail: email,
        destinationEmail: deliveryEmail,
      })
      console.log("Cloudflare email routing setup result", cloudflareResult)
    }

    // Only send email if we should and have a valid link
    if (shouldSendEmail && linkData?.properties?.action_link) {
      // Replace any localhost URLs in the action link with production URL
      let actionLink = linkData.properties.action_link
      // Replace localhost:3000, localhost:5173 (Vite default), or any localhost with production URL
      actionLink = actionLink.replace(
        /https?:\/\/localhost(:\d+)?/g,
        PRODUCTION_URL
      )
      // Also replace 127.0.0.1 if present
      actionLink = actionLink.replace(
        /https?:\/\/127\.0\.0\.1(:\d+)?/g,
        PRODUCTION_URL
      )
      
      // Only send temp password for new invites, not recovery
      const passwordToSend = inviteType === "invite" && createdNewUser ? password : undefined
      
      console.log("Sending email with temp password:", passwordToSend ? "***" + passwordToSend.slice(-4) : "none (recovery)")
      
      const sendResult = await sendEmailViaResend({
        toEmail: deliveryEmail,
        toName: displayName || email,
        spanEmail: email,
        actionLink: actionLink,
        otp: linkData.properties.email_otp,
        tempPassword: passwordToSend, // Send the actual password used to create the user (only for new invites)
        inviteType,
      })
      console.log("Resend send result", sendResult)
    } else if (!shouldSendEmail) {
      console.log("Skipping email send - user already linked to member")
    } else {
      console.warn("No action link returned for", email, "skipping email send")
    }

    console.log(
      JSON.stringify({
        status: "ok",
        user_id: userId,
        invite_type: inviteType,
        member,
      }),
    )

    return new Response("ok", { status: 200, headers: corsHeaders })
  } catch (err) {
    console.error("Unhandled error in members-provision function", err)
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders })
  }
  },
  { verifyJwt: false },
)
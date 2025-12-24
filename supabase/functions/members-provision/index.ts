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

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send"
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

async function sendEmailViaEmailJS({
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
  const serviceId = Deno.env.get("EMAILJS_SERVICE_ID")
  const templateId = Deno.env.get("EMAILJS_TEMPLATE_ID")
  const publicKey = Deno.env.get("EMAILJS_PUBLIC_KEY")
  const privateKey = Deno.env.get("EMAILJS_PRIVATE_KEY")

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    console.warn("EmailJS credentials missing; skipping outbound email")
    return { ok: false, reason: "missing_credentials" }
  }

    const templateParams = {
      to_email: toEmail,
      to_name: toName,
      span_email: spanEmail,
      action_link: actionLink,
      invite_type: inviteType,
      otp: otp ?? "",
      temp_password: tempPassword ?? "",
    }
    
    console.log("EmailJS template params (password masked):", {
      ...templateParams,
      temp_password: templateParams.temp_password ? "***" + templateParams.temp_password.slice(-4) : "empty"
    })
    
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

    const password = generateRandomPassword()
    console.log("Generated password for", email, "length:", password.length)
    const displayName = [member.first_name, member.last_name]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(" ")

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      // Leave email_confirm false so invite link can be sent
      email_confirm: false,
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
      if (code === "email_exists") {
        inviteType = "recovery"
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
          perPage: 200,
        })
        if (listError) {
          console.error("Failed to list users after email_exists", listError)
          return new Response("Failed to list existing users", {
            status: 500,
            headers: corsHeaders,
          })
        }
        const normalizedEmail = email.toLowerCase()
        const existing = listData?.users?.find(
          (user) => (user.email ?? "").toLowerCase() === normalizedEmail,
        )
        if (!existing) {
          console.error("email_exists but user not found in listUsers", JSON.stringify(listData))
          return new Response("Failed to locate existing user", {
            status: 500,
            headers: corsHeaders,
          })
        }
        console.log("Found existing auth user", existing.id, "for", email)
        userId = existing.id
      } else {
        console.error("Failed to create auth user", createError)
        return new Response("Failed to create auth user", { status: 500, headers: corsHeaders })
      }
    } else {
      userId = createdUser?.user?.id ?? null
      createdNewUser = true
      inviteType = "invite"
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

    let linkData:
      | Awaited<ReturnType<typeof adminClient.auth.admin.generateLink>>["data"]
      | null = null

    if (inviteType === "invite") {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          redirectTo: INVITE_REDIRECT_URL,
          data: {
            first_name: member.first_name ?? null,
            last_name: member.last_name ?? null,
            role: member.role ?? null,
          },
        },
      })

      if (inviteError) {
        console.error("Failed to send invite email", inviteError)
        return new Response("Failed to send invite email", {
          status: 500,
          headers: corsHeaders,
        })
      }

      linkData = inviteData
      console.log("Invite link generated", inviteType, inviteData)
    } else {
      const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: INVITE_REDIRECT_URL,
        },
      })

      if (recoveryError) {
        console.error("Failed to send recovery email", recoveryError)
        return new Response("Failed to send invite email", {
          status: 500,
          headers: corsHeaders,
        })
      }

      linkData = recoveryData
      console.log("Recovery link generated", inviteType, recoveryData)
    }

    // Set up Cloudflare email routing (non-blocking - if it fails, member provisioning still succeeds)
    if (deliveryEmail && deliveryEmail !== email) {
      const cloudflareResult = await setupCloudflareEmailRouting({
        spanEmail: email,
        destinationEmail: deliveryEmail,
      })
      console.log("Cloudflare email routing setup result", cloudflareResult)
    }

    if (linkData?.properties?.action_link) {
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
      const passwordToSend = inviteType === "invite" ? password : undefined
      
      console.log("Sending email with temp password:", passwordToSend ? "***" + passwordToSend.slice(-4) : "none (recovery)")
      
      const sendResult = await sendEmailViaEmailJS({
        toEmail: deliveryEmail,
        toName: displayName || email,
        spanEmail: email,
        actionLink: actionLink,
        otp: linkData.properties.email_otp,
        tempPassword: passwordToSend, // Send the actual password used to create the user (only for new invites)
        inviteType,
      })
      console.log("EmailJS send result", sendResult)
    } else {
      console.warn("No action link returned for", email, "skipping EmailJS send")
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


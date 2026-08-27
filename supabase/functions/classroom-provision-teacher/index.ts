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
const PRODUCTION_URL = (Deno.env.get("PRODUCTION_URL") ?? "https://spanationwide.org").replace(/\/$/, "")
const FROM_ADDRESS = "SPAN <contact@spanationwide.org>"
const LOGIN_URL = `${PRODUCTION_URL}/login.html?mode=classroom`

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function generateRandomPassword(length = 16) {
  const charset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }
  return password
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email?: string | null } | null> {
  const target = email.toLowerCase().trim()
  let page = 1
  const perPage = 1000
  while (page <= 20) {
    const { data: userList, error: listError } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    })
    if (listError) throw listError
    const found = userList.users.find((u) => (u.email ?? "").toLowerCase() === target)
    if (found) return found
    if (!userList.users.length || userList.users.length < perPage) break
    page++
  }
  return null
}

async function sendTeacherInviteEmail({
  toEmail,
  toName,
  tempPassword,
  createdNewUser,
}: {
  toEmail: string
  toName: string
  tempPassword?: string
  createdNewUser: boolean
}) {
  if (!RESEND_API_KEY) {
    return { ok: false as const, reason: "missing_credentials" }
  }

  const passwordBlock = tempPassword
    ? `
      <div style="background:#fff3cd; border-left:4px solid #ffc107; padding:16px; margin:24px 0; border-radius:4px;">
        <p style="color:#1e2746; font-size:15px; margin:0 0 12px;"><strong>Temporary password</strong></p>
        <p style="color:#1e2746; font-size:18px; font-family:monospace; background:#fff; padding:12px; border-radius:4px; margin:0; text-align:center; font-weight:600; letter-spacing:1px;">
          ${escapeHtml(tempPassword)}
        </p>
        <p style="color:#856404; font-size:13px; margin:12px 0 0;">
          Use this once to sign in, then change it from Classroom if you like.
        </p>
      </div>`
    : `
      <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 24px;">
        Use the password you already have for this email address.
      </p>`

  const html = `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0; padding:0; background:#f5f7fb; font-family:Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb; padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:12px; overflow:hidden;">
        <tr><td style="padding:40px 48px;">
          <p style="color:#1e2746; font-size:16px; margin:0 0 16px;">Hi ${escapeHtml(toName)},</p>
          <p style="color:#1e2746; font-size:16px; line-height:1.6; margin:0 0 16px;">
            You've been added as a teacher on <strong>SPAN Classroom</strong>.
            ${createdNewUser ? "A login was created for you." : "Your existing login has been linked."}
          </p>
          ${passwordBlock}
          <ol style="color:#1e2746; font-size:16px; line-height:1.6; padding-left:20px;">
            <li style="margin-bottom:12px;">Open the login page and choose <strong>Classroom</strong>.</li>
            <li style="margin-bottom:12px;">Sign in with <strong>${escapeHtml(toEmail)}</strong>.</li>
            <li>Create a class and share the join code with students.</li>
          </ol>
          <p style="margin:28px 0 0;">
            <a href="${escapeHtml(LOGIN_URL)}" style="display:inline-block; background:#16213e; color:#fff; text-decoration:none; padding:12px 22px; border-radius:6px; font-weight:600;">
              Open Classroom login
            </a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject: "Your SPAN Classroom teacher login",
      html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Resend teacher invite failed", response.status, errorText)
    return { ok: false as const, reason: "send_failed", details: errorText }
  }

  return { ok: true as const }
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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
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

    const body = (await req.json()) as { teacher_id?: string }
    const teacherId = String(body.teacher_id ?? "").trim()
    if (!teacherId) {
      return new Response(JSON.stringify({ error: "teacher_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const token = authHeader.replace("Bearer ", "")
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(token)
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
      .select("volunteer, applications, bills, registration")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!isExec(callerMember)) {
      return new Response(JSON.stringify({ error: "Only executives can provision teachers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: teacher, error: teacherError } = await admin
      .from("classroom_teachers")
      .select("teacher_id, user_id, email, first_name, last_name, active")
      .eq("teacher_id", teacherId)
      .maybeSingle()

    if (teacherError || !teacher) {
      return new Response(JSON.stringify({ error: "Teacher not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const email = String(teacher.email || "").trim().toLowerCase()
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Teacher email is missing or invalid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const displayName = [teacher.first_name, teacher.last_name]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" ") || email

    let userId = teacher.user_id as string | null
    let createdNewUser = false
    let tempPassword: string | undefined

    if (userId) {
      // Already linked — optionally confirm auth user still exists; do not reset password.
      const { data: existingById } = await admin.auth.admin.getUserById(userId)
      if (!existingById?.user) {
        userId = null
      }
    }

    if (!userId) {
      const existing = await findAuthUserByEmail(admin, email)
      if (existing) {
        userId = existing.id
      } else {
        tempPassword = generateRandomPassword()
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            display_name: displayName,
            first_name: teacher.first_name ?? null,
            last_name: teacher.last_name ?? null,
            classroom_role: "teacher",
          },
        })
        if (createError || !created?.user) {
          console.error("createUser failed", createError)
          return new Response(
            JSON.stringify({ error: "Failed to create auth user", details: createError?.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }
        userId = created.user.id
        createdNewUser = true
      }

      const { error: linkError } = await admin
        .from("classroom_teachers")
        .update({ user_id: userId, email })
        .eq("teacher_id", teacherId)

      if (linkError) {
        console.error("Failed to link teacher", linkError)
        return new Response(JSON.stringify({ error: "Failed to link teacher to auth user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    const emailResult = await sendTeacherInviteEmail({
      toEmail: email,
      toName: displayName,
      tempPassword: createdNewUser ? tempPassword : undefined,
      createdNewUser,
    })

    const payload: Record<string, unknown> = {
      ok: true,
      teacher_id: teacherId,
      user_id: userId,
      email,
      created_new_user: createdNewUser,
      emailed: emailResult.ok,
    }

    // If email could not be sent, surface temp password once so exec can share manually (local/testing).
    if (createdNewUser && tempPassword && !emailResult.ok) {
      payload.temp_password = tempPassword
      payload.email_error = emailResult.reason
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("classroom-provision-teacher error", err)
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

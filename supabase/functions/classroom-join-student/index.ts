import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

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

    const body = (await req.json()) as {
      code?: string
      email?: string
      password?: string
      first_name?: string
      last_name?: string
      phone?: string
    }

    const code = String(body.code ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")
    const firstName = String(body.first_name ?? "").trim()
    const lastName = String(body.last_name ?? "").trim()
    const phone = String(body.phone ?? "").trim()

    if (!code || !email || !password || !firstName || !lastName || !phone) {
      return new Response(
        JSON.stringify({
          error: "code, email, password, first_name, last_name, and phone are required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (!email.includes("@")) {
      return new Response(JSON.stringify({ error: "Enter a valid school email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: classByCode, error: validateError } = await admin.rpc(
      "validate_classroom_join_code",
      { p_code: code },
    )
    if (validateError) {
      console.error("validate_classroom_join_code failed", validateError)
      return new Response(JSON.stringify({ error: "Could not validate class code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const validated = Array.isArray(classByCode) ? classByCode[0] : classByCode
    const classId = validated?.class_id as string | undefined
    if (!classId) {
      return new Response(JSON.stringify({ error: "Invalid or expired class code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    let createdNewUser = false
    const existing = await findAuthUserByEmail(admin, email)

    if (!existing) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          classroom_role: "student",
        },
      })
      if (createError || !created?.user) {
        console.error("createUser failed", createError)
        return new Response(
          JSON.stringify({
            error: "Could not create classroom account",
            details: createError?.message,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      createdNewUser = true
    }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !signInData.session) {
      const msg = existing
        ? "An account with this email already exists. Use your Classroom password, or reset it from the login page."
        : (signInError?.message || "Could not sign in after creating account")
      return new Response(JSON.stringify({ error: msg }), {
        status: existing ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const userId = signInData.user.id
    const session = signInData.session

    const { data: existingStudent } = await admin
      .from("classroom_students")
      .select("student_id")
      .eq("user_id", userId)
      .maybeSingle()

    let studentId = existingStudent?.student_id as string | undefined

    if (!studentId) {
      const { data: inserted, error: insertError } = await admin
        .from("classroom_students")
        .insert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
        })
        .select("student_id")
        .single()

      if (insertError || !inserted) {
        console.error("student insert failed", insertError)
        return new Response(JSON.stringify({ error: "Could not create student profile" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      studentId = inserted.student_id
    } else {
      await admin
        .from("classroom_students")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
        })
        .eq("student_id", studentId)
    }

    const { error: enrollError } = await admin.from("classroom_enrollments").upsert(
      { class_id: classId, student_id: studentId },
      { onConflict: "class_id,student_id", ignoreDuplicates: true },
    )

    if (enrollError) {
      console.error("enrollment failed", enrollError)
      return new Response(JSON.stringify({ error: "Could not enroll in class" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        class_id: classId,
        created_new_user: createdNewUser,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("classroom-join-student error", err)
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})

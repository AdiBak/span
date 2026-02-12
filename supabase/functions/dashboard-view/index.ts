import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY")
}

/**
 * Executive director = member with ALL 4 permissions:
 * volunteer, applications, bills, registration.
 * Only execs can call this endpoint.
 */
function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return (
    v(member.volunteer) &&
    v(member.applications) &&
    v(member.bills) &&
    v(member.registration)
  )
}

serve(
  async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const url = new URL(req.url)
    const memberId = url.searchParams.get("member_id")
    if (!memberId) {
      return new Response(
        JSON.stringify({ error: "Missing member_id query parameter" }),
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

    try {
      const token = authHeader.replace("Bearer ", "")
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error: userError } = await userClient.auth.getUser(token)
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { data: callerMember, error: callerError } = await admin
        .from("members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      if (callerError || !callerMember) {
        return new Response(JSON.stringify({ error: "Member record not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (!isExec(callerMember)) {
        return new Response(
          JSON.stringify({ error: "Only executive directors (all 4 permissions) can view another member's dashboard" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const { data: member, error: memberError } = await admin
        .from("members")
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle()

      if (memberError || !member) {
        return new Response(JSON.stringify({ error: "Target member not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const targetId = member.member_id as string

      const [volunteerRes, requestsRes, billsByMeRes, applicationsRes, allBillsRes] = await Promise.all([
        admin.from("volunteers").select("*").eq("member_id", targetId).order("start_timestamp", { ascending: false }),
        admin.from("member_requests").select("*").eq("member_id", targetId).order("created_at", { ascending: false }),
        admin.from("bills").select("*").eq("submitted_by", targetId).order("submitted_at", { ascending: false }),
        isExec(member)
          ? admin.from("applications").select("*").order("submitted_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        isExec(member)
          ? admin.from("bills").select("*").order("submitted_at", { ascending: false })
          : Promise.resolve({ data: null, error: null }),
      ])

      const volunteer_entries = volunteerRes.data ?? []
      const leave_requests = requestsRes.data ?? []
      const submitted_bills = billsByMeRes.data ?? []
      const applications = applicationsRes.data ?? []
      const all_bills = allBillsRes.data ?? null

      const payload = {
        member,
        volunteer_entries,
        leave_requests,
        submitted_bills,
        applications,
        bills: isExec(member) ? all_bills : submitted_bills,
      }

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } catch (err) {
      console.error("dashboard-view error:", err)
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
  },
  { verifyJwt: false }
)

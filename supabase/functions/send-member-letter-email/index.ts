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
const MAX_HTML_CHARS = 400_000

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

type Attachment = { filename: string; content: string }

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
    const body = (await req.json()) as {
      member_id?: string
      subject?: string
      html?: string
      attachments?: Attachment[]
      mark_honorable_letter_sent?: boolean
      /** After firing/removal notice: mark proposal + optionally deactivate directory listing. */
      mark_removal_letter_sent?: boolean
      /** Default true when mark_removal_letter_sent — set members.active = false. */
      deactivate_directory?: boolean
      /** When true, CC Executive Directors (role). */
      cc_execs?: boolean
      cc?: string[]
    }

    const memberId = String(body.member_id ?? "").trim()
    const subject = String(body.subject ?? "").trim()
    let html = String(body.html ?? "")
    const attachments = Array.isArray(body.attachments) ? body.attachments : []
    const markHonorableLetterSent = body.mark_honorable_letter_sent === true
    const markRemovalLetterSent = body.mark_removal_letter_sent === true
    const deactivateDirectory =
      body.deactivate_directory === undefined
        ? markRemovalLetterSent
        : body.deactivate_directory === true
    const ccExecs = body.cc_execs === true
    const extraCc = Array.isArray(body.cc)
      ? body.cc.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean)
      : []

    if (!memberId || !subject || !html) {
      return new Response(JSON.stringify({ error: "member_id, subject, and html are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (html.length > MAX_HTML_CHARS) {
      return new Response(JSON.stringify({ error: "html body too large" }), {
        status: 400,
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
      return new Response(JSON.stringify({ error: "Only executives can send member letters" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: target } = await admin
      .from("members")
      .select("member_id, email, original_email, first_name, last_name")
      .eq("member_id", memberId)
      .maybeSingle()

    if (!target) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const toEmail = String(target.original_email || target.email || "").trim()
    if (!toEmail) {
      return new Response(JSON.stringify({ error: "Member has no email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const safeAttachments = attachments
      .slice(0, 3)
      .filter((a) => a && typeof a.filename === "string" && typeof a.content === "string")
      .map((a) => ({
        filename: a.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200),
        content: a.content,
      }))

    const resendBody: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: [toEmail],
      subject,
      html,
    }
    if (safeAttachments.length > 0) {
      resendBody.attachments = safeAttachments
    }

    const ccSet = new Set<string>(extraCc)
    if (ccExecs) {
      // True EDs only — not everyone with full dashboard permissions.
      const { data: execRows } = await admin
        .from("members")
        .select("member_id, email, role, active")

      for (const row of execRows || []) {
        if (row.active === false || row.active === "false") continue
        if (String(row.role || "").trim() !== "Executive Director") continue
        if (String(row.member_id) === String(memberId)) continue
        const em = String(row.email || "").trim().toLowerCase()
        if (em) ccSet.add(em)
      }
    }
    // Never CC the primary recipient
    ccSet.delete(toEmail.toLowerCase())
    const ccList = Array.from(ccSet)
    if (ccList.length > 0) {
      resendBody.cc = ccList
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
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

    if (markHonorableLetterSent) {
      const nowIso = new Date().toISOString()
      await admin
        .from("member_resignations")
        .update({
          status: "honorable_letter_sent",
          updated_at: nowIso,
        })
        .eq("member_id", memberId)
        .in("status", ["requested", "meeting_scheduled", "met", "directors_contacted"])
    }

    let directoryDeactivated = false
    let removalProposalUpdated = false
    if (markRemovalLetterSent) {
      const nowIso = new Date().toISOString()
      const senderId = String((callerMember as { member_id?: string })?.member_id || "").trim() || null

      if (deactivateDirectory) {
        const { error: deactErr } = await admin
          .from("members")
          .update({ active: false })
          .eq("member_id", memberId)
        if (deactErr) {
          console.error("deactivate after removal letter failed", deactErr)
        } else {
          directoryDeactivated = true
        }
      }

      const { data: updatedProposals, error: propErr } = await admin
        .from("member_removal_proposals")
        .update({
          status: "removal_letter_sent",
          letter_sent_at: nowIso,
          letter_sent_by: senderId,
          updated_at: nowIso,
        })
        .eq("member_id", memberId)
        .in("status", ["awaiting_second", "dual_confirmed"])
        .select("proposal_id")

      if (propErr) {
        console.error("update removal proposal after letter failed", propErr)
      } else if (updatedProposals && updatedProposals.length > 0) {
        removalProposalUpdated = true
      } else if (senderId) {
        // No open proposal — create an audit row so Letter sent is visible in Exec Conduct.
        const { error: insErr } = await admin.from("member_removal_proposals").insert({
          member_id: memberId,
          initiated_by: senderId,
          confirmed_by: null,
          status: "removal_letter_sent",
          letter_sent_at: nowIso,
          letter_sent_by: senderId,
          notes: "Recorded when membership-ended email was sent (no prior dual-confirm proposal).",
        })
        if (insErr) {
          console.error("insert removal_letter_sent audit row failed", insErr)
        } else {
          removalProposalUpdated = true
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        email_id: resendData.id,
        to: toEmail,
        cc: ccList,
        directory_deactivated: directoryDeactivated,
        removal_proposal_updated: removalProposalUpdated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("send-member-letter-email error:", err)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}, { verifyJwt: false })

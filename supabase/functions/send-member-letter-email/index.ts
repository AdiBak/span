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
const DASHBOARD_URL = Deno.env.get("PRODUCTION_URL")?.trim() || "https://spanationwide.org/dashboard.html"

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Env list + active Executive Directors (role). Free Slack cannot auto-deactivate via API. */
async function slackDeactivateNotifyEmails(
  admin: ReturnType<typeof createClient>,
  excludeEmails: Set<string>,
): Promise<string[]> {
  const raw =
    Deno.env.get("SLACK_DEACTIVATE_NOTIFY_TO")?.trim() ||
    Deno.env.get("RESIGNATION_NOTIFY_TO")?.trim() ||
    Deno.env.get("HR_REPORT_NOTIFY_TO")?.trim() ||
    "joel.blessan@spanationwide.org"
  const emails = new Set(
    raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  )

  const { data: execRows } = await admin
    .from("members")
    .select("email, role, active")

  for (const row of execRows || []) {
    if (row.active === false || row.active === "false") continue
    if (String(row.role || "").trim() !== "Executive Director") continue
    const em = String(row.email || "").trim().toLowerCase()
    if (em) emails.add(em)
  }

  for (const ex of excludeEmails) emails.delete(ex.toLowerCase())
  return Array.from(emails)
}

async function sendSlackDeactivateReminder(opts: {
  admin: ReturnType<typeof createClient>
  kind: "resignation" | "removal"
  memberName: string
  memberEmail: string
  originalEmail: string
  sentByName: string
}): Promise<boolean> {
  if (!RESEND_API_KEY) return false

  const lookupEmails = [opts.memberEmail, opts.originalEmail]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const exclude = new Set(lookupEmails)
  const to = await slackDeactivateNotifyEmails(opts.admin, exclude)
  if (to.length === 0) {
    console.warn("slack deactivate reminder: no recipients")
    return false
  }

  const kindLabel =
    opts.kind === "removal" ? "removal / firing notice" : "honorable resignation letter"
  const year = new Date().getFullYear()
  const emailLines = [...new Set(lookupEmails)]
    .map((e) => `<code style="background:#f8f9fa;padding:2px 6px;border-radius:4px;">${escapeHtml(e)}</code>`)
    .join(" · ")

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h1 style="color: #16213e; font-size: 24px; margin: 0;">SPAN</h1>
        <p style="color: #6c757d; font-size: 14px; margin: 4px 0 0;">Students for Patient Advocacy Nationwide</p>
      </div>
      <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 28px;">
        <p style="font-size: 16px; color: #16213e; margin: 0 0 14px;"><strong>Action needed: deactivate in Slack</strong></p>
        <p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 18px;">
          A ${escapeHtml(kindLabel)} was just sent${opts.sentByName ? ` by ${escapeHtml(opts.sentByName)}` : ""}.
          Slack Free cannot remove members via API — please deactivate their account manually so they lose workspace access.
        </p>
        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #212529;">
          <tr><td style="padding: 8px 0; vertical-align: top; width: 140px;"><strong>Member</strong></td><td style="padding: 8px 0;">${escapeHtml(opts.memberName)}</td></tr>
          <tr><td style="padding: 8px 0; vertical-align: top;"><strong>Email(s)</strong></td><td style="padding: 8px 0;">${emailLines || "—"}</td></tr>
        </table>
        <p style="font-size: 15px; color: #212529; margin: 20px 0 10px;"><strong>In Slack (desktop)</strong></p>
        <ol style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0; padding-left: 22px;">
          <li>Admin → Workspace settings → People</li>
          <li>Find this member (search by name or email above)</li>
          <li>⋮ → <strong>Deactivate account</strong></li>
        </ol>
        <p style="font-size: 14px; margin-top: 22px; line-height: 1.6;">
          Directory / letter status is tracked under Executive Conduct on the dashboard.<br/>
          <a href="${escapeHtml(DASHBOARD_URL)}" style="color: #0b6ef9;">Open dashboard</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 22px;">
        <p style="font-size: 12px; color: #adb5bd;">&copy; ${year} Students for Patient Advocacy Nationwide</p>
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
      to,
      subject: `[SPAN] Deactivate in Slack — ${opts.memberName}`,
      html,
    }),
  })

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text()
    console.error("slack deactivate reminder Resend error:", resendResponse.status, errorText)
    return false
  }
  return true
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

    let slackDeactivateReminded = false
    if (markHonorableLetterSent || markRemovalLetterSent) {
      const memberName =
        `${String(target.first_name ?? "").trim()} ${String(target.last_name ?? "").trim()}`.trim() ||
        "Member"
      const sentByName =
        `${String((callerMember as { first_name?: string })?.first_name ?? "").trim()} ${String(
          (callerMember as { last_name?: string })?.last_name ?? "",
        ).trim()}`.trim()
      try {
        slackDeactivateReminded = await sendSlackDeactivateReminder({
          admin,
          kind: markRemovalLetterSent ? "removal" : "resignation",
          memberName,
          memberEmail: String(target.email || "").trim(),
          originalEmail: String(target.original_email || "").trim(),
          sentByName,
        })
      } catch (remindErr) {
        console.error("slack deactivate reminder failed", remindErr)
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
        slack_deactivate_reminded: slackDeactivateReminded,
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

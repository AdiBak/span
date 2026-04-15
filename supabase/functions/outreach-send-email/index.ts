import { serve } from "https://deno.land/std@0.203.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 8192
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length))
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j])
    }
  }
  return btoa(binary)
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""

const DEFAULT_FROM = "Joel Blessan <joel.blessan@spanationwide.org>"

/** Only proposal PDFs from our public storage bucket may be attached. */
const PROPOSALS_PUBLIC_PREFIX =
  "https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/"

const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024

function fromAddress(): string {
  return Deno.env.get("OUTREACH_FROM")?.trim() || Deno.env.get("INVITATION_FROM")?.trim() || DEFAULT_FROM
}

function isExec(member: Record<string, unknown> | null): boolean {
  if (!member) return false
  const v = (x: unknown) => x === true || x === "true"
  return v(member.volunteer) && v(member.applications) && v(member.bills) && v(member.registration)
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function allowlistedAttachmentUrl(url: string): boolean {
  const t = url.trim()
  return t.startsWith(PROPOSALS_PUBLIC_PREFIX) && !t.includes("..") && /^https:\/\//i.test(t)
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
    const body = await req.json() as {
      to?: string
      subject?: string
      html?: string
      text?: string
      attachment_url?: string | null
    }

    const to = String(body.to ?? "").trim()
    const subject = String(body.subject ?? "").trim()
    const html = String(body.html ?? "").trim()
    const text = body.text != null ? String(body.text) : ""
    const attachmentUrl = body.attachment_url != null ? String(body.attachment_url).trim() : ""

    if (!to || !isValidEmail(to)) {
      return new Response(JSON.stringify({ error: "Valid recipient email (to) is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (!subject || subject.length > 500) {
      return new Response(JSON.stringify({ error: "Subject is required (max 500 chars)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (!html || html.length > 400_000) {
      return new Response(JSON.stringify({ error: "HTML body is required (max size exceeded)." }), {
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
      return new Response(
        JSON.stringify({ error: "Only executive directors can send outreach emails" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const from = fromAddress()

    type Attachment = { filename: string; content: string }
    let attachments: Attachment[] | undefined

    if (attachmentUrl) {
      if (!allowlistedAttachmentUrl(attachmentUrl)) {
        return new Response(
          JSON.stringify({ error: "Attachment URL must be a public proposals PDF on SPAN storage." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      const pdfRes = await fetch(attachmentUrl)
      if (!pdfRes.ok) {
        return new Response(
          JSON.stringify({ error: "Could not download PDF for attachment." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      const buf = new Uint8Array(await pdfRes.arrayBuffer())
      if (buf.byteLength > MAX_ATTACHMENT_BYTES) {
        return new Response(JSON.stringify({ error: "PDF is too large to attach." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      const content = uint8ToBase64(buf)
      const namePart = attachmentUrl.split("/").pop() || "proposal.pdf"
      const filename = namePart.endsWith(".pdf") ? namePart : `${namePart}.pdf`
      attachments = [{ filename, content }]
    }

    const resendBody: Record<string, unknown> = {
      from,
      to: [to],
      subject,
      html,
    }
    if (text.trim()) {
      resendBody.text = text
    }
    if (attachments) {
      resendBody.attachments = attachments
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
      console.error("Resend outreach error:", resendResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const resendData = await resendResponse.json()
    console.log("Outreach email sent:", resendData.id, "to:", to)

    return new Response(
      JSON.stringify({ ok: true, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("outreach-send-email error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
}, { verifyJwt: false })

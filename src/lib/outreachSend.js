import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/**
 * Send outreach email via Resend (Edge Function). Exec-only.
 * @param {{
 *   to: string,
 *   subject: string,
 *   html: string,
 *   text?: string,
 *   cc?: string[],
 *   attachment_url?: string | null,
 *   attachment_base64?: string | null,
 *   attachment_filename?: string | null,
 * }} payload
 * @returns {Promise<{ ok: boolean, email_id?: string, error?: string }>}
 */
export async function sendOutreachEmailViaResend(payload) {
  if (!SUPABASE_URL) {
    return { ok: false, error: 'Missing VITE_SUPABASE_URL' }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }

  const { cc, ...rest } = payload
  const body = { mode: 'primary', ...rest }
  if (Array.isArray(cc) && cc.length) {
    body.cc = cc.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim())
  }

  const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/outreach-send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    return {
      ok: false,
      error: typeof json.error === 'string' ? json.error : `Send failed (HTTP ${resp.status})`,
    }
  }
  if (json && json.ok === false) {
    return { ok: false, error: typeof json.error === 'string' ? json.error : 'Send failed' }
  }
  return { ok: true, email_id: json.email_id || json.id }
}

/**
 * After submitting via a legislator web form, send the same message to Joel/Vishank for internal records.
 * Leadership To is fixed server-side; optional `cc` (team members / collaborators) is merged.
 * @param {{
 *   subject: string,
 *   html: string,
 *   text?: string,
 *   cc?: string[],
 *   attachment_url?: string | null,
 *   attachment_base64?: string | null,
 *   attachment_filename?: string | null,
 * }} payload
 * @returns {Promise<{ ok: boolean, email_id?: string, error?: string }>}
 */
export async function sendOutreachReferenceCopy(payload) {
  if (!SUPABASE_URL) {
    return { ok: false, error: 'Missing VITE_SUPABASE_URL' }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }

  const { subject, html, text, cc, attachment_url, attachment_base64, attachment_filename } = payload
  const body = {
    mode: 'reference_log',
    subject,
    html,
    text: text ?? '',
    attachment_url: attachment_url ?? null,
    attachment_base64: attachment_base64 ?? null,
    attachment_filename: attachment_filename ?? null,
  }
  if (Array.isArray(cc) && cc.length) {
    body.cc = cc.filter((e) => typeof e === 'string' && e.trim()).map((e) => e.trim())
  }
  const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/outreach-send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })

  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    return {
      ok: false,
      error: typeof json.error === 'string' ? json.error : `Send failed (HTTP ${resp.status})`,
    }
  }
  if (json && json.ok === false) {
    return { ok: false, error: typeof json.error === 'string' ? json.error : 'Send failed' }
  }
  return { ok: true, email_id: json.email_id || json.id }
}

import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/**
 * Send outreach email via Resend (Edge Function). Exec-only.
 * @param {{ to: string, subject: string, html: string, text?: string, attachment_url?: string | null }} payload
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

  const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/outreach-send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
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

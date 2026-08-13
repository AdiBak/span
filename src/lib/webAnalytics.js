import { supabase } from './supabase'
import { supabaseInvokeHeaders } from '../pages/dashboard/supabaseInvoke'

/**
 * Exec-only: Cloudflare website analytics summary (optional date range).
 * @param {{ startDate?: string, endDate?: string }} [range] YYYY-MM-DD
 */
export async function fetchWebAnalyticsSummary(range = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not signed in')
  }

  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const resp = await fetch(`${base}/functions/v1/web-analytics-summary`, {
    method: 'POST',
    headers: supabaseInvokeHeaders(session.access_token),
    body: JSON.stringify({
      startDate: range.startDate || undefined,
      endDate: range.endDate || undefined,
    }),
  })

  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(json.error || `Analytics request failed (${resp.status})`)
  }
  return json
}

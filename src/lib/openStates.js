import { supabase } from './supabase'
import { canonicalUSStateName, US_STATE_CODE_TO_NAME } from './usStateCanonical'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** @param {string} personId */
export function openStatesPersonSponsorKey(personId) {
  const id = String(personId || '').trim()
  return id ? `os:p:${id}` : ''
}

/**
 * Map bill.state (any US label) to Open States jurisdiction id, or null if not a state session.
 * @param {string | null | undefined} stateRaw
 * @returns {string | null}
 */
export function billStateToOpenStatesJurisdiction(stateRaw) {
  const canon = canonicalUSStateName(stateRaw)
  if (!canon) return null
  const entry = Object.entries(US_STATE_CODE_TO_NAME).find(([, name]) => name === canon)
  const code = entry ? entry[0] : null
  if (!code || code === 'US') return null
  if (code === 'DC') return 'ocd-jurisdiction/country:us/district:dc/government'
  return `ocd-jurisdiction/country:us/state:${code.toLowerCase()}/government`
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ ok: boolean, data?: unknown, error?: string, status?: number }>}
 */
export async function invokeOpenStatesProxy(body) {
  if (!SUPABASE_URL) {
    return { ok: false, error: 'Missing VITE_SUPABASE_URL' }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return { ok: false, error: 'Not signed in' }
  }
  const resp = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/openstates-proxy`, {
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
      error: typeof json.error === 'string' ? json.error : `Open States proxy failed (HTTP ${resp.status})`,
      status: resp.status,
      data: json,
    }
  }
  // Edge returns HTTP 200 with { ok: false, error, upstreamDetail } when Open States returns an error (avoids misleading 502 in DevTools).
  if (json && json.ok === false) {
    return {
      ok: false,
      error: typeof json.error === 'string' ? json.error : 'Open States request failed',
      upstreamStatus: json.upstreamStatus,
      data: json,
    }
  }
  return { ok: true, data: json.data }
}

/**
 * @param {unknown} apiPayload — raw `data` from openstates-proxy (Open States JSON body).
 * @returns {{ results: object[], pagination: object }}
 */
export function extractCommitteesList(apiPayload) {
  const root = apiPayload && typeof apiPayload === 'object' ? apiPayload : {}
  const r = /** @type {Record<string, unknown>} */ (root)
  const results = Array.isArray(r.results)
    ? r.results
    : Array.isArray(r.items)
      ? r.items
      : []
  const pagination = r.pagination && typeof r.pagination === 'object' ? r.pagination : {}
  return { results, pagination }
}

/**
 * @param {unknown} apiPayload
 * @returns {Record<string, unknown> | null}
 */
export function extractCommitteeDetailRecord(apiPayload) {
  const root = apiPayload && typeof apiPayload === 'object' ? apiPayload : {}
  const r = /** @type {Record<string, unknown>} */ (root)
  if (r.committee && typeof r.committee === 'object') {
    return /** @type {Record<string, unknown>} */ (r.committee)
  }
  if (typeof r.id === 'string' && r.id.startsWith('ocd-organization/')) {
    return r
  }
  return null
}

/**
 * Stable row key for DB when Open States has no person id (name+role within committee).
 * @param {string} committeeId
 * @param {string} name
 * @param {string | null} role
 */
export function openStatesNameRoleSponsorKey(committeeId, name, role) {
  const cid = String(committeeId || '').trim()
  const n = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const ro = String(role || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return `os:n:${cid}:${n}|${ro}`
}

/**
 * @param {Record<string, unknown> | null} committeeObj
 * @param {string} [committeeId] — used for name-only membership keys
 * @returns {{ personId: string | null, sponsorKey: string, name: string, party: string | null, role: string | null }[]}
 */
export function membershipsFromCommittee(committeeObj, committeeId = '') {
  if (!committeeObj) return []
  const raw = committeeObj.memberships ?? committeeObj.members
  if (!Array.isArray(raw)) return []
  const out = []
  const seen = new Set()
  const cid = String(committeeObj.id || committeeId || '').trim()
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue
    const row = /** @type {Record<string, unknown>} */ (m)
    const person = row.person && typeof row.person === 'object' ? /** @type {Record<string, unknown>} */ (row.person) : null
    const personIdRaw = String(person?.id || row.person_id || row.personId || '').trim()
    const name = String(person?.name || row.person_name || row.name || '').trim()
    if (!name) continue
    const party = person?.party != null ? String(person.party).trim() || null : row.party != null ? String(row.party).trim() || null : null
    const role = row.role != null ? String(row.role).trim() || null : row.role_name != null ? String(row.role_name).trim() || null : null
    const sponsorKey = personIdRaw
      ? openStatesPersonSponsorKey(personIdRaw)
      : openStatesNameRoleSponsorKey(cid, name, role)
    if (!sponsorKey || seen.has(sponsorKey)) continue
    seen.add(sponsorKey)
    out.push({
      personId: personIdRaw || null,
      sponsorKey,
      name,
      party,
      role,
    })
  }
  return out
}

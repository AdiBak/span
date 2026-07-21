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
 * @param {unknown} apiPayload — raw `data` from openstates-proxy for GET /people
 * @returns {object[]}
 */
export function extractPeopleList(apiPayload) {
  const root = apiPayload && typeof apiPayload === 'object' ? apiPayload : {}
  const r = /** @type {Record<string, unknown>} */ (root)
  if (Array.isArray(r.results)) return r.results
  if (Array.isArray(r.items)) return r.items
  return []
}

const PEOPLE_BY_IDS_BATCH = 25

/**
 * Committee membership embeds often omit email/links; fetch full person rows via /people?id=…
 * @param {{ personId: string | null, sponsorKey: string, name: string, party: string | null, role: string | null, email: string | null, webmailUrl: string | null, phone: string | null }[]} baseMembers
 * @returns {Promise<typeof baseMembers>}
 */
export async function enrichCommitteeMembersWithPeopleDetails(baseMembers) {
  const ids = [
    ...new Set(baseMembers.map((m) => String(m.personId || '').trim()).filter((id) => id.startsWith('ocd-person/'))),
  ]
  if (!ids.length) return baseMembers

  /** @type {Map<string, Record<string, unknown>>} */
  const peopleById = new Map()
  for (let i = 0; i < ids.length; i += PEOPLE_BY_IDS_BATCH) {
    const batch = ids.slice(i, i + PEOPLE_BY_IDS_BATCH)
    const res = await invokeOpenStatesProxy({ op: 'people_by_ids', person_ids: batch })
    if (!res.ok) continue
    for (const p of extractPeopleList(res.data)) {
      if (p && typeof p === 'object' && typeof p.id === 'string') {
        peopleById.set(p.id, /** @type {Record<string, unknown>} */ (p))
      }
    }
  }

  return baseMembers.map((m) => {
    const pid = String(m.personId || '').trim()
    if (!pid) return m
    const full = peopleById.get(pid)
    if (!full) return m
    const ch = extractPersonContactChannels(full)
    const fromFull = legislativeGreetingTitleFromOpenStatesPerson(full)
    const chamberFromFull = chamberFromOpenStatesPerson(full)
    return {
      ...m,
      email: m.email || ch.email,
      webmailUrl: m.webmailUrl || ch.webmailUrl,
      phone: m.phone || ch.phone,
      chamber: chamberFromFull || m.chamber || null,
      legislativeGreetingTitle: fromFull || m.legislativeGreetingTitle || null,
    }
  })
}

/** Normalize display names for cross-source matching (LegiScan ↔ Open States). */
export function normalizeOutreachDisplayName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Build matching keys that tolerate common display variants:
 * - "First Last"
 * - "Last, First"
 * - optional middle names/initials
 * @param {string | null | undefined} s
 * @returns {string[]}
 */
export function outreachNameMatchKeys(s) {
  const raw = String(s || '').trim()
  const normalized = normalizeOutreachDisplayName(raw)
  if (!normalized) return []

  const keys = new Set([normalized])
  const parts = normalized.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    const first = parts[0]
    const last = parts[parts.length - 1]
    keys.add(`${first} ${last}`.trim())
    keys.add(`${last} ${first}`.trim())
  }
  return [...keys]
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
 * Best-effort email / web / phone from Open States person (committee detail embed).
 * @param {Record<string, unknown> | null} person
 * @returns {{ email: string | null, webmailUrl: string | null, phone: string | null }}
 */
export function extractPersonContactChannels(person) {
  if (!person || typeof person !== 'object') {
    return { email: null, webmailUrl: null, phone: null }
  }
  let email = null
  const top = String(person.email || '').trim()
  if (top.includes('@')) email = top

  const details = Array.isArray(person.contact_details) ? person.contact_details : []
  for (const d of details) {
    if (!d || typeof d !== 'object') continue
    const row = /** @type {Record<string, unknown>} */ (d)
    if (!email) {
      const em = String(row.email || '').trim()
      if (em.includes('@')) {
        email = em
        break
      }
      const type = String(row.type || '').toLowerCase()
      const val = String(row.value || '').trim()
      if (type === 'email' && val.includes('@')) {
        email = val
        break
      }
    }
  }

  let webmailUrl = null
  const links = Array.isArray(person.links) ? person.links : []
  for (const l of links) {
    if (!l || typeof l !== 'object') continue
    const url = String(/** @type {Record<string, unknown>} */ (l).url || '').trim()
    if (/^https?:\/\//i.test(url)) {
      webmailUrl = url
      break
    }
  }

  let phone = null
  for (const d of details) {
    if (!d || typeof d !== 'object') continue
    const row = /** @type {Record<string, unknown>} */ (d)
    const voice = String(row.voice || '').trim()
    if (voice) {
      phone = voice.replace(/\s+/g, ' ')
      break
    }
    const type = String(row.type || '').toLowerCase()
    const val = String(row.value || '').trim()
    if ((type === 'voice' || type === 'tel') && val) {
      phone = val.replace(/\s+/g, ' ')
      break
    }
  }

  return { email, webmailUrl, phone }
}

/**
 * Open States chamber: upper (Senate) | lower (House) | null.
 * @param {Record<string, unknown> | null} person
 * @returns {'upper' | 'lower' | null}
 */
export function chamberFromOpenStatesPerson(person) {
  if (!person || typeof person !== 'object') return null
  const roles = person.roles
  if (Array.isArray(roles)) {
    for (const r of roles) {
      if (!r || typeof r !== 'object') continue
      const oc = String(/** @type {Record<string, unknown>} */ (r).org_classification || '').toLowerCase()
      if (oc === 'upper') return 'upper'
      if (oc === 'lower') return 'lower'
    }
  }
  const cr = person.current_role
  if (cr && typeof cr === 'object') {
    const oc = String(/** @type {Record<string, unknown>} */ (cr).org_classification || '').toLowerCase()
    if (oc === 'upper') return 'upper'
    if (oc === 'lower') return 'lower'
  }
  return null
}

/**
 * Infer Senator / Representative from Open States person roles (when present).
 * @param {Record<string, unknown> | null} person
 * @returns {'Senator' | 'Representative' | null}
 */
export function legislativeGreetingTitleFromOpenStatesPerson(person) {
  const chamber = chamberFromOpenStatesPerson(person)
  if (chamber === 'upper') return 'Senator'
  if (chamber === 'lower') return 'Representative'
  return null
}

/**
 * When membership embed lacks roles, infer title from the committee’s chamber (Open States: upper | lower | legislature).
 * @param {string | null | undefined} committeeChamber
 * @returns {'Senator' | 'Representative' | null}
 */
export function legislativeGreetingTitleFromCommitteeChamber(committeeChamber) {
  const c = String(committeeChamber || '').toLowerCase()
  if (c === 'upper') return 'Senator'
  if (c === 'lower') return 'Representative'
  return null
}

/** @param {string | null | undefined} chamber */
export function openStatesChamberLabel(chamber) {
  const c = String(chamber || '').toLowerCase()
  if (c === 'upper') return 'Senate'
  if (c === 'lower') return 'House'
  if (c === 'legislature') return 'Legislature'
  return ''
}

/**
 * @param {Record<string, unknown> | null} committeeObj
 * @param {string} [committeeId] — used for name-only membership keys
 * @returns {{ personId: string | null, sponsorKey: string, name: string, party: string | null, role: string | null, email: string | null, webmailUrl: string | null, phone: string | null, chamber: 'upper' | 'lower' | null, legislativeGreetingTitle: 'Senator' | 'Representative' | null }[]}
 */
export function membershipsFromCommittee(committeeObj, committeeId = '') {
  if (!committeeObj) return []
  const raw = committeeObj.memberships ?? committeeObj.members
  if (!Array.isArray(raw)) return []
  const committeeChamber =
    typeof committeeObj === 'object'
      ? String(/** @type {Record<string, unknown>} */ (committeeObj).chamber || '')
          .trim()
          .toLowerCase() || null
      : null
  const committeeChamberAsMember =
    committeeChamber === 'upper' || committeeChamber === 'lower' ? committeeChamber : null
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
    const channels = extractPersonContactChannels(person)
    const chamber = chamberFromOpenStatesPerson(person) || committeeChamberAsMember
    const fromPerson = legislativeGreetingTitleFromOpenStatesPerson(person)
    const fromCommittee = legislativeGreetingTitleFromCommitteeChamber(committeeChamber)
    const legislativeGreetingTitle = fromPerson || fromCommittee || null
    out.push({
      personId: personIdRaw || null,
      sponsorKey,
      name,
      party,
      role,
      email: channels.email,
      webmailUrl: channels.webmailUrl,
      phone: channels.phone,
      chamber,
      legislativeGreetingTitle,
    })
  }
  return out
}

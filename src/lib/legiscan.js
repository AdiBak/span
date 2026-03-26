/**
 * LegiScan API helper for fetching bill status.
 * Calls api.legiscan.com directly from the browser (no Edge Function, no proxy).
 * Requires VITE_LEGISCAN_API_KEY in .env.local.
 *
 * Note: If you see a CORS error in the console, LegiScan does not allow browser
 * requests; then you’d need the Edge Function + proxy again.
 *
 * Free tier: 30,000 queries/month. Docs: https://legiscan.com/legiscan
 */

import { supabase } from './supabase'

const LEGISCAN_API_BASE = 'https://api.legiscan.com/'
const CACHE_PREFIX = 'legiscan_bill_'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
const PERSON_CACHE_PREFIX = 'legiscan_person_'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

async function fetchLegiscanPersonContactViaEdge(peopleId) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token || !SUPABASE_URL) {
    return {
      ok: false,
      contact: { email: '', phone: '', webmailUrl: '' },
      error: 'missing_session',
    }
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-legiscan-person-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ people_id: String(peopleId) }),
  })

  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    return {
      ok: false,
      contact: { email: '', phone: '', webmailUrl: '' },
      error: data?.error || 'edge_error',
    }
  }

  const contact = data?.contact || {}
  const normalizedContact = {
    email: String(contact?.email || '').trim(),
    phone: String(contact?.phone || '').replace(/\s+/g, ' ').trim(),
    webmailUrl: String(contact?.webmailUrl || contact?.webmail_url || '').trim(),
  }
  return {
    ok: Boolean(normalizedContact.email || normalizedContact.phone || normalizedContact.webmailUrl),
    contact: normalizedContact,
    error: null,
  }
}

function getCachedLegiscanPersonContact(cacheKey) {
  try {
    const cached = sessionStorage.getItem(`${PERSON_CACHE_PREFIX}${cacheKey}`)
    if (!cached) return null
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(`${PERSON_CACHE_PREFIX}${cacheKey}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

function cacheLegiscanPersonContact(cacheKey, data) {
  try {
    sessionStorage.setItem(
      `${PERSON_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify({ data, timestamp: Date.now() })
    )
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Call LegiScan API directly (GET with query params).
 */
async function callLegiscanApi(op, params) {
  const apiKey = import.meta.env.VITE_LEGISCAN_API_KEY
  if (!apiKey) {
    throw new Error('VITE_LEGISCAN_API_KEY not set in .env.local')
  }

  const searchParams = new URLSearchParams({ key: apiKey, op, ...params })
  const url = `${LEGISCAN_API_BASE}?${searchParams}`
 
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return await response.json()
}

/**
 * Extract state code and bill number from a LegiScan URL or use provided state/name.
 * URL format: https://legiscan.com/AZ/bill/SB1210/2026
 */
export function parseLegiscanUrl(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.match(/legiscan\.com\/([A-Za-z]{2})\/bill\/([^/]+)/i)
  if (match) return { state: match[1].toUpperCase(), billNumber: match[2].replace(/\s/g, '') }
  return null
}

/**
 * Check cached bill status using change_hash.
 * @param {string} cacheKey - Unique key for this bill (state + billNumber)
 * @returns {object|null} Cached data or null
 */
function getCachedBillStatus(cacheKey) {
  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${cacheKey}`)
    if (!cached) return null
    const { data, hash, timestamp } = JSON.parse(cached)
    // Check if cache is still valid (within duration)
    if (Date.now() - timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`)
      return null
    }
    return { data, hash }
  } catch {
    return null
  }
}

/**
 * Cache bill status with change_hash.
 * @param {string} cacheKey - Unique key for this bill
 * @param {object} data - Bill status data
 * @param {string} hash - change_hash from API response
 */
function cacheBillStatus(cacheKey, data, hash) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${cacheKey}`, JSON.stringify({
      data,
      hash,
      timestamp: Date.now()
    }))
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Search for a bill by state and bill number. Returns first match's bill_id and change_hash.
 * @param {string} state - State code (e.g. AZ) or full state name (e.g. Michigan)
 * @param {string} billNumber - Bill number (e.g. SB1210)
 * @returns {Promise<{billId: number, changeHash: string}|null>} bill_id and change_hash or null
 */
export async function searchBill(state, billNumber) {
  if (!state || !billNumber) return null
  
  // Normalize state to 2-letter code if needed (LegiScan expects codes)
  const stateCode = normalizeStateCode(state)
  if (!stateCode) return null
  
  const bill = billNumber.replace(/\s/g, '')
  
  try {
    const data = await callLegiscanApi('getSearch', { state: stateCode, bill })
    
    // Check status code (LegiScan best practice)
    if (data?.status !== 'OK') {
      console.warn('LegiScan API error:', data?.status, data?.alert?.message || 'Unknown error')
      return null
    }
    
    const sr = data?.searchresult
    if (!sr || sr.summary?.count === 0) return null

    // LegiScan getSearch returns results as numeric keys "0", "1", ... or as .bills array
    let first = null
    if (Array.isArray(sr.bills) && sr.bills.length > 0) {
      first = sr.bills[0]
    } else {
      const key = Object.keys(sr).find((k) => /^\d+$/.test(k))
      if (key) first = sr[key]
    }
    if (first?.bill_id) {
      return {
        billId: first.bill_id,
        changeHash: first.change_hash || null
      }
    }
    return null
  } catch (err) {
    console.error('LegiScan search error:', err)
    return null
  }
}

/**
 * Map LegiScan numeric status code to a short label (common codes)
 */
function legiscanStatusLabel(code) {
  const labels = {
    1: 'Introduced',
    2: 'In Committee',
    3: 'Passed',
    4: 'Failed',
    5: 'Enacted',
    6: 'Vetoed',
    7: 'Withdrawn',
  }
  return labels[code] ?? null
}

/** Standard timeline stage labels (match common LegiScan / UI) */
const TIMELINE_STAGES = ['Introduced', 'In Committee', 'Crossed Over', 'Passed', 'Dead']

/**
 * Detect which chamber (house or senate) an history action refers to, if any.
 * @param {string} actionText - Lowercased action/title text
 * @returns {'house'|'senate'|null}
 */
function detectChamber(actionText) {
  if (!actionText) return null
  // "Assembly" is lower chamber in some states (e.g. CA, NY)
  if (/\b(house|assembly|lower\s+chamber|h\.\s*b\.|hb\s+\d)/.test(actionText)) return 'house'
  if (/\b(senate|upper\s+chamber|s\.\s*b\.|sb\s+\d)/.test(actionText)) return 'senate'
  return null
}

/**
 * Detect which stage index (0..4) an history action refers to, and whether it's a dead outcome.
 * @param {string} actionText - Lowercased action/title text
 * @returns {{ stageIndex: number, isDead: boolean }|null}
 */
function detectStageFromAction(actionText) {
  if (!actionText) return null
  if (/\b(failed|vetoed|withdrawn|died|dead)\b/.test(actionText)) return { stageIndex: 4, isDead: true }
  if (/\b(passed\s+(?:the\s+)?(?:house|assembly)|passed\s+(?:the\s+)?senate|adopted|enacted|signed)\b/.test(actionText)) return { stageIndex: 3, isDead: false }
  if (/\b(crossed\s+over|received\s+in\s+(?:house|senate)|second\s+chamber|engrossed)\b/.test(actionText)) return { stageIndex: 2, isDead: false }
  if (/\b(committee|referred|hearing)\b/.test(actionText)) return { stageIndex: 1, isDead: false }
  if (/\b(introduced|filed|first\s+reading)\b/.test(actionText)) return { stageIndex: 0, isDead: false }
  // "Passed" without chamber might be generic - could map to 3
  if (/\bpassed\b/.test(actionText)) return { stageIndex: 3, isDead: false }
  return null
}

/**
 * Build House and Senate timeline arrays from bill history.
 * Each chamber gets the same 5 stages; dates and state are derived from history events that mention that chamber.
 * @param {object} bill - Raw bill object from LegiScan getBill API
 * @returns {{ house: Array<{label, date, state}>, senate: Array<{label, date, state}> }}
 */
export function buildBillTimelineByChamber(bill) {
  const emptyStages = () => TIMELINE_STAGES.map(label => ({ label, date: null, state: 'pending' }))
  const house = emptyStages()
  const senate = emptyStages()
  const history = Array.isArray(bill.history) ? bill.history : []
  const statusCode = typeof bill.status === 'number' ? bill.status : (bill.status?.status_id ?? bill.status)
  const { isDead: billDead } = statusToTimelineStage(statusCode)

  // Per-chamber: best date we have for each stage (earliest event wins for that stage)
  const houseDates = {}
  const senateDates = {}
  const houseDead = { value: false }
  const senateDead = { value: false }

  for (const h of history) {
    const actionText = (h.action || h.title || h.description || h.action_desc || '').toLowerCase()
    const date = h.date || null
    const chamber = detectChamber(actionText)
    const stageInfo = detectStageFromAction(actionText)
    if (!stageInfo) continue

    const { stageIndex, isDead } = stageInfo
    const stageLabel = TIMELINE_STAGES[stageIndex]

    if (chamber === 'house') {
      if (!houseDates[stageLabel] || (date && date < (houseDates[stageLabel] || ''))) houseDates[stageLabel] = date
      if (isDead) houseDead.value = true
    } else if (chamber === 'senate') {
      if (!senateDates[stageLabel] || (date && date < (senateDates[stageLabel] || ''))) senateDates[stageLabel] = date
      if (isDead) senateDead.value = true
    } else {
      // Unspecified chamber: apply to both if it's a generic milestone (e.g. "Introduced")
      if (stageIndex <= 1) {
        if (!houseDates[stageLabel]) houseDates[stageLabel] = date
        if (!senateDates[stageLabel]) senateDates[stageLabel] = date
      }
    }
  }

  // Fill dates and set completed/current/pending per chamber
  function fillChamberStages(stagesArr, datesObj, chamberDead) {
    let lastCompletedIndex = -1
    for (let i = 0; i < TIMELINE_STAGES.length; i++) {
      const label = TIMELINE_STAGES[i]
      const date = datesObj[label] || null
      if (date) {
        stagesArr[i].date = date
        lastCompletedIndex = i
      }
    }
    for (let i = 0; i < lastCompletedIndex; i++) {
      stagesArr[i].state = (i === 4 && (chamberDead || billDead)) ? 'dead' : 'completed'
    }
    if (lastCompletedIndex >= 0) {
      if (lastCompletedIndex === 4) {
        stagesArr[4].state = (chamberDead || billDead) ? 'dead' : 'completed'
      } else if (lastCompletedIndex === 3) {
        stagesArr[3].state = 'completed'
      } else {
        stagesArr[lastCompletedIndex].state = 'current'
      }
    } else {
      stagesArr[0].state = 'current'
    }
  }

  fillChamberStages(house, houseDates, houseDead.value)
  fillChamberStages(senate, senateDates, senateDead.value)

  return { house, senate }
}

/**
 * Map LegiScan status code to timeline stage index (0..4) and whether it's a terminal "dead" state.
 */
function statusToTimelineStage(statusCode) {
  if (statusCode == null || statusCode === undefined) return { stageIndex: 0, isDead: false }
  const code = Number(statusCode)
  if (code === 4 || code === 6 || code === 7) return { stageIndex: 4, isDead: true } // Failed, Vetoed, Withdrawn -> Dead
  if (code === 3 || code === 5) return { stageIndex: 3, isDead: false } // Passed, Enacted -> Passed
  if (code === 2) return { stageIndex: 1, isDead: false } // In Committee
  return { stageIndex: 0, isDead: false } // 1 Introduced or unknown
}

/**
 * Build a timeline array for the bill (for the LegiScan timeline UI).
 * Each item: { label: string, date: string | null, state: 'completed' | 'current' | 'pending' | 'dead' }
 * @param {object} bill - Raw bill object from LegiScan getBill API
 * @returns {Array<{ label: string, date: string | null, state: string }>}
 */
export function buildBillTimeline(bill) {
  if (!bill) return []
  const history = Array.isArray(bill.history) ? bill.history : []
  const statusCode = typeof bill.status === 'number' ? bill.status : (bill.status?.status_id ?? bill.status)
  const { stageIndex: currentStageIndex, isDead } = statusToTimelineStage(statusCode)

  // Try to assign dates to stages from history (match by keyword or order)
  const stageDates = {}
  const stageKeywords = {
    'Introduced': ['introduced', 'filed', 'first reading'],
    'In Committee': ['committee', 'referred', 'hearing'],
    'Crossed Over': ['crossed over', 'passed', 'second chamber', 'engrossed'],
    'Passed': ['passed', 'enacted', 'signed', 'adopted'],
    'Dead': ['failed', 'vetoed', 'withdrawn', 'died', 'dead'],
  }
  for (const h of history) {
    const actionText = (h.action || h.title || h.description || h.action_desc || '').toLowerCase()
    const date = h.date || null
    for (let i = 0; i < TIMELINE_STAGES.length; i++) {
      const stage = TIMELINE_STAGES[i]
      const keywords = stageKeywords[stage]
      if (keywords.some(kw => actionText.includes(kw)) && !stageDates[stage]) {
        stageDates[stage] = date
        break
      }
    }
  }
  // If we have history but no matches, assign first N dates to first N stages by order
  if (history.length > 0 && Object.keys(stageDates).length === 0) {
    history.slice(0, TIMELINE_STAGES.length).forEach((h, i) => {
      if (TIMELINE_STAGES[i] && h.date) stageDates[TIMELINE_STAGES[i]] = h.date
    })
  }

  return TIMELINE_STAGES.map((label, i) => {
    let state = 'pending'
    if (isDead && i === 4) state = 'dead'
    else if (i < currentStageIndex || (i === currentStageIndex && !isDead)) state = 'completed'
    else if (i === currentStageIndex && isDead) state = 'dead'
    else if (i === currentStageIndex) state = 'current'
    const date = stageDates[label] || null
    if (date && state === 'pending') state = 'completed' // has date => treat as completed
    return { label, date, state }
  })
}

/**
 * Normalize state name to 2-letter code for LegiScan API
 */
function normalizeStateCode(state) {
  if (!state) return null
  
  // If already 2 letters, assume it's a code
  if (state.length === 2) return state.toUpperCase()
  
  // Map common state names to codes
  const stateMap = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
  }
  
  const normalized = state.toLowerCase().trim()
  return stateMap[normalized] || state.toUpperCase()
}

/**
 * Get bill details including status and last action.
 * @param {number} billId - LegiScan bill_id
 * @param {string} expectedHash - Expected change_hash (for cache validation)
 * @returns {Promise<{ status: string, lastAction?: string, statusDate?: string, changeHash?: string }|null>}
 */
export async function getBill(billId, expectedHash = null) {
  if (!billId) return null
  
  try {
    const data = await callLegiscanApi('getBill', { id: String(billId) })
    
    // Check status code (LegiScan best practice)
    if (data?.status !== 'OK') {
      console.warn('LegiScan API error:', data?.status, data?.alert?.message || 'Unknown error')
      return null
    }
    
    const bill = data?.bill
    if (!bill) return null
    
    // Check change_hash - if same as expected, data hasn't changed (use cache)
    const changeHash = bill.change_hash
    if (expectedHash && changeHash === expectedHash) {
      return null // Signal to use cached data
    }
    
    // Status: can be string, number (code), or object with status_desc
    const statusObj = bill.status
    let status = ''
    if (typeof statusObj === 'string') {
      status = statusObj
    } else if (statusObj?.status_desc) {
      status = statusObj.status_desc
    } else if (bill.status_str) {
      status = bill.status_str
    } else if (typeof statusObj === 'number') {
      status = legiscanStatusLabel(statusObj) || `Status ${statusObj}`
    }

    // Last action from history (array of { date, action, ... })
    let lastAction = null
    let statusDate = bill.status_date || null
    const history = bill.history || []
    if (Array.isArray(history) && history.length > 0) {
      const last = history[history.length - 1]
      lastAction = last.action || last.title || last.description || last.action_desc
      if (last.date) statusDate = last.date
    }

    const timeline = buildBillTimeline(bill)
    const { house: timelineHouse, senate: timelineSenate } = buildBillTimelineByChamber(bill)
    return { status, lastAction, statusDate, changeHash, timeline, timelineHouse, timelineSenate }
  } catch (err) {
    console.error('LegiScan getBill error:', err)
    return null
  }
}

/**
 * Fetch bill status for display. Uses legiscan_link or state+name.
 * Implements caching with change_hash to minimize API queries.
 * @param {object} bill - { legiscan_link?, state, name, bill_id? }
 * @returns {Promise<{ status: string, lastAction?: string, statusDate?: string }|'error'|null>}
 */
export async function fetchBillStatus(bill) {
  if (!bill) return null
  
  let state = bill.state
  let billNumber = (bill.name || '').replace(/\s/g, '')
  const fromUrl = parseLegiscanUrl(bill.legiscan_link)
  if (fromUrl) {
    state = fromUrl.state
    billNumber = fromUrl.billNumber
  }
  if (!state || !billNumber) return null
  
  // Create cache key
  const cacheKey = `${state}_${billNumber}`.toLowerCase()
  
  // Check cache first
  const cached = getCachedBillStatus(cacheKey)
  if (cached) {
    return cached.data
  }
  
  try {
    // Search for bill
    const searchResult = await searchBill(state, billNumber)
    if (!searchResult) return null
    
    const { billId, changeHash: searchHash } = searchResult
    
    // Get bill details (pass cached hash if available)
    const cachedHash = cached?.hash
    const billData = await getBill(billId, cachedHash)
    
    // If billData is null but we had a cached hash, it means hash matched (data unchanged)
    // Return cached data
    if (!billData && cachedHash) {
      return cached.data
    }
    
    if (!billData) return null
    
    // Extract change_hash for caching (use from getBill if available, else from search)
    const changeHash = billData.changeHash || searchHash
    
    // Cache the result
    const { changeHash: _, ...dataToCache } = billData
    cacheBillStatus(cacheKey, dataToCache, changeHash)
    
    return dataToCache
  } catch (err) {
    console.error('LegiScan fetchBillStatus error:', err)
    return 'error'
  }
}

/**
 * Normalize LegiScan `texts` (array or keyed object) for UI links.
 */
function normalizeBillTexts(texts) {
  if (!texts) return []
  const list = Array.isArray(texts) ? texts : Object.values(texts)
  return list
    .filter(Boolean)
    .map((t) => ({
      date: t.date || null,
      type: t.type_name || t.type || 'Bill text',
      mime: t.mime || null,
      url: t.state_link || t.url || null,
      docId: t.doc_id ?? null,
    }))
    .filter((t) => t.url || t.docId)
}

/**
 * Best-effort contact fields from LegiScan sponsor / person payload (often empty on bill sponsors).
 */
function sponsorContactFromLegiscan(p) {
  if (!p || typeof p !== 'object') return { email: '', phone: '', webmailUrl: '' }
  // LegiScan `getBill` sponsors often include contact info nested under `bio.social`.
  const bioSocial = p?.bio?.social || {}

  const emailRaw =
    p.email ||
    p.contact_email ||
    p.office_email ||
    p.work_email ||
    p.public_email ||
    bioSocial.email ||
    ''
  const phoneRaw =
    p.phone ||
    p.phone_number ||
    p.office_phone ||
    p.capitol_phone ||
    p.contact_phone ||
    bioSocial.capitol_phone ||
    bioSocial.district_phone ||
    bioSocial.phone ||
    ''
  const webmailRaw =
    p.webmail ||
    p.web_mail ||
    p.webmail_url ||
    p.web_mail_url ||
    p.contact_url ||
    p.contact_form_url ||
    p.contact_form ||
    bioSocial.webmail ||
    bioSocial.website ||
    ''
  const email = String(emailRaw).trim()
  const phone = String(phoneRaw).replace(/\s+/g, ' ').trim()
  const webmailUrl = String(webmailRaw).trim()
  return { email, phone, webmailUrl }
}

function sponsorPersonIdFromLegiscan(p) {
  if (!p || typeof p !== 'object') return null
  return (
    p.people_id ??
    p.person_id ??
    p.legiscan_people_id ??
    p.legiscanPersonId ??
    p.peopleId ??
    p.personId ??
    p.legislator_id ??
    p.legislatorId ??
    null
  )
}

/**
 * Flatten sponsors object/array from getBill payload.
 */
function normalizeBillSponsors(sponsors) {
  if (!sponsors) return []
  const list = Array.isArray(sponsors) ? sponsors : Object.values(sponsors)
  const out = []
  for (const p of list) {
    if (!p || typeof p !== 'object') continue
    const name =
      [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ').trim() ||
      p.name ||
      p.committee_name ||
      ''
    if (name) {
      const { email, phone, webmailUrl } = sponsorContactFromLegiscan(p)
      const peopleId = sponsorPersonIdFromLegiscan(p)
      out.push({
        name,
        party: p.party || p.party_name || '',
        role: p.role || p.role_name || p.sponsor_type || '',
        email,
        phone,
        webmailUrl,
        peopleId,
      })
    }
  }
  return out
}

function extractContactFromLegiscanPerson(person) {
  const p = person || {}
  const email =
    p.email ||
    p.contact_email ||
    p.office_email ||
    p.work_email ||
    p.public_email ||
    ''
  const phone =
    p.phone ||
    p.phone_number ||
    p.office_phone ||
    p.capitol_phone ||
    p.contact_phone ||
    ''
  const webmailUrl =
    p.webmail ||
    p.web_mail ||
    p.webmail_url ||
    p.web_mail_url ||
    p.contact_url ||
    p.contact_form_url ||
    p.contact_form ||
    ''
  return {
    email: String(email || '').trim(),
    phone: String(phone || '').replace(/\s+/g, ' ').trim(),
    webmailUrl: String(webmailUrl || '').trim(),
  }
}

async function fetchLegiscanPersonContact(peopleId) {
  if (!peopleId) {
    return { ok: false, contact: { email: '', phone: '', webmailUrl: '' }, error: 'missing_people_id' }
  }
  const cacheKey = String(peopleId)
  const cached = getCachedLegiscanPersonContact(cacheKey)
  if (cached) return { ok: Boolean(cached?.email || cached?.phone), contact: cached, error: null }

  // Avoid browser CORS noise: use Edge proxy first.
  try {
    const edgeRes = await fetchLegiscanPersonContactViaEdge(peopleId)
    if (edgeRes?.ok && (edgeRes.contact?.email || edgeRes.contact?.phone || edgeRes.contact?.webmailUrl)) {
      cacheLegiscanPersonContact(cacheKey, edgeRes.contact)
      return edgeRes
    }
    // If edge isn't configured (missing session/secret/deploy), fall back to direct API (may CORS).
    if (edgeRes?.error && edgeRes.error !== 'missing_session') {
      // keep going to browser attempt
    } else if (edgeRes?.error === 'missing_session') {
      // keep going to browser attempt
    } else {
      // edge returned ok:false but no explicit error; keep going
    }
  } catch (edgeErr) {
    console.error('fetchLegiscanPersonContact edge error:', edgeErr)
  }

  try {
    const data = await callLegiscanApi('getPerson', { people_id: String(peopleId) })
    if (data?.status !== 'OK' && data?.status !== undefined) {
      if (data?.status !== 'OK') throw new Error(`getPerson failed: ${data?.status}`)
    }
    const person = data?.person || data?.data?.person || data?.people || data?.person_data || data
    const contact = extractContactFromLegiscanPerson(person)
    cacheLegiscanPersonContact(cacheKey, contact)
    return { ok: Boolean(contact.email || contact.phone || contact.webmailUrl), contact, error: null }
  } catch (err) {
    console.error('fetchLegiscanPersonContact browser error:', err)
    return {
      ok: false,
      contact: { email: '', phone: '', webmailUrl: '' },
      error: err?.message || 'getPerson_failed',
    }
  }
}

function rawBillStatusLabel(bill) {
  const statusObj = bill?.status
  if (typeof statusObj === 'string') return statusObj
  if (statusObj?.status_desc) return statusObj.status_desc
  if (bill?.status_str) return bill.status_str
  if (typeof statusObj === 'number') {
    return legiscanStatusLabel(statusObj) || `Status ${statusObj}`
  }
  return ''
}

/**
 * Map full getBill `bill` object for dashboard Research (Legislature) tab.
 */
function mapLegiscanBillForResearch(bill) {
  if (!bill) return null
  const history = Array.isArray(bill.history) ? bill.history : []
  const last = history.length > 0 ? history[history.length - 1] : null
  const lastAction = last
    ? last.action || last.title || last.description || last.action_desc
    : null

  const stateLabel =
    typeof bill.state === 'string' && bill.state.length === 2
      ? bill.state.toUpperCase()
      : bill.state_name || bill.state_abbr || String(bill.state_id || '')

  return {
    legiscanBillId: bill.bill_id,
    state: stateLabel,
    billNumber: bill.bill_number || '',
    title: bill.title || '',
    description: bill.description || '',
    sessionName:
      bill.session?.session_name ||
      (bill.session?.year_start && bill.session?.year_end
        ? `${bill.session.year_start}–${bill.session.year_end}`
        : '') ||
      '',
    chamber: bill.chamber || bill.chamber_name || '',
    status: rawBillStatusLabel(bill),
    statusDate: bill.status_date || null,
    lastAction,
    url: bill.url || null,
    sponsors: normalizeBillSponsors(bill.sponsors),
    /** Newest actions first, capped */
    history: [...history].reverse().slice(0, 40),
    texts: normalizeBillTexts(bill.texts),
  }
}

/**
 * Research tab: search by state + bill number, return rich bill payload (full getBill, no hash short-circuit).
 * @returns {Promise<{ ok: true, detail: object } | { ok: false, code: string, message: string }>}
 */
/**
 * Fetch full bill document via getBillText (base64 body). Caller should revoke object URLs when done.
 * @param {number|string} docId - LegiScan document id from bill.texts[].doc_id
 * @returns {Promise<{ ok: true, objectUrl: string, mime: string } | { ok: false, message: string }>}
 */
export async function fetchLegiscanBillTextDoc(docId) {
  if (docId == null || docId === '') {
    return { ok: false, message: 'Missing document id.' }
  }
  try {
    const data = await callLegiscanApi('getBillText', { id: String(docId) })
    if (data?.status !== 'OK' || !data?.text) {
      return {
        ok: false,
        message: data?.alert?.message || data?.status || 'LegiScan did not return bill text.',
      }
    }
    const t = data.text
    const mime = (t.mime || 'application/octet-stream').toLowerCase()
    const b64 = t.doc || t.document
    if (!b64 || typeof b64 !== 'string') {
      return { ok: false, message: 'No document body in response.' }
    }
    const clean = b64.replace(/\s/g, '')
    let binary
    try {
      binary = atob(clean)
    } catch {
      return { ok: false, message: 'Invalid base64 in bill text response.' }
    }
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blobType = mime.includes('pdf')
      ? 'application/pdf'
      : mime.includes('html')
        ? 'text/html'
        : mime.includes('rtf')
          ? 'application/rtf'
          : mime
    const blob = new Blob([bytes], { type: blobType })
    const objectUrl = URL.createObjectURL(blob)
    return { ok: true, objectUrl, mime: blobType }
  } catch (err) {
    console.error('fetchLegiscanBillTextDoc:', err)
    return { ok: false, message: err.message || 'Failed to fetch bill text.' }
  }
}

/**
 * Stable key for persisting sponsor rows (name|party|role, normalized).
 * @param {{ name?: string, party?: string, role?: string }} sponsor
 */
export function legiscanSponsorStorageKey(sponsor) {
  if (!sponsor || typeof sponsor !== 'object') return ''
  const name = String(sponsor.name || '').trim()
  const party = String(sponsor.party || '').trim()
  const role = String(sponsor.role || '').trim()
  return [name, party, role].join('|').toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Outreach: load sponsors from LegiScan using `legiscan_link` or state + compact bill name.
 * @param {{ legiscan_link?: string, state?: string, name?: string }} bill
 * @returns {Promise<{ ok: true, sponsors: object[], detail: object } | { ok: false, code?: string, message: string }>}
 */
export async function fetchLegiscanSponsorsForSpanBill(bill) {
  if (!bill) {
    return { ok: false, code: 'input', message: 'No bill.' }
  }
  let state = bill.state
  let billNumber = (bill.name || '').replace(/\s/g, '')
  const fromUrl = parseLegiscanUrl(bill.legiscan_link)
  if (fromUrl) {
    state = fromUrl.state
    billNumber = fromUrl.billNumber
  }
  if (!state || !billNumber) {
    return {
      ok: false,
      code: 'input',
      message: 'Add a LegiScan link or ensure state and bill number are set.',
    }
  }
  const result = await fetchLegiscanBillBySearch(state, billNumber)
  if (!result.ok) return result
  const sponsors = result.detail.sponsors || []

  // Best-effort: if LegiScan bill sponsor payload lacks email/phone, try getPerson().
  const candidates = sponsors
    .filter((s) => !(s.email || s.phone) && s.peopleId)
    .slice(0, 20)

  const meta = {
    sponsorCount: sponsors.length,
    peopleIdCount: sponsors.filter((s) => s.peopleId).length,
    personLookupAttempted: 0,
    personLookupPopulated: 0,
    personLookupFailed: 0,
  }

  if (candidates.length > 0) {
    for (const s of candidates) {
      meta.personLookupAttempted++
      const res = await fetchLegiscanPersonContact(s.peopleId)
      if (!res?.ok) {
        meta.personLookupFailed++
        continue
      }
      if (res.contact?.email || res.contact?.phone) meta.personLookupPopulated++
      if (res.contact?.email) s.email = res.contact.email
      if (res.contact?.phone) s.phone = res.contact.phone
    }
  }

  return { ok: true, sponsors, detail: result.detail, meta }
}

export async function fetchLegiscanBillBySearch(state, billNumber) {
  const num = (billNumber || '').replace(/\s/g, '')
  if (!state || !num) {
    return { ok: false, code: 'input', message: 'Choose a state and enter a bill number (e.g. HB970).' }
  }
  try {
    const searchResult = await searchBill(state, num)
    if (!searchResult?.billId) {
      return {
        ok: false,
        code: 'not_found',
        message: 'No matching bill in LegiScan for that state and number.',
      }
    }
    const data = await callLegiscanApi('getBill', { id: String(searchResult.billId) })
    if (data?.status !== 'OK' || !data?.bill) {
      return {
        ok: false,
        code: 'api',
        message: data?.alert?.message || 'LegiScan could not return this bill.',
      }
    }
    const detail = mapLegiscanBillForResearch(data.bill)
    if (!detail) {
      return { ok: false, code: 'api', message: 'Could not parse bill data.' }
    }
    return { ok: true, detail }
  } catch (err) {
    console.error('fetchLegiscanBillBySearch:', err)
    if (err.message && err.message.includes('VITE_LEGISCAN_API_KEY')) {
      return {
        ok: false,
        code: 'config',
        message: 'LegiScan API key is not set (add VITE_LEGISCAN_API_KEY). If the browser blocks the API, use a server proxy.',
      }
    }
    return {
      ok: false,
      code: 'network',
      message: err.message || 'Network error talking to LegiScan.',
    }
  }
}

function extractSearchRows(searchresult) {
  if (!searchresult) return []
  if (Array.isArray(searchresult.bills)) return searchresult.bills.filter(Boolean)
  return Object.entries(searchresult)
    .filter(([k, v]) => /^\d+$/.test(k) && v && typeof v === 'object')
    .map(([, v]) => v)
}

function mapSearchRow(row) {
  if (!row || !row.bill_id) return null
  const state =
    typeof row.state === 'string' && row.state.length === 2
      ? row.state.toUpperCase()
      : row.state_abbr || row.state_name || ''
  return {
    billId: row.bill_id,
    state,
    billNumber: row.bill_number || row.number || '',
    title: row.title || '',
    status: row.status || row.status_desc || row.status_name || '',
    statusDate: row.status_date || null,
    url: row.url || null,
    changeHash: row.change_hash || null,
  }
}

function splitUnifiedLegiscanQuery(input) {
  const raw = String(input || '').trim()
  if (!raw) return { state: null, bill: '', keywords: '' }
  const parts = raw.split(/\s+/).filter(Boolean)
  let state = null
  if (parts.length > 0) {
    const maybeState = normalizeStateCode(parts[0])
    if (maybeState && maybeState.length === 2) {
      state = maybeState
      parts.shift()
    }
  }
  const text = parts.join(' ').trim()
  const compact = text.replace(/\s+/g, '')
  const billLike = /^[A-Za-z]{1,6}[-.]?\d[A-Za-z0-9-]*$/.test(compact)
  return {
    state,
    bill: billLike ? compact : '',
    keywords: billLike ? '' : text,
  }
}

/**
 * Legislature tab: separate state, bill number, and keyword fields.
 * @param {{ state?: string, billNumber?: string, keywords?: string }} filters
 */
export async function fetchLegiscanBillsByFilters(filters = {}) {
  const stateRaw = String(filters.state || '').trim()
  const bill = String(filters.billNumber || '').replace(/\s/g, '')
  const query = String(filters.keywords || '').trim()

  if (!stateRaw && !bill && !query) {
    return {
      ok: false,
      code: 'input',
      message: 'Enter a state, bill number, and/or keywords.',
    }
  }

  if (bill && !stateRaw) {
    return {
      ok: false,
      code: 'input',
      message: 'Select a state when searching by bill number.',
    }
  }

  let stateCode = null
  if (stateRaw) {
    stateCode = normalizeStateCode(stateRaw)
    if (!stateCode || stateCode.length !== 2) {
      return {
        ok: false,
        code: 'input',
        message: 'Invalid state — use a two-letter code (e.g. GA) or full state name.',
      }
    }
  }

  const params = {}
  if (stateCode) params.state = stateCode
  if (bill) params.bill = bill
  if (query) params.query = query
  if (stateCode && !bill && !query) params.query = '*'

  try {
    const data = await callLegiscanApi('getSearch', params)
    if (data?.status !== 'OK') {
      return {
        ok: false,
        code: 'api',
        message: data?.alert?.message || 'LegiScan search failed.',
      }
    }
    const rows = extractSearchRows(data.searchresult)
    const results = rows.map(mapSearchRow).filter(Boolean)
    if (results.length === 0) {
      return { ok: false, code: 'not_found', message: 'No matching bills found.' }
    }
    return { ok: true, results: results.slice(0, 50) }
  } catch (err) {
    console.error('fetchLegiscanBillsByFilters:', err)
    if (err.message && err.message.includes('VITE_LEGISCAN_API_KEY')) {
      return {
        ok: false,
        code: 'config',
        message: 'LegiScan API key is not set (add VITE_LEGISCAN_API_KEY).',
      }
    }
    return {
      ok: false,
      code: 'network',
      message: err.message || 'Network error talking to LegiScan.',
    }
  }
}

/**
 * Unified research search for Legislature tab.
 * Supports:
 * - "GA HB970" (state + bill)
 * - "GA abortion access" (state + keywords)
 * - "GA" (state only; broad list)
 * - "education funding" (keywords across states)
 */
export async function fetchLegiscanBillsByQuery(queryText) {
  const q = splitUnifiedLegiscanQuery(queryText)
  if (!q.state && !q.bill && !q.keywords) {
    return {
      ok: false,
      code: 'input',
      message: 'Enter a state, bill number, keywords, or a combination.',
    }
  }

  const params = {}
  if (q.state) params.state = q.state
  if (q.bill) params.bill = q.bill
  if (q.keywords) params.query = q.keywords
  if (q.state && !q.bill && !q.keywords) params.query = '*'

  try {
    const data = await callLegiscanApi('getSearch', params)
    if (data?.status !== 'OK') {
      return {
        ok: false,
        code: 'api',
        message: data?.alert?.message || 'LegiScan search failed.',
      }
    }
    const rows = extractSearchRows(data.searchresult)
    const results = rows.map(mapSearchRow).filter(Boolean)
    if (results.length === 0) {
      return { ok: false, code: 'not_found', message: 'No matching bills found.' }
    }
    return { ok: true, results: results.slice(0, 50), parsed: q }
  } catch (err) {
    console.error('fetchLegiscanBillsByQuery:', err)
    if (err.message && err.message.includes('VITE_LEGISCAN_API_KEY')) {
      return {
        ok: false,
        code: 'config',
        message: 'LegiScan API key is not set (add VITE_LEGISCAN_API_KEY).',
      }
    }
    return {
      ok: false,
      code: 'network',
      message: err.message || 'Network error talking to LegiScan.',
    }
  }
}

export async function fetchLegiscanBillDetailById(billId) {
  if (!billId) return { ok: false, code: 'input', message: 'Missing bill id.' }
  try {
    const data = await callLegiscanApi('getBill', { id: String(billId) })
    if (data?.status !== 'OK' || !data?.bill) {
      return {
        ok: false,
        code: 'api',
        message: data?.alert?.message || 'LegiScan could not return this bill.',
      }
    }
    const detail = mapLegiscanBillForResearch(data.bill)
    if (!detail) return { ok: false, code: 'api', message: 'Could not parse bill data.' }
    return { ok: true, detail }
  } catch (err) {
    console.error('fetchLegiscanBillDetailById:', err)
    return {
      ok: false,
      code: 'network',
      message: err.message || 'Network error talking to LegiScan.',
    }
  }
}
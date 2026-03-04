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

const LEGISCAN_API_BASE = 'https://api.legiscan.com/'
const CACHE_PREFIX = 'legiscan_bill_'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

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
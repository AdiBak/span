/**
 * Display names for members: legal (first [middle] last) vs public site (preferred when set).
 * SPAN email stays first.last in the app; these helpers do not build email addresses.
 */

export function memberLegalName(m) {
  const f = String(m?.first_name ?? '').trim()
  const mid = String(m?.middle_name ?? '').trim()
  const l = String(m?.last_name ?? '').trim()
  return [f, mid, l].filter(Boolean).join(' ').trim()
}

/** Trimmed preferred name, or empty string if unset. */
export function memberPreferredNameRaw(m) {
  return String(m?.preferred_name ?? '').trim()
}

/**
 * Name shown on the public site (directory, team cards, blog byline when resolved).
 * Uses preferred_name when non-empty; otherwise first [middle] last.
 */
export function memberSiteDisplayName(m) {
  const pref = memberPreferredNameRaw(m)
  if (pref) return pref
  return memberLegalName(m)
}

/**
 * Strings to index for Medium byline → member matching (normalized by caller).
 */
export function memberNameLookupKeys(m) {
  const keys = new Set()
  const f = String(m?.first_name ?? '').trim()
  const mid = String(m?.middle_name ?? '').trim()
  const l = String(m?.last_name ?? '').trim()
  const pref = memberPreferredNameRaw(m)
  const legal = [f, mid, l].filter(Boolean).join(' ').trim()
  const legalNoMid = [f, l].filter(Boolean).join(' ').trim()
  const site = memberSiteDisplayName(m)
  if (legal) keys.add(legal)
  if (legalNoMid) keys.add(legalNoMid)
  if (f) keys.add(f)
  if (l) keys.add(l)
  if (pref) keys.add(pref)
  if (site) keys.add(site)
  return [...keys]
}

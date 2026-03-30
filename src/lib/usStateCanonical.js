/**
 * Map US postal codes → canonical full state names (for bills.state grouping & storage).
 */
export const US_STATE_CODE_TO_NAME = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  US: 'United States',
}

/**
 * Normalize free-text or 2-letter state to a single display/storage label so
 * "CA", "ca", and "California" all become "California".
 * Unknown / custom regions: returns trimmed input.
 */
export function canonicalUSStateName(raw) {
  if (raw == null) return ''
  const t = String(raw).trim()
  if (!t) return ''
  const upper = t.toUpperCase()
  if (US_STATE_CODE_TO_NAME[upper]) return US_STATE_CODE_TO_NAME[upper]
  const lower = t.toLowerCase()
  for (const name of Object.values(US_STATE_CODE_TO_NAME)) {
    if (name.toLowerCase() === lower) return name
  }
  return t
}

/** Key for grouping bills by state in the dashboard (never empty string). */
export function billStateGroupKey(raw) {
  const c = canonicalUSStateName(raw)
  return c || 'Unknown'
}

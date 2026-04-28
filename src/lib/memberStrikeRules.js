/** Strike limits: leadership = members with all four exec permission flags (same as "executive director" checks in the app). */

export const STRIKE_LIMIT_REGULAR = 3
export const STRIKE_LIMIT_LEADERSHIP = 2

export function isLeadershipMember(m) {
  if (!m) return false
  return (
    (m.volunteer === true || m.volunteer === 'true') &&
    (m.applications === true || m.applications === 'true') &&
    (m.bills === true || m.bills === 'true') &&
    (m.registration === true || m.registration === 'true')
  )
}

export function strikeLimitForMember(m) {
  return isLeadershipMember(m) ? STRIKE_LIMIT_LEADERSHIP : STRIKE_LIMIT_REGULAR
}

export function isAtStrikeLimit(memberRow, strikeCount) {
  return strikeCount >= strikeLimitForMember(memberRow)
}

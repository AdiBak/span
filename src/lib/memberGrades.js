/** School grade options (aligned with the public application form). */
export const MEMBER_GRADE_OPTIONS = [
  'HS Freshman',
  'HS Sophomore',
  'HS Junior',
  'HS Senior',
  'Collegiate/Graduate',
]

/** Standard HS grades advanced each school year (May 31); Collegiate/Graduate unchanged. */
export const MEMBER_GRADE_ADVANCE_MAP = {
  'HS Freshman': 'HS Sophomore',
  'HS Sophomore': 'HS Junior',
  'HS Junior': 'HS Senior',
  'HS Senior': 'Collegiate/Graduate',
}

/** @returns {string | null} Next standard grade, or null if not auto-advanced (unknown / collegiate). */
export function advanceMemberGrade(grade) {
  const g = String(grade || '').trim()
  if (!g) return null
  return MEMBER_GRADE_ADVANCE_MAP[g] ?? null
}

export const MEMBER_GRADE_FILTER_OPTIONS = [
  { value: 'all', label: 'All grades' },
  { value: 'unknown', label: 'Unknown' },
  ...MEMBER_GRADE_OPTIONS.map((g) => ({ value: g, label: g })),
  { value: 'other', label: 'Other (custom)' },
]

export function isStandardMemberGrade(grade) {
  const g = String(grade || '').trim()
  return g && MEMBER_GRADE_OPTIONS.includes(g)
}

/** Resolve select + optional "Other" text into the stored grade string. */
export function resolveMemberGrade(grade, gradeOther) {
  if (grade === 'Other') {
    return String(gradeOther || '').trim() || null
  }
  const g = String(grade || '').trim()
  return g || null
}

/** Split stored grade back into form select + Other text. */
export function splitMemberGradeForForm(storedGrade) {
  const g = String(storedGrade || '').trim()
  if (!g) return { grade: '', gradeOther: '' }
  if (MEMBER_GRADE_OPTIONS.includes(g)) return { grade: g, gradeOther: '' }
  return { grade: 'Other', gradeOther: g }
}

export function matchesMemberGradeFilter(memberGrade, filter) {
  if (!filter || filter === 'all') return true
  const g = String(memberGrade || '').trim()
  if (filter === 'unknown') return !g
  if (filter === 'other') return g && !MEMBER_GRADE_OPTIONS.includes(g)
  return g === filter
}

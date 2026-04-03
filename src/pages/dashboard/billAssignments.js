import { canonicalUSStateName } from '../../lib/usStateCanonical'
import { BILL_ASSIGNMENT_STATUS_LABELS, BILL_FORM_POSITION_VALUES } from './constants'

export function billAssignmentStatusLabel(status) {
  return BILL_ASSIGNMENT_STATUS_LABELS[status] || (status || '')
}

export function billAssignmentStatusBadgeClass(status) {
  switch (status) {
    case 'available':
      return 'bg-info text-dark'
    case 'not_started':
      return 'bg-secondary'
    case 'in_progress':
      return 'bg-primary'
    case 'completed':
      return 'bg-info text-dark'
    case 'in_review':
      return 'bg-warning text-dark'
    case 'approved':
      return 'bg-success'
    default:
      return 'bg-secondary'
  }
}

/** Member IDs from nested merge / Supabase join `bill_assignment_assignees`. */
export function billAssignmentAssigneeIds(assignment) {
  const rows = assignment?.bill_assignment_assignees
  if (!Array.isArray(rows)) return []
  return rows.map((r) => r.member_id).filter(Boolean)
}

export function normalizeBillFormPosition(value) {
  const v = typeof value === 'string' ? value.trim() : ''
  return BILL_FORM_POSITION_VALUES.includes(v) ? v : 'Support'
}

/** Assign work modal: dropdown option text — state · bill # · topic (description). */
export function assignTaskPrefillBillOptionLabel(bill) {
  const st = canonicalUSStateName(bill.state) || String(bill.state || '').trim() || '?'
  const num = String(bill.name || '').trim() || '(no number)'
  const desc = String(bill.description || '').trim().replace(/\s+/g, ' ')
  const topic = desc.length > 72 ? `${desc.slice(0, 69)}…` : desc
  return topic ? `${st} · ${num} — ${topic}` : `${st} · ${num}`
}

export function assignmentPrefillStatesMatch(savedState, billState) {
  const a = String(savedState || '').trim()
  const b = String(billState || '').trim()
  if (!a || !b) return false
  const ca = canonicalUSStateName(a) || a
  const cb = canonicalUSStateName(b) || b
  return ca === cb || a.toLowerCase() === b.toLowerCase()
}

/** If exactly one bill matches saved prefill fields, return its id for the dropdown. */
export function billIdMatchingAssignmentPrefill(allBills, prefillState, prefillBillName) {
  const nameTrim = String(prefillBillName || '').trim()
  if (!nameTrim || !allBills?.length) return ''
  const matches = allBills.filter(
    (b) =>
      String(b.name || '').trim() === nameTrim && assignmentPrefillStatesMatch(prefillState, b.state)
  )
  return matches.length === 1 ? String(matches[0].bill_id) : ''
}

/**
 * Accordion / list heading: "State BillNumber: topic" when bill prefill has state and/or bill #;
 * otherwise the task topic alone. SPAN position stays in the expanded body only.
 */
export function billAssignmentDisplayTitle(a) {
  const topic = String(a?.title || '').trim()
  const st = String(a?.prefill_state || '').trim()
  const bn = String(a?.prefill_bill_name || '').trim()
  const prefixParts = []
  if (st) prefixParts.push(st)
  if (bn) prefixParts.push(bn)
  const prefix = prefixParts.join(' ')
  if (!prefix) return topic || 'Untitled task'
  if (!topic) return prefix
  return `${prefix}: ${topic}`
}

/** Allowed resignation workflow statuses (no terminal "completed" — use honorable_letter_sent / withdrawn). */

export const RESIGN_STATUS_LABEL = {
  requested: 'Requested',
  meeting_scheduled: 'Meeting scheduled',
  met: 'Meeting held',
  honorable_letter_sent: 'Honorable letter sent',
  withdrawn: 'Withdrawn',
}

/** Labels for legacy DB rows only (must not appear in selects) */
export const LEGACY_RESIGN_STATUS_LABEL = {
  ...RESIGN_STATUS_LABEL,
  directors_contacted: 'Directors notified (legacy)',
  completed: 'Completed (legacy)',
}

/** [filterKey, button label, btn class] — no completed */
export const RESIGN_FILTER_CONFIG = [
  ['all', 'All', 'btn-secondary'],
  ['requested', 'Requested', 'btn-warning'],
  ['meeting_scheduled', 'Scheduled', 'btn-primary'],
  ['met', 'Met', 'btn-success'],
  ['honorable_letter_sent', 'Letter sent', 'btn-success'],
  ['withdrawn', 'Withdrawn', 'btn-secondary'],
]

export function resignStatusBadgeClass(status) {
  switch (status) {
    case 'requested':
      return 'bg-warning text-dark'
    case 'meeting_scheduled':
      return 'bg-primary'
    case 'met':
      return 'bg-success'
    case 'honorable_letter_sent':
      return 'bg-info text-dark'
    case 'withdrawn':
      return 'bg-dark'
    case 'completed':
      return 'bg-secondary'
    case 'directors_contacted':
      return 'bg-info text-dark'
    default:
      return 'bg-secondary'
  }
}

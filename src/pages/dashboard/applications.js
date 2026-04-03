import { APPLICATION_PIPELINE_ORDER, APPLICATION_STATUS_LABELS } from './constants'

export function applicationStatusLabel(status) {
  return (
    APPLICATION_STATUS_LABELS[status] ||
    (status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : '')
  )
}

export function applicationStatusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'bg-warning text-dark'
    case 'invited':
      return 'bg-info'
    case 'met_with':
      return 'bg-primary'
    case 'onboard':
      return 'bg-secondary'
    case 'accepted':
      return 'bg-success'
    case 'rejected':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

export function isApplicationPipelineStatus(status) {
  return ['pending', 'invited', 'met_with', 'onboard'].includes(status)
}

export function applicationPipelineRank(status) {
  const i = APPLICATION_PIPELINE_ORDER.indexOf(status)
  return i >= 0 ? i : -1
}

/**
 * Whether an exec may move an application from `fromStatus` to `toStatus`.
 * Pipeline moves must strictly advance (skipping stages is OK). Reject only from pipeline stages.
 * Reset to `pending` is handled separately (accepted/rejected only).
 */
export function isAllowedApplicationStatusTransition(fromStatus, toStatus) {
  if (toStatus === 'rejected') {
    return APPLICATION_PIPELINE_ORDER.includes(fromStatus)
  }
  if (toStatus === 'accepted') {
    return applicationPipelineRank(fromStatus) >= 0
  }
  const fromR = applicationPipelineRank(fromStatus)
  const toR = applicationPipelineRank(toStatus)
  if (fromR < 0 || toR < 0) return false
  return toR > fromR
}

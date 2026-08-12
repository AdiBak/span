/** Shared dashboard constants (applications, bill assignments, bill form). */

import {
  MEMBERS_IMAGES_BASE_URL,
  PARTNERS_IMAGES_BASE_URL,
  SCHOOLS_IMAGES_BASE_URL,
  ADVISORS_IMAGES_BASE_URL,
  APPLICATIONS_RESUMES_BASE_URL,
} from '../../lib/supabasePublicUrls'

export const IMAGE_BASE_URL = MEMBERS_IMAGES_BASE_URL
export {
  PARTNERS_IMAGES_BASE_URL,
  SCHOOLS_IMAGES_BASE_URL,
  ADVISORS_IMAGES_BASE_URL,
  APPLICATIONS_RESUMES_BASE_URL,
}

/** Application pipeline status labels (DB values: pending, invited, met_with, onboard, accepted, rejected) */
export const APPLICATION_STATUS_LABELS = {
  pending: 'Pending',
  invited: 'Invited',
  met_with: 'Met with',
  onboard: 'Onboard',
  accepted: 'Accepted',
  rejected: 'Rejected',
}

/** Forward-only pipeline before terminal accepted/rejected (no going back to earlier stages). */
export const APPLICATION_PIPELINE_ORDER = ['pending', 'invited', 'met_with', 'onboard']

export const BILL_ASSIGNMENT_STATUS_LABELS = {
  available: 'Open',
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  in_review: 'In review',
  approved: 'Approved',
}

export const BILL_FORM_POSITION_VALUES = ['Support', 'Oppose', 'Support If Amended', 'Propose']

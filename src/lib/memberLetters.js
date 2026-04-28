function formatJoinDate(startDate) {
  if (!startDate) return 'your time with SPAN'
  try {
    return new Date(startDate).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(startDate)
  }
}

/**
 * Honorable resignation / exit letter (after meeting). volunteerHoursDisplay e.g. "42.5" or "12h 30m" from caller.
 */
export function buildHonorableResignationLetter({
  fullName,
  joinDate,
  volunteerHoursDisplay,
  billsImpactedCount,
  meetingDateNote = '',
}) {
  const join = formatJoinDate(joinDate)
  const hours = volunteerHoursDisplay || 'recorded volunteer time'
  const bills =
    typeof billsImpactedCount === 'number'
      ? billsImpactedCount
      : parseInt(String(billsImpactedCount || 0), 10) || 0
  const billsSentence =
    bills > 0
      ? ` In our records, your work connects to ${bills} bill${bills === 1 ? '' : 's'} we tracked (submissions and linked outcomes).`
      : ''
  const meeting = meetingDateNote
    ? `\n\nWe appreciated the opportunity to meet with you (${meetingDateNote}) before your departure and wish you the very best.\n`
    : '\n'

  return `Dear ${fullName},

On behalf of SPAN (Students for Patient Advocacy Nationwide), thank you for the work you invested in our mission.

You joined SPAN on ${join}. During your time with us, you contributed approximately ${hours} of volunteer service.${billsSentence}${meeting}

Your contributions are appreciated, and we are grateful you chose to work with our team and our partners. We hope you remain connected to civic engagement and take pride in what you accomplished with SPAN.

With appreciation,

SPAN Leadership
`
}

export function buildDishonorableRemovalLetter({ fullName, removalDateNote = '' }) {
  const when = removalDateNote || new Date().toLocaleDateString()
  return `Dear ${fullName},

This letter is to confirm that your role with SPAN (Students for Patient Advocacy Nationwide) has ended, effective ${when}.

Over time, concerns regarding your participation were addressed through our internal processes. After review, leadership has determined that continuing your membership with SPAN is not in the best interest of the organization or our community at this time.

Going forward, you should not represent yourself as an active SPAN member or speak on behalf of the organization. We ask that you treat this matter professionally and refrain from misuse of SPAN materials or access.

Work you contributed while a member may remain credited where it already appears on our platforms; removal of organizational access does not erase prior contributions already published.

If you have questions about practical matters only (for example, returning materials), you may reply to this message briefly and professionally.

Sincerely,

SPAN Leadership
`
}

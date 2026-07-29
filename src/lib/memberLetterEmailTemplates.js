/** HTML emails for honorable exit & removal notice (exec-sent). Matches volunteer-verification branding. */

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ORG_FULL = 'Students for Patient Advocacy Nationwide'

function spanEmailShell(innerHtml) {
  const year = new Date().getFullYear()
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 28px;">
    <h1 style="color: #16213e; font-size: 24px; margin: 0;">SPAN</h1>
    <p style="color: #6c757d; font-size: 14px; margin: 4px 0 0;">${ORG_FULL}</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; padding: 28px;">
    ${innerHtml}
  </div>
  <div style="text-align: center; margin-top: 22px;">
    <p style="font-size: 12px; color: #adb5bd;">&copy; ${year} ${ORG_FULL}</p>
  </div>
</div>`
}

/**
 * Honorable exit / thank-you email to the member.
 * @param {'member_initiated'|'exec_initiated'} variant — member filed resignation vs leadership-initiated honorable close
 */
export function buildHonorableExitEmailHtml({
  firstName,
  variant,
  joinDateFormatted,
  workSectionHtml,
  meetingLineHtml,
  willAttachVolunteerPdf = false,
}) {
  const fn = escapeHtml(firstName || 'there')
  const intro =
    variant === 'member_initiated'
      ? `Following your resignation request and our recent conversation with you, we wanted to thank you formally for your time with SPAN and recognize what you contributed.`
      : `As your time with SPAN comes to a close, leadership asked that we send this note to thank you formally for your contributions to our mission.`

  const joinLine = joinDateFormatted
    ? `<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 16px;">You joined SPAN on <strong>${escapeHtml(joinDateFormatted)}</strong>.</p>`
    : ''

  const attachmentLine = willAttachVolunteerPdf
    ? `<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 16px 0 0;"><strong>Attachment:</strong> Please find your official volunteer hours verification letter (PDF), summarizing approved entries—the same format we use for school or scholarship documentation.</p>`
    : ''

  const inner = `
<p style="font-size: 16px; color: #212529; margin: 0 0 16px;">Dear ${fn},</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 16px;">${intro}</p>
${joinLine}
${workSectionHtml || ''}
${meetingLineHtml || ''}
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 16px 0 0;">
  Your contributions mattered to us and to the communities we serve. We hope you stay engaged in advocacy and take pride in what you accomplished with SPAN.
</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 16px 0 0;">
  With appreciation,<br/>
  <strong>SPAN Leadership</strong>
</p>
${attachmentLine}
`
  const subject =
    variant === 'member_initiated'
      ? 'Thank you from SPAN — recognizing your contributions'
      : 'Thank you for your contributions to SPAN'

  return {
    subject,
    html: spanEmailShell(inner),
  }
}

/**
 * Builds the “work / impact” block for honorable emails (documented stats + optional exec narrative).
 * Attachment note is added separately at the end of the email (after appreciation).
 */
export function composeHonorableWorkSectionHtml({ stats, manualWorkNotes }) {
  const blocks = []
  const vol = stats?.volunteerHoursDecimal ?? 0
  const bills = stats?.billsImpactedCount ?? 0
  const disp = stats?.volunteerHoursDisplay || ''

  const hasDocHours = vol > 0
  const hasDocBills = bills > 0

  if (hasDocHours || hasDocBills) {
    let sentence = ''
    if (hasDocHours && hasDocBills) {
      sentence = `Our records reflect approximately <strong>${escapeHtml(disp)}</strong> of approved volunteer service, and your efforts connect to <strong>${bills}</strong> bill${bills === 1 ? '' : 's'} we tracked (submissions and linked outcomes).`
    } else if (hasDocHours) {
      sentence = `Our records reflect approximately <strong>${escapeHtml(disp)}</strong> of approved volunteer service.`
    } else {
      sentence = `Our records reflect work connected to <strong>${bills}</strong> bill${bills === 1 ? '' : 's'} we tracked (submissions and linked outcomes).`
    }
    blocks.push(
      `<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px;">${sentence}</p>`
    )
  }

  if (manualWorkNotes && String(manualWorkNotes).trim()) {
    blocks.push(
      `<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px; white-space: pre-wrap;">${escapeHtml(String(manualWorkNotes).trim()).replace(/\n/g, '<br/>')}</p>`
    )
  }

  return blocks.join('')
}

export function buildMeetingLineHtml(meetingNote) {
  const t = String(meetingNote || '').trim()
  if (!t) return ''
  return `<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px;">We appreciated the chance to meet with you before your departure (${escapeHtml(t)}).</p>`
}

/** Dishonorable / membership ended notice */
export function buildDishonorableRemovalEmailHtml({ firstName, effectiveDateDisplay }) {
  const fn = escapeHtml(firstName || 'there')
  const when = escapeHtml(effectiveDateDisplay || new Date().toLocaleDateString())

  const inner = `
<p style="font-size: 16px; color: #212529; margin: 0 0 16px;">Dear ${fn},</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px;">
  This message is to confirm that your role with SPAN (${ORG_FULL}) has ended, effective <strong>${when}</strong>.
</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px;">
  Concerns about participation were reviewed through our internal processes. Leadership has concluded that continuing your membership with SPAN is not in the best interest of the organization at this time.
</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px;">
  Please do not represent yourself as an active SPAN member or speak on behalf of the organization. Prior work that already appears on our platforms may remain credited; this notice does not remove historical attribution where it already exists.
</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 0 0 14px;">
  For brief, practical questions only, you may reply to this email professionally.
</p>
<p style="font-size: 15px; color: #212529; line-height: 1.6; margin: 16px 0 0;">
  Sincerely,<br/>
  <strong>SPAN Leadership</strong>
</p>
`
  return {
    subject: 'Important update regarding your SPAN membership',
    html: spanEmailShell(inner),
  }
}

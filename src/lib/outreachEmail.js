import { SUPABASE_PUBLIC_OBJECT_BASE_URL } from './supabasePublicUrls'

const PROPOSALS_BASE = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/proposals`

/**
 * Public proposal PDF URL for a bill (same path convention as Bills page uploads).
 * @param {{ state?: string, name?: string }} bill
 * @returns {string | null}
 */
export function getProposalPdfPublicUrl(bill) {
  if (!bill?.state || !bill?.name) return null
  const sanitizedName = String(bill.name).replace(/[^a-zA-Z0-9]/g, '_')
  const sanitizedState = String(bill.state).replace(/[^a-zA-Z0-9]/g, '_')
  if (!sanitizedName || !sanitizedState) return null
  return `${PROPOSALS_BASE}/${sanitizedState}/${sanitizedName}.pdf`
}

/**
 * @param {string | undefined} displayName
 */
export function legislatorFirstName(displayName) {
  const s = String(displayName || '').trim()
  if (!s) return 'there'
  const first = s.split(/\s+/)[0]
  return first.replace(/,$/, '') || 'there'
}

/**
 * @param {string | undefined} position Bill position from DB
 */
export function spanPositionSentence(position) {
  const p = String(position || 'Support').trim()
  switch (p) {
    case 'Support':
      return 'SPAN supports this bill.'
    case 'Oppose':
      return 'SPAN opposes this bill.'
    case 'Support If Amended':
      return 'SPAN supports this bill if amended.'
    case 'Propose':
      return 'SPAN is reaching out to share our perspective on this policy area and related legislation.'
    default:
      return `SPAN records its position as: ${p}.`
  }
}

/**
 * @param {{ state?: string, name?: string, position?: string, description?: string }} bill
 * @param {{ display_name?: string }} target
 * @param {{ first_name?: string, last_name?: string, email?: string, role?: string } | null} sender
 */
export function buildOutreachDraft(bill, target, sender) {
  const state = String(bill?.state || '').trim() || '—'
  const billName = String(bill?.name || '').trim() || '—'
  const topic = billName
  const first = legislatorFirstName(target?.display_name)
  const senderName = sender
    ? `${String(sender.first_name || '').trim()} ${String(sender.last_name || '').trim()}`.trim() || 'SPAN'
    : 'SPAN'
  const senderEmail = String(sender?.email || '').trim()
  const senderRole = String(sender?.role || '').trim()
  const positionLine = spanPositionSentence(bill?.position)
  const pdfUrl = getProposalPdfPublicUrl(bill)
  const pdfLine = pdfUrl
    ? `Proposal PDF (public link): ${pdfUrl}`
    : '(If a proposal PDF is on file, link it here or attach from the Bills page.)'

  const subject = `SPAN perspective on ${state} ${billName}`

  const orgLine = senderRole
    ? `${senderRole}, Students for Patient Advocacy Nationwide (SPAN)`
    : 'Students for Patient Advocacy Nationwide (SPAN)'

  const body = `Hello ${first},

I hope you're doing well. My name is ${senderName}, and I'm with Students for Patient Advocacy Nationwide (SPAN). I'm reaching out regarding ${state} ${billName} (${topic}).

${positionLine}

We've prepared materials that outline our perspective and key considerations for how best to move this legislation forward in a way that improves outcomes for patients and communities.

${pdfLine}

If helpful, we'd be glad to discuss further and share any additional input that would support next steps.

Thank you for your time and leadership.

Best,
${senderName}
${orgLine}${senderEmail ? `\n${senderEmail}` : ''}`

  return { subject, body }
}

/**
 * Escape HTML for preview / Resend HTML bodies.
 * @param {string} s
 */
export function escapeHtmlOutreach(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const LOGO_IMG_SRC = 'https://spanationwide.org/images/index/logo-wide-dark.png'

/**
 * Wrap plain-text email body as HTML with SPAN letterhead (matches onboarding style loosely).
 * @param {string} plain
 */
export function outreachBodyPlainToHtml(plain) {
  const escaped = escapeHtmlOutreach(plain)
  const paragraphs = escaped.split(/\n\n+/).map((block) => {
    const withBreaks = block.replace(/\n/g, '<br/>')
    return `<p style="font-size:15px;color:#212529;line-height:1.65;margin:0 0 1rem 0;">${withBreaks}</p>`
  })
  const inner = paragraphs.join('')

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:28px 20px 40px;color:#212529;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td valign="top" style="padding:0 12px 0 0;">
        <img src="${LOGO_IMG_SRC}" alt="SPAN — Students for Patient Advocacy Nationwide" width="240" style="display:block;max-width:240px;width:100%;height:auto;border:0;" />
      </td>
      <td valign="top" align="right" style="font-size:12px;color:#6c757d;line-height:1.5;">
        1702 Clifton Road Suite 1650<br/>
        Atlanta, GA 30322<br/>
        <a href="https://www.spanationwide.org" style="color:#0b6ef9;text-decoration:underline;">www.spanationwide.org</a>
      </td>
    </tr>
  </table>
  <div style="border-top:1px solid #dee2e6;margin-bottom:24px;"></div>
  <div style="background:#ffffff;">${inner}</div>
  <div style="text-align:center;margin-top:28px;">
    <p style="font-size:12px;color:#adb5bd;">&copy; ${new Date().getFullYear()} Students for Patient Advocacy Nationwide</p>
  </div>
</div>`
}

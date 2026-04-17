import { SUPABASE_PUBLIC_OBJECT_BASE_URL } from './supabasePublicUrls'
import { canonicalUSStateName } from './usStateCanonical'

const PROPOSALS_BASE = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/proposals`

/**
 * Best-effort guess (no network): first candidate path. Prefer {@link resolveProposalPdfPublicUrl}.
 * @param {{ state?: string, name?: string }} bill
 * @returns {string | null}
 */
export function getProposalPdfPublicUrl(bill) {
  const c = getProposalPdfUrlCandidates(bill)
  return c.length ? c[0] : null
}

/**
 * Ordered URL candidates for `proposals/{state}/{name}.pdf` (upload naming has varied over time).
 * Matches the spirit of BillsPage / Dashboard `checkBillPdfExists` (sanitized + URL-encoded originals + variants).
 * @param {{ state?: string, name?: string }} bill
 * @returns {string[]}
 */
export function getProposalPdfUrlCandidates(bill) {
  if (!bill?.state || !bill?.name) return []
  const name = String(bill.name).trim()
  const rawState = String(bill.state).trim()
  const canon = canonicalUSStateName(rawState)
  const stateVariants = [...new Set([rawState, canon].filter(Boolean))]

  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
  /** e.g. "SB 60" → "SB60" for uploads that dropped spaces */
  const compactSanitized = name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_')
  /** spaces only → underscores, keeps periods etc. (then encoded in path segment) */
  const spacesToUnderscore = name.replace(/\s+/g, '_')

  const urls = []
  const add = (u) => {
    if (u && !urls.includes(u)) urls.push(u)
  }

  for (const s of stateVariants) {
    const sanitizedState = s.replace(/[^a-zA-Z0-9]/g, '_')
    add(`${PROPOSALS_BASE}/${sanitizedState}/${sanitizedName}.pdf`)
    add(`${PROPOSALS_BASE}/${encodeURIComponent(s)}/${encodeURIComponent(name)}.pdf`)
    add(`${PROPOSALS_BASE}/${encodeURIComponent(s)}/${encodeURIComponent(spacesToUnderscore)}.pdf`)
    if (compactSanitized && compactSanitized !== sanitizedName) {
      add(`${PROPOSALS_BASE}/${sanitizedState}/${compactSanitized}.pdf`)
    }
  }

  return urls
}

/**
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function publicProposalPdfExists(url) {
  try {
    let r = await fetch(url, { method: 'HEAD', mode: 'cors' })
    if (r.ok) return true
    if (r.status === 405 || r.status === 501) {
      r = await fetch(url, { method: 'GET', mode: 'cors', headers: { Range: 'bytes=0-0' } })
      return r.ok
    }
  } catch {
    /* network / CORS */
  }
  return false
}

/**
 * Resolves the real public PDF URL by probing candidates (same bucket paths as the rest of the app).
 * @param {{ state?: string, name?: string }} bill
 * @returns {Promise<string | null>}
 */
export async function resolveProposalPdfPublicUrl(bill) {
  for (const url of getProposalPdfUrlCandidates(bill)) {
    if (await publicProposalPdfExists(url)) return url
  }
  return null
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
 * Best-effort last name for salutations ("Last, First" or final token).
 * @param {string | undefined} displayName
 */
export function legislatorLastName(displayName) {
  const s = String(displayName || '').trim()
  if (!s) return ''
  if (/^.+,\s*\S/.test(s)) {
    return s.split(',')[0].trim()
  }
  const parts = s.split(/\s+/).filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

/**
 * Map LegiScan / Open States role strings to a chamber title, or null if unclear.
 * @param {string | null | undefined} sponsorRole
 * @returns {'Senator' | 'Representative' | null}
 */
export function chamberTitleFromSponsorRole(sponsorRole) {
  const r = String(sponsorRole || '').toLowerCase()
  if (!r) return null
  const t = r.trim()
  if (t === 'sen' || t === 'sen.') return 'Senator'
  if (t === 'rep' || t === 'rep.') return 'Representative'
  if (/\b(senator|senate)\b/.test(r)) return 'Senator'
  if (/\b(rep\.?|represent|representative|assembly|delegate|house)\b/.test(r)) return 'Representative'
  return null
}

/**
 * Greeting line: "Senator Smith" / "Representative Jones" when chamber is known (LegiScan role or stored greeting title).
 * Otherwise first name; last resort full display name.
 * @param {string | undefined} displayName
 * @param {string | null | undefined} sponsorRole
 * @param {{ greetingTitle?: string | null }} [opts] — from `bill_outreach_targets.greeting_title` (Open States imports)
 */
export function legislatorFormalSalutation(displayName, sponsorRole, opts = {}) {
  const last = legislatorLastName(displayName)
  let title = chamberTitleFromSponsorRole(sponsorRole)
  const gt = String(opts.greetingTitle || '')
    .trim()
    .toLowerCase()
  if (!title && (gt === 'senator' || gt === 'representative')) {
    title = gt === 'senator' ? 'Senator' : 'Representative'
  }
  if (title && last) return `${title} ${last}`
  const first = legislatorFirstName(displayName)
  if (first && first !== 'there') return first
  const full = String(displayName || '').trim()
  if (full) return full
  return 'there'
}

/**
 * Google search for public contact info when LegiScan / imports have no email or webmail.
 * @param {string | undefined} displayName
 * @param {string | undefined} stateLabel
 */
export function legislatorContactSearchUrl(displayName, stateLabel) {
  const q = `${String(displayName || '').trim()} ${String(stateLabel || '').trim()} contact`
    .replace(/\s+/g, ' ')
    .trim()
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
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

/** SPAN office (for legislator web forms that ask for mailing address). */
export const SPAN_OFFICE_ADDRESS = '1702 Clifton Road Suite 1650, Atlanta, GA 30322'

/**
 * Submitter display name from the logged-in member row.
 * @param {{ first_name?: string, last_name?: string } | null | undefined} sender
 */
export function submitterDisplayName(sender) {
  const n = `${String(sender?.first_name || '').trim()} ${String(sender?.last_name || '').trim()}`.trim()
  return n || 'SPAN'
}

/**
 * Prefer member email; else first.last@spanationwide.org when first/last are present.
 * @param {{ first_name?: string, last_name?: string, email?: string } | null | undefined} sender
 */
export function submitterSpanEmail(sender) {
  const direct = String(sender?.email || '').trim()
  if (direct) return direct
  const f = String(sender?.first_name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  const l = String(sender?.last_name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  if (f && l) return `${f}.${l}@spanationwide.org`
  return ''
}

/**
 * @param {string | number | null | undefined} phone
 */
export function formatMemberPhoneDisplay(phone) {
  const raw = String(phone ?? '').replace(/\D/g, '')
  if (raw.length === 10) {
    return `(${raw.slice(0, 3)}) ${raw.slice(3, 6)}-${raw.slice(6)}`
  }
  if (raw.length === 11 && raw.startsWith('1')) {
    return `(${raw.slice(1, 4)}) ${raw.slice(4, 7)}-${raw.slice(7)}`
  }
  return String(phone ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Plain text to paste into legislator web forms (name, SPAN email, phone, office address).
 * @param {{ first_name?: string, last_name?: string, email?: string, phone?: string } | null | undefined} member
 */
export function buildWebformContactPasteText(member) {
  const name = submitterDisplayName(member)
  const email = submitterSpanEmail(member)
  const phone = formatMemberPhoneDisplay(member?.phone)
  const lines = [
    `Name: ${name}`,
    email
      ? `Email: ${email}`
      : 'Email: (add your @spanationwide.org email in your member profile)',
    phone
      ? `Phone: ${phone}`
      : 'Phone: (add your phone in your member profile)',
    `Mailing address: ${SPAN_OFFICE_ADDRESS}`,
  ]
  return lines.join('\n')
}

/**
 * @param {{ state?: string, name?: string, position?: string, description?: string }} bill
 * @param {{ display_name?: string, sponsor_role?: string | null, greeting_title?: string | null }} target
 * @param {{ first_name?: string, last_name?: string, email?: string, role?: string } | null} sender
 * @param {{ pdfUrl?: string | null, pdfDelivery?: 'attach' | 'link' }} [opts] — pass {@link resolveProposalPdfPublicUrl} result for a verified link;
 *   use `pdfDelivery: 'link'` for legislator web forms (paste URL); `'attach'` for mail / Resend with attachment.
 */
export function buildOutreachDraft(bill, target, sender, opts = {}) {
  const state = String(bill?.state || '').trim() || '—'
  const billName = String(bill?.name || '').trim() || '—'
  const legislatorName = legislatorFormalSalutation(target?.display_name, target?.sponsor_role, {
    greetingTitle: target?.greeting_title,
  })
  const submitterName = submitterDisplayName(sender)
  const senderRole = String(sender?.role || '').trim() || 'Executive Director'
  const senderEmail = submitterSpanEmail(sender)
  const positionLine = spanPositionSentence(bill?.position)
  const pdfUrl =
    opts && Object.prototype.hasOwnProperty.call(opts, 'pdfUrl') ? opts.pdfUrl : getProposalPdfPublicUrl(bill)
  const pdfDelivery = opts.pdfDelivery === 'link' ? 'link' : 'attach'
  let pdfLine
  if (pdfUrl) {
    pdfLine =
      pdfDelivery === 'link'
        ? /* single \n so \n\n paragraph splits elsewhere don’t break this into two blocks */
          `Please find our proposal PDF at this link:\n${pdfUrl}`
        : 'Please find our proposal PDF attached.'
  } else {
    pdfLine =
      pdfDelivery === 'link'
        ? '(If a proposal PDF is on file, paste the public link here.)'
        : '(If a proposal PDF is on file, link it here or attach from the Bills page.)'
  }

  const subject = `Students for Patient Advocacy Nationwide - Perspective on ${state} ${billName}`

  const roleOrgLine = `${senderRole} | Students for Patient Advocacy Nationwide (SPAN)`

  const body = `Hello ${legislatorName},

I hope you're doing well. My name is ${submitterName}, and I'm with Students for Patient Advocacy Nationwide (SPAN). I'm reaching out regarding ${state} ${billName}.

${positionLine}

We've prepared materials that outline our perspective and key considerations for how best to move this legislation forward in a way that improves outcomes for patients and communities.

${pdfLine}

We'd be more than willing to discuss further and share any additional input that would support next steps.

Thank you for your time and leadership.

Best,
${submitterName}
${roleOrgLine}${senderEmail ? `\n${senderEmail}` : ''}`

  return { subject, body }
}

/**
 * If the draft still has the default link-style PDF block, replace it with attach wording for Resend sends.
 * @param {string} plain
 * @param {string} pdfUrl
 */
export function outreachPlainWhenAttachingViaEmail(plain, pdfUrl) {
  const u = String(pdfUrl || '').trim()
  if (!u) return plain
  const p = String(plain || '')
  const blockSingle = `Please find our proposal PDF at this link:\n${u}`
  const blockDouble = `Please find our proposal PDF at this link:\n\n${u}`
  if (p.includes(blockDouble)) {
    return p.replace(blockDouble, 'Please find our proposal PDF attached.')
  }
  if (p.includes(blockSingle)) {
    return p.replace(blockSingle, 'Please find our proposal PDF attached.')
  }
  return p
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

/** @param {string} s */
function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

const LINK_STYLE = 'color:#0b6ef9;text-decoration:underline;'

/**
 * Older drafts used \n\n between "at this link:" and the URL, which split into two paragraphs and
 * broke HTML “at this link” anchor handling. Collapse to one newline before paragraph splitting.
 * @param {string} plain
 */
function normalizeProposalPdfLineBreaksForHtml(plain) {
  return String(plain || '').replace(
    /(Please find our proposal PDF at this link:)\s*\n\n+(https?:\/\/\S+)/gi,
    (_, lead, url) => `${lead}\n${url}`
  )
}

/** Turn http(s) URLs in a plain block into hyperlinks; escape everything else. */
function outreachPlainBlockToHtmlWithLinks(blockPlain) {
  const s = String(blockPlain)
  const re = /\b(https?:\/\/[^\s<>"']+)/gi
  let out = ''
  let lastIndex = 0
  let m
  while ((m = re.exec(s)) !== null) {
    out += escapeHtmlOutreach(s.slice(lastIndex, m.index))
    const url = m[0]
    out += `<a href="${escapeHtmlAttr(url)}" style="${LINK_STYLE}word-break:break-all;">${escapeHtmlOutreach(url)}</a>`
    lastIndex = m.index + url.length
  }
  out += escapeHtmlOutreach(s.slice(lastIndex))
  return out.replace(/\n/g, '<br/>')
}

const LOGO_IMG_SRC = 'https://spanationwide.org/images/index/logo-wide-dark.png'

/**
 * Wrap plain-text email body as HTML with SPAN letterhead (matches onboarding style loosely).
 * http(s) URLs become clickable links (full URL visible — matches what users paste into web forms as plain text).
 * @param {string} plain
 */
export function outreachBodyPlainToHtml(plain) {
  const paragraphs = normalizeProposalPdfLineBreaksForHtml(plain)
    .split(/\n\n+/)
    .map((block) => {
      const inner = outreachPlainBlockToHtmlWithLinks(block)
      return `<p style="font-size:15px;color:#212529;line-height:1.65;margin:0 0 1rem 0;">${inner}</p>`
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

import { resolveProposalPdfPublicUrl } from './outreachEmail'
import { supabaseInvokeHeaders } from '../pages/dashboard/supabaseInvoke'

const MIN_WORDS = 5
const MAX_EXTRACT_CHARS = 50_000

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Server fallback — Fakespot via check-ai-text edge function (exec auth + CPU inference).
 * @param {string} text
 * @param {string} accessToken
 */
export async function invokeCheckAiText(text, accessToken) {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    throw new Error('No text to analyze.')
  }

  const base = import.meta.env.VITE_SUPABASE_URL
  const resp = await fetch(`${base}/functions/v1/check-ai-text`, {
    method: 'POST',
    headers: supabaseInvokeHeaders(accessToken),
    body: JSON.stringify({ text: trimmed }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : data.details || 'AI check failed')
  }
  return data
}

/**
 * ScreenComply (TMR ensemble) via check-ai-text edge function, then local TMR if unavailable.
 * @param {string} text
 * @param {string} accessToken
 */
export async function runAiTextCheck(text, accessToken) {
  const trimmed = (text || '').trim()
  if (!trimmed) {
    throw new Error('No text to analyze.')
  }

  const words = wordCount(trimmed)
  if (words < MIN_WORDS) {
    throw new Error(
      `Text is too short for AI detection (${words} words; need at least ${MIN_WORDS}).`,
    )
  }

  try {
    return await invokeCheckAiText(trimmed, accessToken)
  } catch (serverErr) {
    console.warn('Server AI check failed, trying local TMR:', serverErr)
    const { detectAiTextLocally } = await import('./localAiTextDetector')
    return detectAiTextLocally(trimmed)
  }
}

/**
 * Extract PDF text and run AI check.
 * @param {string} pdfUrl
 * @param {string} accessToken
 */
export async function checkAiFromPdfUrl(pdfUrl, accessToken) {
  let text
  try {
    const { extractFullPdfText } = await import('./pdfExtractText')
    text = await extractFullPdfText(pdfUrl)
  } catch {
    throw new Error('Could not read PDF. The file may be unavailable or blocked by CORS.')
  }

  const trimmed = (text || '').trim()
  if (!trimmed) {
    throw new Error('PDF has no extractable text (likely a scanned/image-only document).')
  }

  const words = wordCount(trimmed)
  if (words < MIN_WORDS) {
    throw new Error(
      `Extracted text is too short for AI detection (${words} words; need at least ${MIN_WORDS}).`,
    )
  }

  const payload =
    trimmed.length > MAX_EXTRACT_CHARS ? trimmed.slice(0, MAX_EXTRACT_CHARS) : trimmed
  return runAiTextCheck(payload, accessToken)
}

/**
 * Resolve bill proposal PDF in storage and run AI check.
 * @param {object} bill
 * @param {string} accessToken
 * @param {(bill: object) => string | null | undefined} [getPdfUrl]
 */
export async function checkAiFromBill(bill, accessToken, getPdfUrl) {
  let url = bill?.proposal_pdf_url || bill?.pdfUrl || (getPdfUrl ? getPdfUrl(bill) : null)
  if (!url) {
    url = await resolveProposalPdfPublicUrl(bill)
  }
  if (!url) {
    throw new Error('No proposal PDF found in storage.')
  }
  return checkAiFromPdfUrl(url, accessToken)
}

/**
 * @param {object} assignment
 * @returns {string | null}
 */
export function assignmentDeliverablePdfUrl(assignment) {
  const url = String(assignment?.deliverable_pdf_url || '').trim()
  return url || null
}

/**
 * Run AI check on assignment deliverable PDF URL (direct PDF link required).
 * @param {object} assignment
 * @param {string} accessToken
 */
export async function checkAiFromAssignment(assignment, accessToken) {
  const url = assignmentDeliverablePdfUrl(assignment)
  if (!url) {
    throw new Error(
      'No PDF URL on this assignment. Add a direct PDF link (e.g. Supabase storage); Google Doc-only is not supported yet.',
    )
  }
  return checkAiFromPdfUrl(url, accessToken)
}

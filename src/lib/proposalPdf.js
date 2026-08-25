/**
 * Proposal PDF URLs for the public `proposals` Storage bucket.
 * Prefer persisted `bills.proposal_pdf_url` — avoid mass HEAD/GET probes (cached egress).
 */
import { SUPABASE_PUBLIC_OBJECT_BASE_URL } from './supabasePublicUrls'
import { canonicalUSStateName } from './usStateCanonical'

export const PROPOSALS_PUBLIC_BASE = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/proposals`

/**
 * Canonical upload path + public URL (sanitized state/name — current upload convention).
 * @param {string} state
 * @param {string} name
 * @returns {{ storagePath: string, publicUrl: string } | null}
 */
export function buildCanonicalProposalPdf(state, name) {
  const st = String(state || '').trim()
  const nm = String(name || '').trim()
  if (!st || !nm) return null
  const sanitizedState = st.replace(/[^a-zA-Z0-9]/g, '_')
  const sanitizedName = nm.replace(/[^a-zA-Z0-9]/g, '_')
  const storagePath = `${sanitizedState}/${sanitizedName}.pdf`
  return {
    storagePath,
    publicUrl: `${PROPOSALS_PUBLIC_BASE}/${sanitizedState}/${sanitizedName}.pdf`,
  }
}

/**
 * Map DB field → UI helpers without network I/O.
 * @param {object} bill
 */
export function enrichBillWithStoredPdf(bill) {
  if (!bill) return bill
  const url = String(bill.proposal_pdf_url || bill.pdfUrl || '').trim()
  if (url) {
    return { ...bill, pdfExists: true, pdfUrl: url, proposal_pdf_url: url }
  }
  return { ...bill, pdfExists: false, pdfUrl: undefined }
}

/**
 * Ordered URL candidates for legacy uploads (no network).
 * @param {{ state?: string, name?: string, proposal_pdf_url?: string | null, pdfUrl?: string | null }} bill
 * @returns {string[]}
 */
export function getProposalPdfUrlCandidates(bill) {
  if (!bill) return []
  const stored = String(bill.proposal_pdf_url || bill.pdfUrl || '').trim()
  const urls = []
  const add = (u) => {
    if (u && !urls.includes(u)) urls.push(u)
  }
  if (stored) add(stored)

  if (!bill.state || !bill.name) return urls
  const name = String(bill.name).trim()
  const rawState = String(bill.state).trim()
  const canon = canonicalUSStateName(rawState)
  const stateVariants = [...new Set([rawState, canon].filter(Boolean))]
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
  const compactSanitized = name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_')
  const spacesToUnderscore = name.replace(/\s+/g, '_')

  for (const s of stateVariants) {
    const sanitizedState = s.replace(/[^a-zA-Z0-9]/g, '_')
    add(`${PROPOSALS_PUBLIC_BASE}/${sanitizedState}/${sanitizedName}.pdf`)
    add(`${PROPOSALS_PUBLIC_BASE}/${encodeURIComponent(s)}/${encodeURIComponent(name)}.pdf`)
    add(`${PROPOSALS_PUBLIC_BASE}/${encodeURIComponent(s)}/${encodeURIComponent(spacesToUnderscore)}.pdf`)
    if (compactSanitized && compactSanitized !== sanitizedName) {
      add(`${PROPOSALS_PUBLIC_BASE}/${sanitizedState}/${compactSanitized}.pdf`)
    }
  }
  return urls
}

/** @param {{ state?: string, name?: string, proposal_pdf_url?: string | null }} bill */
export function getProposalPdfPublicUrl(bill) {
  const c = getProposalPdfUrlCandidates(bill)
  return c.length ? c[0] : null
}

async function publicProposalPdfExists(url) {
  try {
    let r = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { Range: 'bytes=0-7' },
      cache: 'no-store',
    })
    if (!r.ok && r.status !== 206) {
      r = await fetch(url, { method: 'HEAD', mode: 'cors', cache: 'no-store' })
      return r.ok
    }
    const buf = new Uint8Array(await r.arrayBuffer())
    if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
      return true
    }
    if (buf.length >= 5 && String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) === '%PDF') {
      return true
    }
  } catch {
    /* network / CORS */
  }
  return false
}

/**
 * Prefer stored URL; only probe candidates when missing (outreach / one-off).
 * Optionally persist the result to stop future probes.
 * @param {{ state?: string, name?: string, bill_id?: number, proposal_pdf_url?: string | null, pdfUrl?: string | null }} bill
 * @param {{ supabase?: import('@supabase/supabase-js').SupabaseClient, persist?: boolean }} [opts]
 */
export async function resolveProposalPdfPublicUrl(bill, opts = {}) {
  const stored = String(bill?.proposal_pdf_url || bill?.pdfUrl || '').trim()
  if (stored) return stored

  for (const url of getProposalPdfUrlCandidates(bill)) {
    if (await publicProposalPdfExists(url)) {
      if (opts.persist && opts.supabase && bill?.bill_id) {
        try {
          await opts.supabase
            .from('bills')
            .update({ proposal_pdf_url: url })
            .eq('bill_id', bill.bill_id)
        } catch {
          /* non-fatal */
        }
      }
      return url
    }
  }
  return null
}

/**
 * One-time / rare backfill via Storage list API (not public CDN HEAD storms).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ updated: number, checked: number }>}
 */
export async function backfillProposalPdfUrlsFromStorage(supabase) {
  const { data: bills, error: billsErr } = await supabase
    .from('bills')
    .select('bill_id, state, name, proposal_pdf_url')
  if (billsErr) throw billsErr

  const need = (bills || []).filter((b) => !String(b.proposal_pdf_url || '').trim())
  if (!need.length) return { updated: 0, checked: 0 }

  const { data: top, error: listErr } = await supabase.storage.from('proposals').list('', {
    limit: 1000,
  })
  if (listErr) throw listErr

  /** @type {Set<string>} storage paths like `California/AB_682.pdf` */
  const pathSet = new Set()
  for (const entry of top || []) {
    if (entry.name?.toLowerCase().endsWith('.pdf')) {
      pathSet.add(entry.name)
      continue
    }
    if (!entry.name || entry.id) continue
    const { data: kids } = await supabase.storage.from('proposals').list(entry.name, { limit: 1000 })
    for (const f of kids || []) {
      if (!f.name?.toLowerCase().endsWith('.pdf')) continue
      pathSet.add(`${entry.name}/${f.name}`)
    }
  }

  let updated = 0
  for (const bill of need) {
    const built = buildCanonicalProposalPdf(bill.state, bill.name)
    let match = null
    if (built && pathSet.has(built.storagePath)) {
      match = built.publicUrl
    } else {
      for (const url of getProposalPdfUrlCandidates(bill)) {
        const path = url.replace(`${PROPOSALS_PUBLIC_BASE}/`, '').split('?')[0]
        const decoded = decodeURIComponent(path)
        if (pathSet.has(path) || pathSet.has(decoded)) {
          match = `${PROPOSALS_PUBLIC_BASE}/${pathSet.has(path) ? path : decoded}`
          break
        }
      }
    }
    if (!match) continue
    const { error } = await supabase
      .from('bills')
      .update({ proposal_pdf_url: match })
      .eq('bill_id', bill.bill_id)
    if (!error) updated += 1
  }

  return { updated, checked: need.length }
}

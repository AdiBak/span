/**
 * Proposal PDF URLs for the public `proposals` Storage bucket.
 * Prefer persisted `bills.proposal_pdf_url` — avoid mass HEAD/GET probes (cached egress).
 *
 * Public / crawlable links use same-origin:
 *   https://spanationwide.org/proposals/<state>/<file>.pdf
 * Cloudflare Worker proxies that path to Supabase Storage (see cloudflare/proposals-proxy/).
 */
import { SUPABASE_PUBLIC_OBJECT_BASE_URL } from './supabasePublicUrls'
import { canonicalUSStateName } from './usStateCanonical'

export const SITE_ORIGIN = 'https://spanationwide.org'
/** Same-origin base (proxied by Cloudflare Worker). */
export const PROPOSALS_SITE_BASE = `${SITE_ORIGIN}/proposals`
/** Direct Supabase storage base (upload / Worker origin / legacy rows). */
export const PROPOSALS_STORAGE_BASE = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/proposals`
/** @deprecated Use PROPOSALS_STORAGE_BASE or PROPOSALS_SITE_BASE */
export const PROPOSALS_PUBLIC_BASE = PROPOSALS_STORAGE_BASE

const SITE_PREFIX = `${PROPOSALS_SITE_BASE}/`
const STORAGE_PREFIX = `${PROPOSALS_STORAGE_BASE}/`

/**
 * Extract `State/File.pdf` from a storage URL, site URL, or relative /proposals/ path.
 * @param {string} urlOrPath
 * @returns {string | null}
 */
export function extractProposalStoragePath(urlOrPath) {
  const raw = String(urlOrPath || '').trim()
  if (!raw || raw.includes('..')) return null

  let path = raw
  if (path.startsWith(SITE_PREFIX)) path = path.slice(SITE_PREFIX.length)
  else if (path.startsWith(STORAGE_PREFIX)) path = path.slice(STORAGE_PREFIX.length)
  else if (path.startsWith('/proposals/')) path = path.slice('/proposals/'.length)
  else if (/^https?:\/\//i.test(path)) return null
  else return null

  path = path.split('?')[0].split('#')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep encoded */
  }
  path = path.replace(/^\/+/, '')
  if (!path || path.includes('..')) return null
  return path
}

/** Public link for browsers / crawlers (same-origin). */
export function toPublicProposalUrl(urlOrPath) {
  const path = extractProposalStoragePath(urlOrPath)
  if (path) return `${PROPOSALS_SITE_BASE}/${path.split('/').map(encodeURIComponent).join('/')}`
  const raw = String(urlOrPath || '').trim()
  return raw || null
}

/** Direct Supabase object URL (uploads, Worker fetch, email attach). */
export function toStorageProposalUrl(urlOrPath) {
  const path = extractProposalStoragePath(urlOrPath)
  if (path) return `${PROPOSALS_STORAGE_BASE}/${path.split('/').map(encodeURIComponent).join('/')}`
  const raw = String(urlOrPath || '').trim()
  return raw || null
}

/**
 * Canonical upload path + public URL (sanitized state/name — current upload convention).
 * @param {string} state
 * @param {string} name
 * @returns {{ storagePath: string, storageUrl: string, publicUrl: string } | null}
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
    storageUrl: `${PROPOSALS_STORAGE_BASE}/${sanitizedState}/${sanitizedName}.pdf`,
    publicUrl: `${PROPOSALS_SITE_BASE}/${sanitizedState}/${sanitizedName}.pdf`,
  }
}

/**
 * Map DB field → UI helpers without network I/O.
 * Rewrites legacy Supabase URLs to same-origin for display.
 * @param {object} bill
 */
export function enrichBillWithStoredPdf(bill) {
  if (!bill) return bill
  const raw = String(bill.proposal_pdf_url || bill.pdfUrl || '').trim()
  if (raw) {
    const publicUrl = toPublicProposalUrl(raw) || raw
    return { ...bill, pdfExists: true, pdfUrl: publicUrl, proposal_pdf_url: publicUrl }
  }
  return { ...bill, pdfExists: false, pdfUrl: undefined }
}

/**
 * Ordered URL candidates for legacy uploads (no network).
 * Prefers same-origin; includes storage URLs for existence probes before Worker is live.
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
  if (stored) {
    add(toPublicProposalUrl(stored))
    add(toStorageProposalUrl(stored))
  }

  if (!bill.state || !bill.name) return urls.filter(Boolean)
  const name = String(bill.name).trim()
  const rawState = String(bill.state).trim()
  const canon = canonicalUSStateName(rawState)
  const stateVariants = [...new Set([rawState, canon].filter(Boolean))]
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
  const compactSanitized = name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '_')
  const spacesToUnderscore = name.replace(/\s+/g, '_')

  for (const s of stateVariants) {
    const sanitizedState = s.replace(/[^a-zA-Z0-9]/g, '_')
    add(`${PROPOSALS_SITE_BASE}/${sanitizedState}/${sanitizedName}.pdf`)
    add(`${PROPOSALS_STORAGE_BASE}/${sanitizedState}/${sanitizedName}.pdf`)
    add(`${PROPOSALS_STORAGE_BASE}/${encodeURIComponent(s)}/${encodeURIComponent(name)}.pdf`)
    add(`${PROPOSALS_STORAGE_BASE}/${encodeURIComponent(s)}/${encodeURIComponent(spacesToUnderscore)}.pdf`)
    if (compactSanitized && compactSanitized !== sanitizedName) {
      add(`${PROPOSALS_SITE_BASE}/${sanitizedState}/${compactSanitized}.pdf`)
      add(`${PROPOSALS_STORAGE_BASE}/${sanitizedState}/${compactSanitized}.pdf`)
    }
  }
  return urls.filter(Boolean)
}

/** @param {{ state?: string, name?: string, proposal_pdf_url?: string | null }} bill */
export function getProposalPdfPublicUrl(bill) {
  const c = getProposalPdfUrlCandidates(bill)
  return c.length ? c[0] : null
}

async function publicProposalPdfExists(url) {
  try {
    // Probe storage URL when given same-origin (Worker may not be deployed in local/dev yet)
    const probe = toStorageProposalUrl(url) || url
    let r = await fetch(probe, {
      method: 'GET',
      mode: 'cors',
      headers: { Range: 'bytes=0-7' },
      cache: 'no-store',
    })
    if (!r.ok && r.status !== 206) {
      r = await fetch(probe, { method: 'HEAD', mode: 'cors', cache: 'no-store' })
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
  if (stored) return toPublicProposalUrl(stored) || stored

  for (const url of getProposalPdfUrlCandidates(bill)) {
    if (await publicProposalPdfExists(url)) {
      const publicUrl = toPublicProposalUrl(url) || url
      if (opts.persist && opts.supabase && bill?.bill_id) {
        try {
          await opts.supabase
            .from('bills')
            .update({ proposal_pdf_url: publicUrl })
            .eq('bill_id', bill.bill_id)
        } catch {
          /* non-fatal */
        }
      }
      return publicUrl
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
        const storage = toStorageProposalUrl(url) || url
        const path = storage.replace(`${PROPOSALS_STORAGE_BASE}/`, '').split('?')[0]
        let decoded = path
        try {
          decoded = decodeURIComponent(path)
        } catch {
          /* keep */
        }
        if (pathSet.has(path) || pathSet.has(decoded)) {
          const finalPath = pathSet.has(path) ? path : decoded
          match = `${PROPOSALS_SITE_BASE}/${finalPath}`
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

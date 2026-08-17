import { PDFDocument, PDFName, PDFRawStream, PDFArray, PDFRef, StandardFonts, rgb } from 'pdf-lib'
import { decodePDFRawStream } from 'pdf-lib/es/core/streams/decode.js'
import { pdfjs } from 'react-pdf'
import { getProposalPdfUrlCandidates, legislatorFormalSalutation } from './outreachEmail'

function uint8ToBase64(bytes) {
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** StandardFonts (WinAnsi) can't draw many Unicode glyphs — strip/replace safely. */
function winAnsiSafe(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?')
}

function ensurePdfJsWorker() {
  if (typeof window === 'undefined') return
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

/**
 * True if a line of PDF text looks like a letter greeting / committee address line.
 * @param {string} line
 */
export function looksLikeLetterGreeting(line) {
  const t = String(line || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t || t.length > 140) return false
  if (/^dear\b/i.test(t) || /^dear[A-Za-z]/i.test(t)) return true
  if (/^to\s+whom\s+it\s+may\s+concern/i.test(t)) return true
  if (/^to\s+the\b/i.test(t) && /(committee|members|chair|senate|house|assembly)/i.test(t)) return true
  if (/^(honorable|hon\.?)\s+members?\b/i.test(t)) return true
  if (/^members\s+of\s+the\b/i.test(t)) return true
  if (/^committee\s+members?\b/i.test(t)) return true
  return false
}

/**
 * Continuation of a multi-line salutation (e.g. "Long-Term Care," under "Dear … Committee on").
 * @param {string} line
 */
export function looksLikeGreetingContinuation(line) {
  const t = String(line || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!t || t.length > 100) return false
  // Body paragraphs usually start like this — stop absorbing.
  if (
    /^(i\s+|we\s+|my\s+name|on\s+behalf|thank\s+you|please\s+|as\s+you|students\s+for)/i.test(
      t
    )
  ) {
    return false
  }
  if (/^(sincerely|best|regards|respectfully)\b/i.test(t)) return false
  if (looksLikeLetterGreeting(t)) return true
  if (/,+\s*$/.test(t) && t.length <= 80) return true
  if (/\b(committee|long[\s-]?term\s+care|chair|chairs|members?|assembly|senate|house)\b/i.test(t)) {
    return t.length <= 90
  }
  return false
}

function lineBounds(line) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let fontSize = 11
  for (const it of line.items) {
    minX = Math.min(minX, it.x)
    maxX = Math.max(maxX, it.x + it.w)
    minY = Math.min(minY, it.y)
    maxY = Math.max(maxY, it.y + it.h)
    fontSize = Math.max(fontSize, it.fontSize)
  }
  return { minX, maxX, minY, maxY, fontSize }
}

/**
 * Find greeting line geometry on page 1 via pdf.js text positions (PDF user space).
 * Always copies input bytes — pdf.js may transfer/detach the ArrayBuffer it receives.
 * Includes following short committee / address continuation lines so leftovers like
 * "Long-Term Care," are wiped with the Dear line.
 * @param {ArrayBuffer|Uint8Array} pdfBytes
 * @returns {Promise<null | { x: number, y: number, width: number, height: number, fontSize: number, pageHeight: number, pageWidth: number, matchedText: string, wipeRects: { x: number, y: number, width: number, height: number }[] }>}
 */
async function findGreetingBoxOnFirstPage(pdfBytes) {
  ensurePdfJsWorker()
  // Copy: pdf.js worker can detach the underlying ArrayBuffer of the TypedArray we pass.
  const data = new Uint8Array(
    pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
  )
  const loadingTask = pdfjs.getDocument({ data, verbosity: 0 })
  const pdf = await loadingTask.promise
  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    /** @type {{ str: string, x: number, y: number, w: number, h: number, fontSize: number }[]} */
    const items = []
    for (const raw of tc.items) {
      if (!raw || typeof raw !== 'object' || !('str' in raw)) continue
      const str = String(raw.str || '')
      if (!str.trim()) continue
      const tr = raw.transform
      if (!Array.isArray(tr) || tr.length < 6) continue
      const x = Number(tr[4]) || 0
      const y = Number(tr[5]) || 0
      const fontSize = Math.max(Math.hypot(Number(tr[0]) || 0, Number(tr[1]) || 0), Math.abs(Number(tr[3]) || 0), 8)
      const w = typeof raw.width === 'number' && raw.width > 0 ? raw.width : fontSize * str.length * 0.5
      const h = typeof raw.height === 'number' && raw.height > 0 ? raw.height : fontSize
      items.push({ str, x, y, w, h, fontSize })
    }
    page.cleanup?.()

    // Group into lines by similar baseline y
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
    /** @type {{ y: number, items: typeof items, text: string }[]} */
    const lines = []
    for (const it of sorted) {
      const line = lines.find((L) => Math.abs(L.y - it.y) <= Math.max(2.5, it.fontSize * 0.35))
      if (line) {
        line.items.push(it)
        line.y = (line.y * (line.items.length - 1) + it.y) / line.items.length
      } else {
        lines.push({ y: it.y, items: [it], text: '' })
      }
    }
    for (const line of lines) {
      line.items.sort((a, b) => a.x - b.x)
      let text = ''
      for (let i = 0; i < line.items.length; i++) {
        const cur = line.items[i].str
        const prev = i > 0 ? line.items[i - 1] : null
        if (prev) {
          const gap = line.items[i].x - (prev.x + prev.w)
          if (gap > prev.fontSize * 0.12 && !/^\s/.test(cur) && !/\s$/.test(prev.str)) {
            text += ' '
          }
        }
        text += cur
      }
      line.text = text.replace(/\s+/g, ' ').trim()
    }

    // Top-to-bottom for reading order (higher y first in PDF space)
    const byReadingOrder = [...lines].sort((a, b) => b.y - a.y)
    const matchIdx = byReadingOrder.findIndex((L) => looksLikeLetterGreeting(L.text))
    if (matchIdx < 0 || !byReadingOrder[matchIdx].items.length) return null

    const block = [byReadingOrder[matchIdx]]
    for (let i = matchIdx + 1; i < byReadingOrder.length && block.length < 4; i++) {
      const next = byReadingOrder[i]
      const prev = block[block.length - 1]
      const gap = prev.y - next.y
      const maxGap = Math.max(prev.items[0]?.fontSize || 12, 12) * 1.85
      if (gap > maxGap) break
      if (!looksLikeGreetingContinuation(next.text)) break
      block.push(next)
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let fontSize = 11
    const wipeRects = []
    const pageLeft = Math.min(...block.flatMap((L) => L.items.map((it) => it.x)), 54)
    const fullWipeRight = Math.max(viewport.width - 54, pageLeft + 420)

    for (const line of block) {
      const b = lineBounds(line)
      minX = Math.min(minX, b.minX)
      maxX = Math.max(maxX, b.maxX)
      minY = Math.min(minY, b.minY)
      maxY = Math.max(maxY, b.maxY)
      fontSize = Math.max(fontSize, b.fontSize)
      const padY = Math.max(2, b.fontSize * 0.25)
      // Wipe nearly full content width so wrapped committee remnants disappear
      wipeRects.push({
        x: Math.max(0, Math.min(b.minX, pageLeft) - 4),
        y: Math.max(0, b.minY - padY),
        width: Math.max(b.maxX - b.minX + 8, fullWipeRight - Math.min(b.minX, pageLeft) + 4),
        height: Math.max(b.fontSize * 1.2, b.maxY - b.minY + padY * 2),
      })
    }

    const padX = 2
    const padY = Math.max(2, fontSize * 0.15)
    return {
      x: Math.max(0, minX - padX),
      y: Math.max(0, minY - padY),
      width: Math.max(40, maxX - minX + padX * 2),
      height: Math.max(fontSize * 0.9, maxY - minY + padY * 2),
      fontSize,
      pageHeight: viewport.height,
      pageWidth: viewport.width,
      matchedText: block.map((L) => L.text).join(' / '),
      wipeRects,
      drawX: block[0].items[0]?.x ?? minX,
      drawY: block[0].items[0]?.y ?? minY,
      /** Raw text runs to delete from the page content stream */
      itemStrings: block.flatMap((L) => L.items.map((it) => it.str).filter((s) => String(s || '').trim())),
    }
  } finally {
    pdf.destroy?.()
  }
}

function bytesToLatin1(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode(...u8.subarray(i, Math.min(i + chunk, u8.length)))
  }
  return s
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Escape for use inside a PDF literal string `(...)`. */
function escapePdfLiteralBody(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/**
 * Remove show-text operators that paint the given literal runs from a content stream string.
 * Prefer real deletion over white rectangles so leftover committee lines don't remain selectable.
 * @param {string} content
 * @param {string[]} needles
 * @returns {{ content: string, removed: number }}
 */
function scrubShowTextOperators(content, needles) {
  let out = content
  let removed = 0
  const unique = [...new Set(needles.map((n) => String(n || '')).filter((n) => n.trim().length > 0))]
  // Longer first so "Long-Term Care," wins over "Care"
  unique.sort((a, b) => b.length - a.length)

  for (const needle of unique) {
    const lit = escapePdfLiteralBody(needle)
    const litRe = escapeRegex(lit)
    // (text) Tj  /  (text) '  /  (text) "
    const patterns = [
      new RegExp(`\\(${litRe}\\)\\s*Tj`, 'g'),
      new RegExp(`\\(${litRe}\\)\\s*'`, 'g'),
      new RegExp(`\\(\\s*${litRe}\\s*\\)\\s*Tj`, 'g'),
    ]
    for (const re of patterns) {
      const next = out.replace(re, () => {
        removed += 1
        return ''
      })
      out = next
    }
    // Inside TJ arrays: replace the literal with empty string object
    const tjLit = new RegExp(`\\(${litRe}\\)`, 'g')
    out = out.replace(tjLit, () => {
      removed += 1
      return '()'
    })
  }
  return { content: out, removed }
}

/**
 * Delete greeting text runs from page 1 content streams (not a white-out).
 * @param {import('pdf-lib').PDFPage} page
 * @param {string[]} itemStrings
 * @returns {number} number of operator/literal removals
 */
function deleteTextRunsFromPage(page, itemStrings) {
  if (!itemStrings?.length) return 0
  const contents = page.node.Contents()
  if (!contents) return 0

  const context = page.doc.context
  /** @type {PDFRef[]} */
  const refs = []
  if (contents instanceof PDFRef) {
    refs.push(contents)
  } else if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const el = contents.get(i)
      if (el instanceof PDFRef) refs.push(el)
    }
  } else {
    return 0
  }

  let totalRemoved = 0
  for (const ref of refs) {
    const stream = context.lookup(ref)
    if (!(stream instanceof PDFRawStream)) continue
    let decoded
    try {
      decoded = decodePDFRawStream(stream).decode()
    } catch (e) {
      console.warn('[outreach] could not decode content stream', e)
      continue
    }
    const asString = bytesToLatin1(decoded)
    const { content: scrubbed, removed } = scrubShowTextOperators(asString, itemStrings)
    if (!removed || scrubbed === asString) continue
    totalRemoved += removed
    const newStream = context.flateStream(scrubbed)
    context.assign(ref, newStream)
  }
  return totalRemoved
}

function looksLikePdfMagic(bytes) {
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  )
}

/**
 * Download proposal PDF bytes from a public URL (or try sibling candidates).
 * @param {string} proposalPdfUrl
 * @param {{ state?: string, name?: string } | null} bill
 * @returns {Promise<{ ok: true, bytes: Uint8Array, url: string } | { ok: false, message: string }>}
 */
async function downloadProposalPdfBytes(proposalPdfUrl, bill) {
  const candidates = [
    proposalPdfUrl,
    ...(bill ? getProposalPdfUrlCandidates(bill) : []),
  ].filter((u, i, arr) => u && arr.indexOf(u) === i)

  let lastErr = 'Could not download the proposal PDF to personalize.'
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { method: 'GET', mode: 'cors', cache: 'no-store' })
      if (!resp.ok) {
        lastErr = `Could not download proposal PDF (HTTP ${resp.status}).`
        continue
      }
      const buf = await resp.arrayBuffer()
      const bytes = new Uint8Array(buf)
      if (!looksLikePdfMagic(bytes)) {
        lastErr =
          'Downloaded file was not a PDF (wrong path or HTML error page). Try another bill or re-upload the proposal.'
        continue
      }
      return { ok: true, bytes, url }
    } catch (e) {
      lastErr = e.message || lastErr
    }
  }
  return { ok: false, message: lastErr }
}

/**
 * Build an in-memory copy of the SPAN proposal PDF with the greeting line
 * rewritten to "Dear {salutation},". Does not write to storage.
 *
 * @param {{
 *   bill: { state?: string, name?: string },
 *   target: { display_name?: string, sponsor_role?: string | null, greeting_title?: string | null },
 *   member?: object | null,
 *   proposalPdfUrl?: string | null,
 * }} opts
 * @returns {Promise<{ ok: true, blob: Blob, base64: string, filename: string, objectUrl: string, pageCount: number, replacedGreeting: string | null } | { ok: false, message: string }>}
 */
export async function generatePersonalizedOutreachPdf({ bill, target, proposalPdfUrl = null }) {
  try {
    if (!proposalPdfUrl) {
      return {
        ok: false,
        message: 'No SPAN proposal PDF is on file for this bill, so a personalized letter cannot be built.',
      }
    }

    const downloaded = await downloadProposalPdfBytes(proposalPdfUrl, bill)
    if (!downloaded.ok) {
      return { ok: false, message: downloaded.message }
    }
    // Keep an owned copy for pdf-lib; greeting scan gets its own copy inside findGreetingBoxOnFirstPage.
    const srcBytes = new Uint8Array(downloaded.bytes)

    const salutation = winAnsiSafe(
      legislatorFormalSalutation(target?.display_name, target?.sponsor_role, {
        greetingTitle: target?.greeting_title,
      })
    )
    const newGreeting = `Dear ${salutation},`

    let greetingBox = null
    try {
      greetingBox = await findGreetingBoxOnFirstPage(srcBytes)
    } catch (scanErr) {
      console.warn('[outreach] greeting scan failed; will place Dear near top', scanErr)
      greetingBox = null
    }

    if (!looksLikePdfMagic(srcBytes)) {
      return {
        ok: false,
        message: 'Proposal PDF bytes were invalidated while parsing. Please try again.',
      }
    }

    const out = await PDFDocument.load(srcBytes, { ignoreEncryption: true })
    const pages = out.getPages()
    if (!pages.length) {
      return { ok: false, message: 'Proposal PDF has no pages.' }
    }
    const first = pages[0]
    const { width: pageWidth, height: pageHeight } = first.getSize()
    const font = await out.embedFont(StandardFonts.TimesRoman)

    let replacedGreeting = null
    if (greetingBox) {
      const deleted = deleteTextRunsFromPage(first, greetingBox.itemStrings || [])
      if (deleted === 0) {
        // Fallback for hex-encoded / subset fonts where literals aren't plain in the stream
        console.warn('[outreach] content-stream delete found no literals; falling back to white-out')
        const wipeList =
          Array.isArray(greetingBox.wipeRects) && greetingBox.wipeRects.length
            ? greetingBox.wipeRects
            : [
                {
                  x: greetingBox.x,
                  y: greetingBox.y - greetingBox.fontSize * 0.2,
                  width: Math.min(pageWidth - greetingBox.x - 36, Math.max(greetingBox.width, 420)),
                  height: Math.max(greetingBox.height, greetingBox.fontSize * 1.15),
                },
              ]
        for (const rect of wipeList) {
          first.drawRectangle({
            x: rect.x,
            y: rect.y,
            width: Math.min(rect.width, pageWidth - rect.x - 24),
            height: rect.height,
            color: rgb(1, 1, 1),
            borderWidth: 0,
          })
        }
      }
      const fontSize = Math.min(14, Math.max(10, greetingBox.fontSize || 11))
      const drawX = greetingBox.drawX ?? greetingBox.x
      const drawY = greetingBox.drawY ?? greetingBox.y
      first.drawText(newGreeting, {
        x: drawX,
        y: drawY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      replacedGreeting = greetingBox.matchedText
    } else {
      // No detectable greeting line — place Dear … near the top without inventing a full cover letter.
      const fontSize = 12
      const x = 54
      const y = pageHeight - 120
      first.drawRectangle({
        x: x - 2,
        y: y - 2,
        width: Math.min(pageWidth - x - 40, 360),
        height: fontSize + 6,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      })
      first.drawText(newGreeting, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
      replacedGreeting = null
    }

    const bytes = await out.save()
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    const base64 = uint8ToBase64(u8)
    const blob = new Blob([u8], { type: 'application/pdf' })
    const objectUrl = URL.createObjectURL(blob)
    const safeName = String(target?.display_name || 'legislator')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40)
    const billSafe = String(bill?.name || 'bill')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .slice(0, 24)
    const filename = `SPAN_${billSafe || 'bill'}_${safeName || 'letter'}.pdf`

    return {
      ok: true,
      blob,
      base64,
      filename,
      objectUrl,
      pageCount: out.getPageCount(),
      replacedGreeting,
      sourceUrl: downloaded.url,
    }
  } catch (e) {
    console.error('[outreach] generatePersonalizedOutreachPdf', e)
    return { ok: false, message: e.message || 'Could not personalize proposal PDF.' }
  }
}

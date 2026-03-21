import React, { useEffect, useState, useRef } from 'react'
import { fetchLegiscanBillTextDoc } from '../lib/legiscan'
import { extractFullPdfText } from '../lib/pdfExtractText'

/** Heuristic: API sometimes mislabels HTML as text/plain */
function looksLikeBillHtml(s) {
  if (!s || typeof s !== 'string') return false
  const head = s.trimStart().slice(0, 800).toLowerCase()
  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    (head.startsWith('<!--') && /<html[\s>]/i.test(s.slice(0, 12000)))
  )
}

/**
 * LegiScan bill text: prefers getBillText (doc_id) even when state_link exists.
 * URL-only: try PDF text extraction when possible; else iframe embed + open in new tab.
 */
export default function LegislatureBillTextPane({ textEntry }) {
  const [phase, setPhase] = useState('idle') // idle | loading | plaintext | embed | empty | error
  const [plainBody, setPlainBody] = useState('')
  const [externalHref, setExternalHref] = useState(null)
  const [embedSrc, setEmbedSrc] = useState(null)
  /** external = state URL in iframe; api-html = blob URL from getBillText HTML body */
  const [embedKind, setEmbedKind] = useState('external')
  const [error, setError] = useState('')
  /** Active getBillText blob URL until revoked (incl. cleanup on unmount / version change) */
  const pendingObjectUrlRef = useRef(null)
  /** Blob URL for sandboxed HTML preview (separate from LegiScan doc blob) */
  const pendingHtmlEmbedRef = useRef(null)

  useEffect(() => {
    setError('')
    setPlainBody('')
    setExternalHref(null)
    setEmbedSrc(null)
    setEmbedKind('external')
    setPhase('idle')

    const revokeHtmlEmbed = () => {
      if (pendingHtmlEmbedRef.current) {
        URL.revokeObjectURL(pendingHtmlEmbedRef.current)
        pendingHtmlEmbedRef.current = null
      }
    }
    revokeHtmlEmbed()

    if (!textEntry) {
      setPhase('empty')
      return undefined
    }

    const { url, mime, docId } = textEntry
    const mimeLower = (mime || '').toLowerCase()
    const looksPdf =
      mimeLower.includes('pdf') || (url && /\.pdf(\?|$)/i.test(url)) || (url && /\/pdf\//i.test(url))

    /** External URL only — try text from PDF URL, else iframe */
    const runExternalUrl = async (cancelledRef) => {
      if (!url) return
      if (looksPdf) {
        setPhase('loading')
        try {
          const extracted = await extractFullPdfText(url)
          if (cancelledRef()) return
          if ((extracted || '').trim()) {
            setPlainBody(extracted || '')
            setExternalHref(url)
            setPhase('plaintext')
            return
          }
        } catch {
          /* CORS / network — fall back to iframe */
        }
        if (cancelledRef()) return
        setEmbedKind('external')
        setEmbedSrc(url)
        setExternalHref(url)
        setPhase('embed')
        return
      }
      if (cancelledRef()) return
      setEmbedKind('external')
      setEmbedSrc(url)
      setExternalHref(url)
      setPhase('embed')
    }

    // Prefer LegiScan getBillText whenever doc_id exists (often alongside state_link)
    if (docId) {
      let cancelled = false
      const isCancelled = () => cancelled
      setPhase('loading')

      ;(async () => {
        const r = await fetchLegiscanBillTextDoc(docId)
        if (cancelled) return
        if (!r.ok) {
          if (url) {
            await runExternalUrl(isCancelled)
          } else {
            setError(r.message || 'Could not load bill text.')
            setPhase('error')
          }
          return
        }

        const m = (r.mime || '').toLowerCase()
        const objectUrl = r.objectUrl
        pendingObjectUrlRef.current = objectUrl

        const revokeIfCurrent = () => {
          if (pendingObjectUrlRef.current === objectUrl) {
            URL.revokeObjectURL(objectUrl)
            pendingObjectUrlRef.current = null
          }
        }

        const readBlobAsUtf8Text = async () => {
          const res = await fetch(objectUrl)
          return res.text()
        }

        const showHtmlPreview = (htmlString) => {
          revokeHtmlEmbed()
          const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' })
          const u = URL.createObjectURL(blob)
          pendingHtmlEmbedRef.current = u
          setEmbedKind('api-html')
          setEmbedSrc(u)
          setPhase('embed')
        }

        try {
          if (m.includes('text/html')) {
            const html = await readBlobAsUtf8Text()
            revokeIfCurrent()
            if (cancelled) return
            showHtmlPreview(html)
            if (url) setExternalHref(url)
            return
          }

          if (m.includes('text/plain')) {
            const txt = await readBlobAsUtf8Text()
            revokeIfCurrent()
            if (cancelled) return
            if (looksLikeBillHtml(txt)) {
              showHtmlPreview(txt)
            } else {
              setPlainBody(txt)
              setPhase('plaintext')
            }
            if (url) setExternalHref(url)
            return
          }

          if (m.includes('pdf')) {
            try {
              const extracted = await extractFullPdfText(objectUrl)
              revokeIfCurrent()
              if (cancelled) return
              const trimmed = (extracted || '').trim()
              if (!trimmed) {
                setPlainBody(
                  'No extractable text in this PDF (it may be scanned images only). Try “Open bill text in new tab” or the version link on the left.',
                )
              } else {
                setPlainBody(extracted || '')
              }
              setPhase('plaintext')
              if (url) setExternalHref(url)
            } catch (e) {
              revokeIfCurrent()
              if (cancelled) return
              setError(e.message || 'Could not read text from this PDF.')
              setPhase('error')
            }
            return
          }

          try {
            const extracted = await extractFullPdfText(objectUrl)
            if (cancelled) {
              revokeIfCurrent()
              return
            }
            if ((extracted || '').trim()) {
              revokeIfCurrent()
              setPlainBody(extracted || '')
              setPhase('plaintext')
              if (url) setExternalHref(url)
              return
            }
          } catch {
            /* fall through */
          }

          const fallbackTxt = await readBlobAsUtf8Text()
          revokeIfCurrent()
          if (cancelled) return
          if (looksLikeBillHtml(fallbackTxt)) {
            showHtmlPreview(fallbackTxt)
            if (url) setExternalHref(url)
            return
          }
          setPlainBody(
            fallbackTxt.trim()
              ? fallbackTxt
              : 'Could not decode this document as readable text. Try opening the bill on LegiScan.',
          )
          setPhase('plaintext')
          if (url) setExternalHref(url)
        } catch (e) {
          revokeIfCurrent()
          if (cancelled) return
          setError(e.message || 'Could not read bill text.')
          setPhase('error')
        }
      })()

      return () => {
        cancelled = true
        if (pendingObjectUrlRef.current) {
          URL.revokeObjectURL(pendingObjectUrlRef.current)
          pendingObjectUrlRef.current = null
        }
        if (pendingHtmlEmbedRef.current) {
          URL.revokeObjectURL(pendingHtmlEmbedRef.current)
          pendingHtmlEmbedRef.current = null
        }
      }
    }

    // URL only (no doc_id)
    if (url) {
      let cancelled = false
      const isCancelled = () => cancelled
      if (looksPdf) {
        setPhase('loading')
        ;(async () => {
          await runExternalUrl(isCancelled)
        })()
      } else {
        setEmbedKind('external')
        setEmbedSrc(url)
        setExternalHref(url)
        setPhase('embed')
      }
      return () => {
        cancelled = true
      }
    }

    setPhase('empty')
    setError('No URL or document id for this version.')
    return undefined
  }, [textEntry])

  const textPanelScrollStyle = {
    maxHeight: 'min(52vh, 520px)',
    overflowY: 'auto',
    fontSize: '0.8125rem',
    lineHeight: 1.45,
  }

  if (phase === 'empty' && !error) {
    return (
      <div className="border rounded bg-light p-4 text-center text-muted small" style={{ minHeight: '280px' }}>
        No bill text version selected, or none available. Choose a version above or open the bill on LegiScan.
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="border rounded d-flex align-items-center justify-content-center py-5 text-muted">
        <div className="spinner-border spinner-border-sm me-2" role="status" />
        Loading bill text…
      </div>
    )
  }

  if (phase === 'error' || (phase === 'empty' && error)) {
    return (
      <div className="alert alert-secondary small mb-0">
        {error || 'Bill text could not be shown in the browser.'}
      </div>
    )
  }

  if (phase === 'embed' && embedSrc) {
    const openTabHref = externalHref || embedSrc
    const isApiHtml = embedKind === 'api-html'
    return (
      <div className="border rounded bg-white overflow-hidden">
        <div className="px-2 py-1 border-bottom bg-light small text-muted d-flex flex-wrap align-items-center gap-2 justify-content-between">
          <span>{isApiHtml ? 'Bill text (formatted)' : 'Bill text (external page)'}</span>
          <a
            href={openTabHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-primary py-0"
          >
            Open in new tab
          </a>
        </div>
        <div
          className="border-top bg-light"
          style={{ minHeight: 'min(52vh, 480px)', height: '48vh' }}
        >
          <iframe
            title="Bill text"
            src={embedSrc}
            className="w-100 border-0 d-block"
            style={{ minHeight: 'min(52vh, 480px)', height: '48vh' }}
            sandbox={
              isApiHtml
                ? 'allow-same-origin'
                : 'allow-same-origin allow-scripts allow-popups allow-forms'
            }
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="small text-muted mb-0 px-2 py-2">
          {isApiHtml ? (
            <>
              HTML from LegiScan is shown formatted here; scripts are disabled in this preview. Use <strong>Open in new tab</strong>{' '}
              for the state site if something looks wrong.
            </>
          ) : (
            <>
              If this area is blank, the site may block embedding — use Open in new tab. For comparison, prefer versions
              with extractable text from LegiScan when available.
            </>
          )}
        </p>
      </div>
    )
  }

  if (phase === 'plaintext') {
    return (
      <div className="border rounded bg-white">
        <div className="px-2 py-1 border-bottom bg-light small text-muted">Bill text</div>
        <div className="p-3 pb-2" style={textPanelScrollStyle}>
          <pre
            className="mb-0"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}
          >
            {plainBody || '—'}
          </pre>
        </div>
        {externalHref && (
          <div className="px-3 pb-3">
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-primary"
            >
              Open bill text in new tab
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded bg-light p-3 text-muted small">Select a bill text version to preview.</div>
  )
}

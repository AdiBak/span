import React, { useState, useEffect, useMemo } from 'react'
import {
  buildOutreachDraft,
  getProposalPdfPublicUrl,
  outreachBodyPlainToHtml,
} from '../lib/outreachEmail'
import { sendOutreachEmailViaResend } from '../lib/outreachSend'

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Compose / preview outreach email for one target; optional Resend send; copy + mailto for webmail-only.
 */
export default function OutreachContactModal({
  open,
  onClose,
  bill,
  target,
  member,
  onMarkContacted,
}) {
  const [subject, setSubject] = useState('')
  const [bodyPlain, setBodyPlain] = useState('')
  const [tab, setTab] = useState('edit') // 'edit' | 'preview'
  const [attachPdf, setAttachPdf] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendOk, setSendOk] = useState('')
  const [copyHint, setCopyHint] = useState('')

  const pdfUrl = useMemo(() => (bill ? getProposalPdfPublicUrl(bill) : null), [bill])
  const toEmail = (target?.contact_email || '').trim()
  const canMailto = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)

  useEffect(() => {
    if (!open || !bill || !target) return
    const d = buildOutreachDraft(bill, target, member)
    setSubject(d.subject)
    setBodyPlain(d.body)
    setTab('edit')
    setAttachPdf(!!getProposalPdfPublicUrl(bill))
    setSendError('')
    setSendOk('')
    setCopyHint('')
  }, [open, bill, target, member])

  const htmlBody = useMemo(() => outreachBodyPlainToHtml(bodyPlain), [bodyPlain])

  const mailtoHref = useMemo(() => {
    if (!canMailto) return ''
    const q = new URLSearchParams()
    q.set('subject', subject)
    q.set('body', bodyPlain)
    return `mailto:${encodeURIComponent(toEmail)}?${q.toString()}`
  }, [canMailto, toEmail, subject, bodyPlain])

  const handleSendResend = async () => {
    if (!canMailto) {
      setSendError('Add a valid email on this row (or paste into your client after Copy).')
      return
    }
    setSending(true)
    setSendError('')
    setSendOk('')
    try {
      const res = await sendOutreachEmailViaResend({
        to: toEmail,
        subject,
        html: htmlBody,
        text: bodyPlain,
        attachment_url: attachPdf && pdfUrl ? pdfUrl : null,
      })
      if (!res.ok) {
        setSendError(res.error || 'Send failed.')
        return
      }
      setSendOk('Email sent.')
      if (typeof onMarkContacted === 'function') {
        await onMarkContacted()
      }
    } catch (e) {
      setSendError(e.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  const flashCopy = (label) => {
    setCopyHint(label)
    setTimeout(() => setCopyHint(''), 2000)
  }

  if (!open || !bill || !target) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1060 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="outreach-contact-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="outreach-contact-title">
                Contact: {target.display_name}
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-2">
                Bill: <strong>{bill.state}</strong> {bill.name} · Position: {bill.position || '—'}
              </p>
              {!canMailto && (
                <div className="alert alert-warning py-2 small mb-3">
                  No email on file — use <strong>Copy message</strong> and your legislator webmail link, or add an
                  email on the outreach table first.
                </div>
              )}
              {pdfUrl && (
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="outreach-attach-pdf"
                    checked={attachPdf}
                    onChange={(e) => setAttachPdf(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="outreach-attach-pdf">
                    Attach proposal PDF when sending via email ({pdfUrl.split('/').pop()})
                  </label>
                </div>
              )}

              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === 'edit' ? 'active' : ''}`}
                    onClick={() => setTab('edit')}
                  >
                    Edit
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === 'preview' ? 'active' : ''}`}
                    onClick={() => setTab('preview')}
                  >
                    Preview (HTML)
                  </button>
                </li>
              </ul>

              {tab === 'edit' ? (
                <>
                  <div className="mb-3">
                    <label className="form-label small" htmlFor="outreach-subject">
                      Subject
                    </label>
                    <input
                      id="outreach-subject"
                      type="text"
                      className="form-control form-control-sm"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small" htmlFor="outreach-body">
                      Message (plain text — edits appear in preview)
                    </label>
                    <textarea
                      id="outreach-body"
                      className="form-control font-monospace small"
                      rows={14}
                      value={bodyPlain}
                      onChange={(e) => setBodyPlain(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="border rounded p-2 bg-white overflow-auto"
                  style={{ maxHeight: 'min(60vh, 520px)' }}
                >
                  <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
                </div>
              )}

              {sendError && (
                <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">
                  {sendError}
                </div>
              )}
              {sendOk && (
                <div className="alert alert-success py-2 small mt-2 mb-0" role="status">
                  {sendOk}
                </div>
              )}
              {copyHint && <p className="text-success small mb-0 mt-2">{copyHint}</p>}
            </div>
            <div className="modal-footer flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={async () => {
                  const ok = await copyToClipboard(bodyPlain)
                  flashCopy(ok ? 'Message copied.' : 'Could not copy — select text manually.')
                }}
              >
                Copy message
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-dark"
                onClick={async () => {
                  const ok = await copyToClipboard(subject)
                  flashCopy(ok ? 'Subject copied.' : 'Could not copy subject.')
                }}
              >
                Copy subject
              </button>
              {pdfUrl && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={async () => {
                    const ok = await copyToClipboard(pdfUrl)
                    flashCopy(ok ? 'PDF link copied.' : 'Could not copy link.')
                  }}
                >
                  Copy PDF link
                </button>
              )}
              {canMailto && (
                <a className="btn btn-sm btn-outline-primary" href={mailtoHref}>
                  Open in email app
                </a>
              )}
              {(target.contact_webmail_url || '').trim() && (
                <a
                  className="btn btn-sm btn-outline-primary"
                  href={target.contact_webmail_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open webmail page
                </a>
              )}
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={sending || !canMailto}
                onClick={handleSendResend}
                title={!canMailto ? 'Add recipient email to enable send' : undefined}
              >
                {sending ? 'Sending…' : 'Send via SPAN email'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} aria-hidden="true" />
    </>
  )
}

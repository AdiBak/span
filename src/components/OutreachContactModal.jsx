import React, { useState, useEffect, useMemo } from 'react'
import {
  buildOutreachDraft,
  buildWebformContactPasteText,
  legislatorContactSearchUrl,
  outreachBodyPlainToHtml,
  outreachPlainWhenAttachingViaEmail,
  resolveProposalPdfPublicUrl,
  submitterDisplayName,
  submitterSpanEmail,
} from '../lib/outreachEmail'
import { sendOutreachEmailViaResend, sendOutreachReferenceCopy } from '../lib/outreachSend'
import { supabase } from '../lib/supabase'

const LEADERSHIP_CC_LABEL = 'Joel Blessan & Vishank Panchbhavi (always)'

function collaboratorNameList(bill) {
  const raw = bill?.bill_collaborators
  if (Array.isArray(raw)) return raw.map((n) => String(n || '').trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  return []
}

function memberFullName(m) {
  return `${m?.first_name || ''} ${m?.last_name || ''}`.trim()
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Compose outreach for one target; HTML preview when a direct email path exists; copy + webmail otherwise.
 * Builds a personalized "Dear …" letter PDF in memory (does not overwrite stored proposal PDFs).
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
  const [tab, setTab] = useState('edit') // 'edit' | 'preview' | 'pdf'
  const [attachPdf, setAttachPdf] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendingRef, setSendingRef] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendOk, setSendOk] = useState('')
  const [refError, setRefError] = useState('')
  const [refOk, setRefOk] = useState('')
  const [copyHint, setCopyHint] = useState('')
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState(null)
  const [pdfResolving, setPdfResolving] = useState(false)
  const [letterPdf, setLetterPdf] = useState(null) // { base64, filename, objectUrl, pageCount }
  const [letterPdfError, setLetterPdfError] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [ccMemberIds, setCcMemberIds] = useState(() => new Set())
  const [ccFilter, setCcFilter] = useState('')
  const [ccLoadError, setCcLoadError] = useState('')

  const toEmail = (target?.contact_email || '').trim()
  const canMailto = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)
  const hasWebmail = !!(target?.contact_webmail_url || '').trim()
  const isMentorViewer = !!(member && member._isMentor)
  /** Webmail-only: message is pasted as plain text; HTML preview is not useful. */
  const showHtmlPreview = canMailto
  const contactSearchUrl = useMemo(
    () => legislatorContactSearchUrl(target?.display_name, bill?.state),
    [target?.display_name, bill?.state]
  )

  const senderMemberId = member?.member_id != null ? String(member.member_id) : ''

  const ccCandidates = useMemo(() => {
    const q = ccFilter.trim().toLowerCase()
    return (teamMembers || [])
      .filter((m) => {
        if (!m || m.active === false) return false
        if (senderMemberId && String(m.member_id) === senderMemberId) return false
        const email = submitterSpanEmail(m)
        if (!email) return false
        if (!q) return true
        const name = memberFullName(m).toLowerCase()
        return name.includes(q) || email.toLowerCase().includes(q)
      })
      .map((m) => ({
        ...m,
        _name: memberFullName(m) || submitterDisplayName(m),
        _email: submitterSpanEmail(m),
      }))
  }, [teamMembers, ccFilter, senderMemberId])

  const selectedCcEmails = useMemo(() => {
    const emails = []
    for (const m of teamMembers) {
      if (!ccMemberIds.has(String(m.member_id))) continue
      const email = submitterSpanEmail(m)
      if (email) emails.push(email)
    }
    return emails
  }, [teamMembers, ccMemberIds])

  useEffect(() => {
    if (!open || !bill || !target) {
      setResolvedPdfUrl(null)
      setPdfResolving(false)
      setTeamMembers([])
      setCcMemberIds(new Set())
      setCcFilter('')
      setCcLoadError('')
      setLetterPdf((prev) => {
        if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl)
        return null
      })
      setLetterPdfError('')
      return
    }
    let cancelled = false
    setPdfResolving(true)
    setSendError('')
    setSendOk('')
    setRefError('')
    setRefOk('')
    setSendingRef(false)
    setCopyHint('')
    setCcFilter('')
    setCcLoadError('')
    setLetterPdfError('')
    setLetterPdf((prev) => {
      if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl)
      return null
    })
    ;(async () => {
      const membersPromise = supabase
        .from('members')
        .select('member_id, first_name, last_name, email, active')
        .order('last_name', { ascending: true })

      const pdfUrl = await resolveProposalPdfPublicUrl(bill, { supabase, persist: true })
      if (cancelled) return
      setResolvedPdfUrl(pdfUrl)
      const hasWeb = !!(target?.contact_webmail_url || '').trim()
      const toAddr = (target?.contact_email || '').trim()
      const canM = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toAddr)
      const pdfDelivery = hasWeb ? 'link' : 'attach'
      const d = buildOutreachDraft(bill, target, member, { pdfUrl, pdfDelivery })
      setSubject(d.subject)
      let body = d.body
      if (!hasWeb && canM) {
        body = body.replace(
          'Please find our proposal PDF attached.',
          'Please find our proposal PDF attached (greeting addressed to this legislator).'
        )
      }
      setBodyPlain(body)
      setTab('edit')

      const { data: memberRows, error: membersErr } = await membersPromise
      if (!cancelled) {
        if (membersErr) {
          console.warn('[outreach] CC member list', membersErr)
          setCcLoadError('Could not load team members for CC.')
          setTeamMembers([])
          setCcMemberIds(new Set())
        } else {
          const rows = (memberRows || []).filter((m) => m.active !== false)
          setTeamMembers(rows)
          const collabNames = collaboratorNameList(bill).map((n) => n.toLowerCase())
          const pre = new Set()
          if (collabNames.length) {
            for (const m of rows) {
              if (senderMemberId && String(m.member_id) === senderMemberId) continue
              if (!submitterSpanEmail(m)) continue
              const full = memberFullName(m).toLowerCase()
              if (collabNames.includes(full)) pre.add(String(m.member_id))
            }
          }
          setCcMemberIds(pre)
        }
      }

      const { generatePersonalizedOutreachPdf } = await import('../lib/generateOutreachLetterPDF')
      const built = await generatePersonalizedOutreachPdf({
        bill,
        target,
        proposalPdfUrl: pdfUrl,
      })
      if (cancelled) {
        if (built.ok && built.objectUrl) URL.revokeObjectURL(built.objectUrl)
        return
      }
      if (!built.ok) {
        setLetterPdfError(built.message || 'Could not personalize the proposal PDF.')
        setAttachPdf(!!pdfUrl && canM)
      } else {
        setLetterPdf({
          base64: built.base64,
          filename: built.filename,
          objectUrl: built.objectUrl,
          pageCount: built.pageCount,
          replacedGreeting: built.replacedGreeting,
        })
        setAttachPdf(canM || hasWeb)
      }
      setPdfResolving(false)
    })().catch((e) => {
      if (!cancelled) {
        setLetterPdfError(e.message || 'Could not prepare letter PDF.')
        setPdfResolving(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, bill, target, member, senderMemberId])

  useEffect(() => {
    return () => {
      if (letterPdf?.objectUrl) URL.revokeObjectURL(letterPdf.objectUrl)
    }
  }, [letterPdf?.objectUrl])

  const htmlBody = useMemo(() => outreachBodyPlainToHtml(bodyPlain), [bodyPlain])
  const webformContactPasteText = useMemo(() => buildWebformContactPasteText(member), [member])

  const mailtoHref = useMemo(() => {
    if (!canMailto) return ''
    const q = new URLSearchParams()
    q.set('subject', subject)
    q.set('body', bodyPlain)
    if (selectedCcEmails.length) {
      q.set('cc', selectedCcEmails.join(','))
    }
    return `mailto:${encodeURIComponent(toEmail)}?${q.toString()}`
  }, [canMailto, toEmail, subject, bodyPlain, selectedCcEmails])

  const toggleCcMember = (memberId) => {
    const id = String(memberId)
    setCcMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectBillCollaborators = () => {
    const collabNames = collaboratorNameList(bill).map((n) => n.toLowerCase())
    if (!collabNames.length) return
    setCcMemberIds((prev) => {
      const next = new Set(prev)
      for (const m of teamMembers) {
        if (senderMemberId && String(m.member_id) === senderMemberId) continue
        if (!submitterSpanEmail(m)) continue
        if (collabNames.includes(memberFullName(m).toLowerCase())) {
          next.add(String(m.member_id))
        }
      }
      return next
    })
  }

  const attachmentPayload = () => {
    if (!attachPdf) return {}
    if (letterPdf?.base64) {
      return {
        attachment_base64: letterPdf.base64,
        attachment_filename: letterPdf.filename,
        attachment_url: null,
      }
    }
    if (resolvedPdfUrl) {
      return { attachment_url: resolvedPdfUrl }
    }
    return {}
  }

  const handleSendResend = async () => {
    if (isMentorViewer) {
      setSendError('Mentor accounts can preview outreach but cannot send email on SPAN’s behalf.')
      return
    }
    if (!canMailto) {
      setSendError('Add a valid email on this row (or paste into your client after Copy).')
      return
    }
    setSending(true)
    setSendError('')
    setSendOk('')
    try {
      const sendText =
        attachPdf && resolvedPdfUrl && hasWebmail
          ? outreachPlainWhenAttachingViaEmail(bodyPlain, resolvedPdfUrl)
          : bodyPlain
      const sendHtml = outreachBodyPlainToHtml(sendText)
      const res = await sendOutreachEmailViaResend({
        to: toEmail,
        subject,
        html: sendHtml,
        text: sendText,
        cc: selectedCcEmails,
        ...attachmentPayload(),
      })
      if (!res.ok) {
        setSendError(res.error || 'Send failed.')
        return
      }
      setSending(false)
      setSendOk(
        selectedCcEmails.length
          ? `Email sent (CC’d ${selectedCcEmails.length} teammate${selectedCcEmails.length === 1 ? '' : 's'} + leadership).`
          : 'Email sent (Joel & Vishank CC’d).',
      )
      if (typeof onMarkContacted === 'function') {
        await onMarkContacted()
      }
      await new Promise((r) => setTimeout(r, 1200))
      onClose()
    } catch (e) {
      setSendError(e.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  const handleSendReferenceCopy = async () => {
    if (isMentorViewer) {
      setRefError('Mentor accounts can preview outreach but cannot send email on SPAN’s behalf.')
      return
    }
    setSendingRef(true)
    setRefError('')
    setRefOk('')
    try {
      const res = await sendOutreachReferenceCopy({
        subject,
        html: htmlBody,
        text: bodyPlain,
        cc: selectedCcEmails,
        ...attachmentPayload(),
      })
      if (!res.ok) {
        setRefError(res.error || 'Send failed.')
        return
      }
      setRefOk(
        selectedCcEmails.length
          ? `Reference copy sent to Joel & Vishank (CC’d ${selectedCcEmails.length} teammate${
              selectedCcEmails.length === 1 ? '' : 's'
            }).`
          : 'Reference copy sent to Joel and Vishank.',
      )
    } catch (e) {
      setRefError(e.message || 'Send failed.')
    } finally {
      setSendingRef(false)
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
              {!canMailto && !hasWebmail && (
                <div className="alert alert-warning py-2 small mb-3">
                  No email or webmail on file. Try{' '}
                  <a href={contactSearchUrl} target="_blank" rel="noopener noreferrer">
                    a Google search for contact info
                  </a>
                  , or add an email or webmail link on the outreach table. Use <strong>Copy message</strong> to paste
                  into whichever channel you find.
                </div>
              )}
              {!canMailto && hasWebmail && (
                <div className="alert alert-warning py-2 small mb-3">
                  No direct email on file — use <strong>Copy message</strong> and the legislator webmail link, or add
                  an email on the outreach table first.
                </div>
              )}
              {hasWebmail && (
                <div className="alert alert-info py-2 small mb-3">
                  <div className="fw-semibold mb-1">Your contact info (for web forms)</div>
                  <p className="mb-2 text-muted">
                    Paste from the block below into the legislator&apos;s online form. Use your SPAN email and your phone;
                    the mailing address is SPAN&apos;s office.
                  </p>
                  <pre
                    className="small bg-white border rounded p-2 mb-2"
                    style={{ whiteSpace: 'pre-wrap', maxHeight: 'min(28vh, 220px)', overflow: 'auto' }}
                  >
                    {webformContactPasteText}
                  </pre>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-dark mb-2"
                    onClick={async () => {
                      const ok = await copyToClipboard(webformContactPasteText)
                      flashCopy(ok ? 'Contact info copied.' : 'Could not copy — select text manually.')
                    }}
                  >
                    Copy contact info
                  </button>
                  <hr className="my-2" />
                  <p className="mb-2">
                    After you submit on their website, you can send a <strong>reference copy</strong> of this message
                    to <strong>Joel Blessan</strong> and <strong>Vishank Panchbhavi</strong> for SPAN&apos;s records
                    {selectedCcEmails.length
                      ? ` (plus ${selectedCcEmails.length} selected teammate${
                          selectedCcEmails.length === 1 ? '' : 's'
                        } on CC)`
                      : ''}
                    . This does <em>not</em> go to the legislator — it is only an internal log of what you sent
                    externally. Web forms can&apos;t CC anyone; use the checklist below so teammates get the log.
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={sendingRef || isMentorViewer}
                    title={
                      isMentorViewer
                        ? 'Mentor accounts cannot send email on SPAN’s behalf'
                        : undefined
                    }
                    onClick={handleSendReferenceCopy}
                  >
                    {sendingRef
                      ? 'Sending…'
                      : selectedCcEmails.length
                        ? `Send reference copy (Joel, Vishank + ${selectedCcEmails.length} CC)`
                        : 'Send reference copy to Joel & Vishank'}
                  </button>
                  {isMentorViewer && (
                    <p className="small text-muted mt-2 mb-0">
                      Visible for mentors to review the flow — sending is disabled.
                    </p>
                  )}
                  {refError && (
                    <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">
                      {refError}
                    </div>
                  )}
                  {refOk && (
                    <div className="alert alert-success py-2 small mt-2 mb-0" role="status">
                      {refOk}
                    </div>
                  )}
                </div>
              )}
              {pdfResolving && (
                <p className="small text-muted mb-2">
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Looking up proposal PDF and personalizing the greeting…
                </p>
              )}
              {letterPdfError && !pdfResolving && (
                <div className="alert alert-warning py-2 small mb-3" role="alert">
                  {letterPdfError}
                  {resolvedPdfUrl
                    ? ' You can still attach the stored proposal PDF if available.'
                    : ''}
                </div>
              )}
              {!pdfResolving && (letterPdf || resolvedPdfUrl) && (
                <div className="mb-3">
                  {(canMailto || hasWebmail) && (
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="outreach-attach-pdf"
                        checked={attachPdf}
                        onChange={(e) => setAttachPdf(e.target.checked)}
                      />
                      <label className="form-check-label small" htmlFor="outreach-attach-pdf">
                        {letterPdf
                          ? `Attach proposal PDF with personalized greeting (${letterPdf.filename}${
                              letterPdf.pageCount ? `, ${letterPdf.pageCount} page${letterPdf.pageCount === 1 ? '' : 's'}` : ''
                            })`
                          : `Attach proposal PDF (${resolvedPdfUrl.split('/').pop()})`}
                      </label>
                    </div>
                  )}
                  {letterPdf && (
                    <p className="small text-muted mb-0">
                      Same SPAN proposal — old greeting lines are removed from the PDF when possible, then replaced with
                      Dear … for this legislator. The file in storage is not changed. Use <strong>Preview (PDF)</strong>{' '}
                      before sending.
                      {letterPdf.replacedGreeting
                        ? ` Removed: “${letterPdf.replacedGreeting}”.`
                        : ' No existing greeting line was detected; Dear … was added near the top of page 1.'}
                    </p>
                  )}
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
                {showHtmlPreview && (
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link ${tab === 'preview' ? 'active' : ''}`}
                      onClick={() => setTab('preview')}
                    >
                      Preview (email)
                    </button>
                  </li>
                )}
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${tab === 'pdf' ? 'active' : ''}`}
                    onClick={() => setTab('pdf')}
                    disabled={!letterPdf && !resolvedPdfUrl}
                  >
                    Preview (PDF)
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
                      maxLength={550}
                    />
                  </div>
                  {(canMailto || hasWebmail) && (
                    <div className="mb-3">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                        <label className="form-label small mb-0" htmlFor="outreach-cc-filter">
                          CC team members
                        </label>
                        {collaboratorNameList(bill).length > 0 && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0"
                            onClick={selectBillCollaborators}
                          >
                            Select bill collaborators
                          </button>
                        )}
                      </div>
                      <p className="small text-muted mb-2">
                        {canMailto
                          ? `Always CC’d on SPAN email: ${LEADERSHIP_CC_LABEL.replace(' (always)', '')}. Optionally add collaborators or other members below.`
                          : 'Legislator web forms can’t CC anyone. Selected teammates are CC’d on the internal reference copy to Joel & Vishank after you submit.'}
                      </p>
                      {ccLoadError && (
                        <div className="alert alert-warning py-1 small mb-2">{ccLoadError}</div>
                      )}
                      <input
                        id="outreach-cc-filter"
                        type="search"
                        className="form-control form-control-sm mb-2"
                        placeholder="Filter by name or email…"
                        value={ccFilter}
                        onChange={(e) => setCcFilter(e.target.value)}
                        disabled={isMentorViewer}
                      />
                      <div
                        className="border rounded p-2 bg-light"
                        style={{ maxHeight: 'min(28vh, 200px)', overflow: 'auto' }}
                      >
                        <div className="form-check mb-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="outreach-cc-leadership"
                            checked
                            disabled
                          />
                          <label className="form-check-label small text-muted" htmlFor="outreach-cc-leadership">
                            {LEADERSHIP_CC_LABEL}
                          </label>
                        </div>
                        {ccCandidates.length === 0 ? (
                          <p className="small text-muted mb-0">
                            {teamMembers.length === 0 ? 'Loading members…' : 'No matching members.'}
                          </p>
                        ) : (
                          ccCandidates.map((m) => {
                            const id = String(m.member_id)
                            const checked = ccMemberIds.has(id)
                            return (
                              <div className="form-check" key={id}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`outreach-cc-${id}`}
                                  checked={checked}
                                  disabled={isMentorViewer}
                                  onChange={() => toggleCcMember(id)}
                                />
                                <label className="form-check-label small" htmlFor={`outreach-cc-${id}`}>
                                  {m._name}
                                  <span className="text-muted"> · {m._email}</span>
                                </label>
                              </div>
                            )
                          })
                        )}
                      </div>
                      {selectedCcEmails.length > 0 && (
                        <p className="small text-muted mb-0 mt-1">
                          {selectedCcEmails.length} extra CC
                          {selectedCcEmails.length === 1 ? '' : 's'} selected
                          {ccMemberIds.size > selectedCcEmails.length
                            ? ` (${ccMemberIds.size - selectedCcEmails.length} without a usable email skipped)`
                            : ''}
                          .
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mb-2">
                    <label className="form-label small" htmlFor="outreach-body">
                      {showHtmlPreview
                        ? 'Message (plain text — edits appear in email preview)'
                        : 'Message (plain text — copy into the legislator web form)'}
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
              ) : null}

              {tab === 'preview' && showHtmlPreview ? (
                <div
                  className="border rounded p-2 bg-white overflow-auto"
                  style={{ maxHeight: 'min(60vh, 520px)' }}
                >
                  <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
                </div>
              ) : null}

              {tab === 'pdf' ? (
                letterPdf?.objectUrl ? (
                  <div>
                    <p className="small text-muted mb-2">
                      Proposal for <strong>{target.display_name}</strong>
                      {letterPdf.replacedGreeting
                        ? ` — greeting was “${letterPdf.replacedGreeting}”.`
                        : ' — Dear … added on page 1.'}
                    </p>
                    <iframe
                      title="Personalized proposal PDF preview"
                      src={letterPdf.objectUrl}
                      className="w-100 border rounded"
                      style={{ height: 'min(60vh, 520px)' }}
                    />
                  </div>
                ) : resolvedPdfUrl ? (
                  <div>
                    <p className="small text-muted mb-2">
                      Stored proposal PDF (personalized cover could not be built).
                    </p>
                    <iframe
                      title="Proposal PDF preview"
                      src={resolvedPdfUrl}
                      className="w-100 border rounded"
                      style={{ height: 'min(60vh, 520px)' }}
                    />
                  </div>
                ) : (
                  <p className="text-muted small mb-0">No PDF available to preview.</p>
                )
              ) : null}

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
              {resolvedPdfUrl && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={async () => {
                    const ok = await copyToClipboard(resolvedPdfUrl)
                    flashCopy(ok ? 'PDF link copied.' : 'Could not copy link.')
                  }}
                >
                  Copy proposal PDF link
                </button>
              )}
              {letterPdf?.objectUrl && (
                <a
                  className="btn btn-sm btn-outline-dark"
                  href={letterPdf.objectUrl}
                  download={letterPdf.filename}
                >
                  Download letter PDF
                </a>
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
              {canMailto && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={sending || pdfResolving || isMentorViewer}
                  title={
                    isMentorViewer
                      ? 'Mentor accounts cannot send email on SPAN’s behalf'
                      : undefined
                  }
                  onClick={handleSendResend}
                >
                  {sending ? 'Sending…' : 'Send via SPAN email'}
                </button>
              )}
              {isMentorViewer && (
                <span className="small text-muted align-self-center">
                  Mentor preview — send disabled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} aria-hidden="true" />
    </>
  )
}

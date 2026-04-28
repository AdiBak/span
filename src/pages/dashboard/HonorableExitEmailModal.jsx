import React, { useState, useEffect, useCallback } from 'react'
import { generateVolunteerPDF } from '../../lib/generateVolunteerPDF'
import { fetchLetterStats, fetchApprovedVolunteerEntries } from '../../lib/memberLetterStats'
import {
  buildHonorableExitEmailHtml,
  buildMeetingLineHtml,
  composeHonorableWorkSectionHtml,
} from '../../lib/memberLetterEmailTemplates'
import { buildHonorableResignationLetter } from '../../lib/memberLetters'
import { supabaseInvokeHeaders } from './supabaseInvoke'

function formatJoinDate(startDate) {
  if (!startDate) return ''
  try {
    return new Date(startDate).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return String(startDate)
  }
}

export default function HonorableExitEmailModal({ open, onClose, supabase, membersList }) {
  const [memberId, setMemberId] = useState('')
  const [meetingNote, setMeetingNote] = useState('')
  const [manualWorkNotes, setManualWorkNotes] = useState('')
  const [stats, setStats] = useState(null)
  const [approvedEntries, setApprovedEntries] = useState([])
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [pdfAttachBase64, setPdfAttachBase64] = useState(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null)
  const [building, setBuilding] = useState(false)
  const [sending, setSending] = useState(false)

  const selected = (membersList || []).find((m) => m.member_id === memberId)

  const revokePdfUrl = useCallback(() => {
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPdfAttachBase64(null)
  }, [])

  useEffect(() => {
    if (!open || !memberId) return
    let cancelled = false
    ;(async () => {
      const [s, entries] = await Promise.all([
        fetchLetterStats(supabase, memberId),
        fetchApprovedVolunteerEntries(supabase, memberId),
      ])
      if (cancelled) return
      setStats(s)
      setApprovedEntries(entries)
    })()
    return () => {
      cancelled = true
    }
  }, [open, memberId, supabase])

  useEffect(() => {
    if (!memberId) return
    setManualWorkNotes('')
    setMeetingNote('')
    setPreviewSubject('')
    setPreviewHtml('')
    revokePdfUrl()
  }, [memberId, revokePdfUrl])

  useEffect(() => {
    return () => revokePdfUrl()
  }, [revokePdfUrl])

  const hasDocumentedWork =
    stats &&
    ((stats.volunteerHoursDecimal || 0) > 0 || (stats.billsImpactedCount || 0) > 0)
  const hasApprovedHoursEntries = approvedEntries.length > 0
  const honorableSendOk =
    hasDocumentedWork || (manualWorkNotes && manualWorkNotes.trim().length > 0)

  const handleBuildPreview = async () => {
    if (!selected) return
    setBuilding(true)
    revokePdfUrl()
    try {
      const firstName = selected.first_name || 'there'
      const joinFmt = formatJoinDate(selected.start_date)

      const { data: fullMember } = await supabase
        .from('members')
        .select('*')
        .eq('member_id', selected.member_id)
        .maybeSingle()
      const memberForPdf = fullMember || selected

      let attachB64 = null
      let blobUrl = null
      if (hasApprovedHoursEntries) {
        const { pdfBlob, pdfBase64 } = await generateVolunteerPDF(memberForPdf, approvedEntries, supabase)
        attachB64 = pdfBase64
        blobUrl = URL.createObjectURL(pdfBlob)
        setPdfAttachBase64(pdfBase64)
        setPdfPreviewUrl(blobUrl)
      }

      const workHtml = composeHonorableWorkSectionHtml({
        stats,
        manualWorkNotes,
        willAttachVolunteerPdf: !!attachB64,
      })
      const meetingHtml = buildMeetingLineHtml(meetingNote)

      const { subject, html } = buildHonorableExitEmailHtml({
        firstName,
        variant: 'member_initiated',
        joinDateFormatted: joinFmt,
        workSectionHtml: workHtml,
        meetingLineHtml: meetingHtml,
      })
      setPreviewSubject(subject)
      setPreviewHtml(html)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Could not build preview.')
    } finally {
      setBuilding(false)
    }
  }

  const handleSend = async () => {
    if (!selected || !previewHtml || !previewSubject) {
      alert('Build a preview first.')
      return
    }
    if (!honorableSendOk) {
      alert('Add a description of the member’s work (or ensure documented hours/bills exist) before sending.')
      return
    }
    setSending(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert('Please sign in again.')
        return
      }
      const base = import.meta.env.VITE_SUPABASE_URL
      if (!base) {
        alert('Missing VITE_SUPABASE_URL.')
        return
      }

      const sanitized = `${selected.first_name || ''}_${selected.last_name || ''}`
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .replace(/\s+/g, '_')
      const attachments = pdfAttachBase64
        ? [
            {
              filename: `SPAN_Volunteer_Verification_${sanitized || 'member'}.pdf`,
              content: pdfAttachBase64,
            },
          ]
        : []

      const resp = await fetch(`${base.replace(/\/$/, '')}/functions/v1/send-member-letter-email`, {
        method: 'POST',
        headers: supabaseInvokeHeaders(session.access_token),
        body: JSON.stringify({
          member_id: selected.member_id,
          subject: previewSubject,
          html: previewHtml,
          attachments,
          mark_honorable_letter_sent: true,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        alert(data.error || 'Send failed.')
        return
      }
      alert(`Email sent to ${data.to || 'member'}.`)
      onClose()
    } catch (err) {
      alert(err.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  const copyPlain = async () => {
    if (!selected) return
    const fullName = `${selected.first_name} ${selected.last_name}`.trim()
    let text = buildHonorableResignationLetter({
      fullName,
      joinDate: selected.start_date,
      volunteerHoursDisplay: stats?.volunteerHoursDisplay,
      billsImpactedCount: stats?.billsImpactedCount ?? 0,
      meetingDateNote: meetingNote.trim(),
    })
    if (manualWorkNotes.trim()) {
      text += `\n\nAdditional context:\n${manualWorkNotes.trim()}`
    }
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      alert('Could not copy.')
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1080 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Honorable exit email</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                Thank-you / recognition email to the member. Preview matches what is sent (Resend → personal email). Approved
                volunteer hours attach the same verification PDF as the standard hours letter.
              </p>

              <div className="mb-3">
                <label className="form-label small mb-0">Member</label>
                <select
                  className="form-select form-select-sm"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {(membersList || []).map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.first_name} {m.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label small">Contribution &amp; work (editable)</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={manualWorkNotes}
                  onChange={(e) => setManualWorkNotes(e.target.value)}
                  placeholder={
                    hasDocumentedWork
                      ? 'Optional: add nuance, projects, or context beyond hours and bills.'
                      : 'Required if there are no documented volunteer hours or bills: describe their work.'
                  }
                />
              </div>
              <div className="mb-2">
                <label className="form-label small">Meeting note (optional)</label>
                <input
                  className="form-control form-control-sm"
                  value={meetingNote}
                  onChange={(e) => setMeetingNote(e.target.value)}
                  placeholder="e.g. exit meeting March 12, 2026"
                />
              </div>
              {stats && (
                <p className="small text-muted mb-2">
                  Records: {stats.volunteerHoursDisplay} approved hours · {stats.billsImpactedCount} bill(s) tracked
                  {hasApprovedHoursEntries
                    ? ` · ${approvedEntries.length} approved entr${approvedEntries.length === 1 ? 'y' : 'ies'} (PDF can attach)`
                    : ' · no approved hour entries (no PDF attachment)'}
                </p>
              )}
              {!honorableSendOk && (
                <div className="alert alert-warning py-2 small mb-2">
                  Add a work description above, or ensure the member has documented hours or bills in the system.
                </div>
              )}

              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  disabled={!memberId || building}
                  onClick={handleBuildPreview}
                >
                  {building ? 'Building…' : 'Build email preview'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  disabled={!previewHtml || sending || !honorableSendOk}
                  onClick={handleSend}
                >
                  {sending ? 'Sending…' : 'Send email to member'}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={copyPlain}>
                  Copy plain-text version
                </button>
              </div>

              {previewHtml && (
                <div className="border rounded overflow-hidden mb-2" style={{ minHeight: '280px' }}>
                  <div className="px-2 py-1 bg-light border-bottom small">
                    <strong>Subject:</strong> {previewSubject}
                  </div>
                  <iframe title="Email preview" srcDoc={previewHtml} className="w-100 border-0" style={{ height: '360px' }} />
                </div>
              )}

              {pdfPreviewUrl && (
                <div className="border rounded overflow-hidden">
                  <div className="px-2 py-1 bg-light border-bottom small">
                    Attachment preview (volunteer verification PDF)
                  </div>
                  <iframe title="PDF attachment" src={pdfPreviewUrl} className="w-100 border-0" style={{ height: '320px' }} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1075 }} />
    </>
  )
}

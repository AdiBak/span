import React, { useEffect, useMemo, useState } from 'react'
import { buildPolicyViolationEmailHtml } from '../../lib/memberLetterEmailTemplates'
import { supabaseInvokeHeaders } from './supabaseInvoke'

const JOEL_SIGNER = {
  name: 'Joel Blessan',
  email: 'joel.blessan@spanationwide.org',
  title: 'Executive Director | Students for Patient Advocacy Nationwide',
}

function offenceLabel(n) {
  if (n === 1) return '1st offence'
  if (n === 2) return '2nd offence'
  if (n === 3) return '3rd offence'
  return `${n}th offence`
}

/**
 * Exec-only: policy-violation notice for an HR report subject (SPAN member).
 * Offence number is locked to that member’s current strike count. Sender is Joel.
 */
export default function PolicyViolationEmailModal({
  open,
  onClose,
  supabase,
  membersList,
  memberStrikeRows = [],
  initialMemberId = '',
  initialNature = '',
}) {
  const [nature, setNature] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [building, setBuilding] = useState(false)
  const [sending, setSending] = useState(false)

  const memberId = initialMemberId ? String(initialMemberId) : ''
  const selected = (membersList || []).find((m) => String(m.member_id) === memberId)

  const strikeCount = useMemo(() => {
    if (!memberId) return 0
    return (memberStrikeRows || []).filter((s) => String(s.member_id) === memberId).length
  }, [memberId, memberStrikeRows])

  const offenceNumber = strikeCount >= 1 ? Math.min(3, strikeCount) : 0

  useEffect(() => {
    if (!open) return
    setNature(initialNature || '')
    setPreviewSubject('')
    setPreviewHtml('')
  }, [open, initialMemberId, initialNature])

  const handleBuildPreview = () => {
    if (!selected) {
      alert('This report is not linked to a SPAN member.')
      return
    }
    if (offenceNumber < 1) {
      alert('Record a strike for this member first — offence number comes from their strike count.')
      return
    }
    if (!String(nature || '').trim()) {
      alert('Enter the nature of the complaint / violation.')
      return
    }
    setBuilding(true)
    try {
      const { subject, html } = buildPolicyViolationEmailHtml({
        firstName: selected.first_name || 'there',
        offenceNumber,
        natureOfComplaint: nature.trim(),
        signerName: JOEL_SIGNER.name,
        signerEmail: JOEL_SIGNER.email,
        signerTitle: JOEL_SIGNER.title,
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
    if (offenceNumber < 1) {
      alert('Record a strike for this member first.')
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

      const resp = await fetch(`${base.replace(/\/$/, '')}/functions/v1/send-member-letter-email`, {
        method: 'POST',
        headers: supabaseInvokeHeaders(session.access_token),
        body: JSON.stringify({
          member_id: selected.member_id,
          subject: previewSubject,
          html: previewHtml,
          attachments: [],
          cc_execs: true,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        alert(data.error || 'Send failed.')
        return
      }
      const ccNote =
        Array.isArray(data.cc) && data.cc.length
          ? ` Execs CC’d: ${data.cc.join(', ')}.`
          : ' Execs were CC’d when available.'
      alert(`Policy notice sent to ${data.to || 'member'}.${ccNote}`)
      onClose()
    } catch (err) {
      alert(err.message || 'Send failed.')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  const memberName = selected
    ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim()
    : '—'

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
              <h5 className="modal-title">HR report — policy violation email</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="text-muted small mb-3">
                Sends the policy notice to the member (signed by Joel), with Executive Directors CC&apos;d
                (role = Executive Director only). This is the only email for the filing — nothing is sent when
                the report is first submitted.
              </p>

              <div className="row g-2 mb-3">
                <div className="col-md-4">
                  <label className="form-label small mb-0">Member</label>
                  <input className="form-control form-control-sm" value={memberName} readOnly disabled />
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-0">Offence (from strike count)</label>
                  <input
                    className="form-control form-control-sm"
                    value={
                      offenceNumber >= 1
                        ? `${offenceLabel(offenceNumber)} · ${strikeCount} strike${strikeCount === 1 ? '' : 's'} on record`
                        : 'No strikes on record yet'
                    }
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-0">Sender</label>
                  <input
                    className="form-control form-control-sm"
                    value={`${JOEL_SIGNER.name} <${JOEL_SIGNER.email}>`}
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small mb-0">Nature of complaint (editable)</label>
                  <input
                    className="form-control form-control-sm"
                    value={nature}
                    onChange={(e) => {
                      setNature(e.target.value)
                      setPreviewSubject('')
                      setPreviewHtml('')
                    }}
                    placeholder="e.g. failure to communicate and participate in SPAN activities"
                  />
                </div>
              </div>

              {offenceNumber < 1 && (
                <div className="alert alert-warning py-2 small">
                  Record a strike for this member (from this HR report or Member Management) before sending.
                  Offence wording is based on their strike count.
                </div>
              )}

              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-dark btn-sm"
                  disabled={!selected || offenceNumber < 1 || building}
                  onClick={handleBuildPreview}
                >
                  {building ? 'Building…' : 'Build email preview'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-dark btn-sm"
                  disabled={!previewHtml || sending || offenceNumber < 1}
                  onClick={handleSend}
                >
                  {sending ? 'Sending…' : 'Send to member (CC Executive Directors)'}
                </button>
              </div>

              {previewHtml && (
                <div className="border rounded overflow-hidden mb-2" style={{ minHeight: '280px' }}>
                  <div className="px-2 py-1 bg-light border-bottom small">
                    <label className="form-label small mb-0 me-2">Subject</label>
                    <input
                      className="form-control form-control-sm d-inline-block"
                      style={{ maxWidth: '28rem' }}
                      value={previewSubject}
                      onChange={(e) => setPreviewSubject(e.target.value)}
                    />
                  </div>
                  <iframe
                    title="Email preview"
                    srcDoc={previewHtml}
                    className="w-100 border-0"
                    style={{ height: '420px' }}
                  />
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

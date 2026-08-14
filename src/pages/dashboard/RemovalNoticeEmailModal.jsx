import React, { useState, useEffect } from 'react'
import { buildDishonorableRemovalEmailHtml } from '../../lib/memberLetterEmailTemplates'
import { buildDishonorableRemovalLetter } from '../../lib/memberLetters'
import { supabaseInvokeHeaders } from './supabaseInvoke'

export default function RemovalNoticeEmailModal({
  open,
  onClose,
  supabase,
  membersList,
  onSent,
}) {
  const [memberId, setMemberId] = useState('')
  const [removalDateNote, setRemovalDateNote] = useState('')
  const [removeFromDirectory, setRemoveFromDirectory] = useState(true)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [building, setBuilding] = useState(false)
  const [sending, setSending] = useState(false)

  const selected = (membersList || []).find((m) => String(m.member_id) === String(memberId))

  useEffect(() => {
    if (!open) return
    setMemberId('')
    setRemovalDateNote('')
    setRemoveFromDirectory(true)
    setPreviewSubject('')
    setPreviewHtml('')
  }, [open])

  useEffect(() => {
    if (!memberId) return
    setRemovalDateNote('')
    setPreviewSubject('')
    setPreviewHtml('')
  }, [memberId])

  const handleBuildPreview = async () => {
    if (!selected) return
    setBuilding(true)
    try {
      const firstName = selected.first_name || 'there'
      const { subject, html } = buildDishonorableRemovalEmailHtml({
        firstName,
        effectiveDateDisplay: removalDateNote.trim() || new Date().toLocaleDateString(),
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
          mark_removal_letter_sent: true,
          deactivate_directory: removeFromDirectory,
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        alert(data.error || 'Send failed.')
        return
      }
      const bits = [`Email sent to ${data.to || 'member'}.`]
      if (data.directory_deactivated) bits.push('Removed from the public Members directory.')
      if (data.removal_proposal_updated) bits.push('Recorded as removal letter sent.')
      alert(bits.join(' '))
      if (typeof onSent === 'function') await onSent()
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
    const text = buildDishonorableRemovalLetter({
      fullName,
      removalDateNote: removalDateNote.trim(),
    })
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      alert('Could not copy.')
    }
  }

  if (!open) return null

  const stillOnDirectory = selected && selected.active !== false

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
            <div className="modal-header border-danger-subtle">
              <h5 className="modal-title text-danger">Membership ended / removal notice</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                Formal notice that SPAN membership has ended. Sending records the letter and, by default,
                removes the member from the public directory (same as honorable-letter tracking for
                resignations).
              </p>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
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
                        {m.active === false ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small mb-0">Effective date (optional)</label>
                  <input
                    className="form-control form-control-sm"
                    value={removalDateNote}
                    onChange={(e) => setRemovalDateNote(e.target.value)}
                    placeholder="Defaults to today"
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="removalDeactivateDirectory"
                      checked={removeFromDirectory}
                      onChange={(e) => setRemoveFromDirectory(e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="removalDeactivateDirectory">
                      After send, remove from public Members directory
                      {stillOnDirectory ? '' : ' (already inactive)'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={!memberId || building}
                  onClick={handleBuildPreview}
                >
                  {building ? 'Building…' : 'Build email preview'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  disabled={!previewHtml || sending}
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
                  <iframe
                    title="Email preview"
                    srcDoc={previewHtml}
                    className="w-100 border-0"
                    style={{ height: '360px' }}
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

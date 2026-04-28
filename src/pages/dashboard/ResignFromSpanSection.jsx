import React, { useState } from 'react'

export default function ResignFromSpanSection({
  sectionOrder,
  viewAsData,
  activeResignation,
  onSubmitResignation,
  onWithdraw,
  submitting,
}) {
  const [message, setMessage] = useState('')
  const [sure, setSure] = useState(false)

  if (viewAsData) return null

  const blocked = activeResignation && activeResignation.status !== 'withdrawn'

  const statusLabel = {
    requested: 'Submitted — notifying directors',
    meeting_scheduled: 'Meeting scheduled',
    met: 'Meeting held — leadership will follow up',
    honorable_letter_sent: 'Honorable letter sent',
    directors_contacted: 'Directors notified (legacy)',
    completed: 'Completed (legacy)',
    withdrawn: 'Withdrawn',
  }

  const canWithdraw =
    activeResignation &&
    activeResignation.status !== 'withdrawn' &&
    activeResignation.status !== 'honorable_letter_sent' &&
    activeResignation.status !== 'completed'

  return (
    <section className="mt-5 border-top pt-4" style={{ order: sectionOrder }}>
      <h3 className="h5 text-muted">Resign from SPAN</h3>
      <div className="card mt-3 border-secondary shadow-sm">
        <div className="card-body">
          <p className="small text-muted mb-3">
            If you intend to leave SPAN, submit a short message below. We will email all directors so someone can schedule an exit
            conversation with you before your resignation is finalized. This is not immediate automated removal.
          </p>
          {blocked ? (
            <div>
              <p className="fw-semibold mb-2">
                Status:{' '}
                <span className="badge bg-secondary">
                  {statusLabel[activeResignation.status] || activeResignation.status}
                </span>
              </p>
              {activeResignation.message && (
                <p className="small bg-light border rounded p-2 mb-2">{activeResignation.message}</p>
              )}
              {canWithdraw && onWithdraw && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onWithdraw}>
                  Withdraw resignation request
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3">
                <label className="form-label small">Message to directors</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Brief context or timing preferences for an exit conversation."
                />
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="resignSure"
                  checked={sure}
                  onChange={(e) => setSure(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="resignSure">
                  I understand this notifies SPAN directors and begins the resignation process (not instant removal).
                </label>
              </div>
              <button
                type="button"
                className="btn btn-outline-danger"
                disabled={!sure || submitting || !message.trim()}
                onClick={() => onSubmitResignation(message.trim())}
              >
                {submitting ? 'Sending…' : 'Submit resignation request'}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

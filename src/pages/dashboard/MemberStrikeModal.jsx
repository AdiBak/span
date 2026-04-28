import React, { useState } from 'react'

export default function MemberStrikeModal({
  open,
  onClose,
  memberRow,
  strikes,
  strikeLimit,
  atLimit,
  formatDateLong,
  onAddManualStrike,
  onDeleteStrike,
  onOpenRemoval,
}) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  if (!open || !memberRow) return null

  const handleAdd = async () => {
    setBusy(true)
    try {
      await onAddManualStrike(notes.trim() || null)
      setNotes('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1060 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Strikes — {memberRow.first_name} {memberRow.last_name}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <span className="badge bg-dark fs-6">
                  {strikes.length} / {strikeLimit} strikes
                </span>
                {atLimit && (
                  <span className="badge bg-danger">At or over limit — removal may be appropriate</span>
                )}
              </div>
              <p className="text-muted small">
                Regular members: 3 strikes maximum. Leadership (executive-permission set): 2 strikes maximum.
              </p>
              <div className="mb-3">
                <label className="form-label">Add manual strike (optional notes)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Brief context (stored with this strike)"
                />
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm mt-2"
                  disabled={busy}
                  onClick={handleAdd}
                >
                  Record strike
                </button>
              </div>
              {strikes.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Source</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {strikes.map((s) => (
                        <tr key={s.strike_id}>
                          <td>{formatDateLong(s.created_at)}</td>
                          <td>
                            {s.source === 'hr_report' ? (
                              <span className="badge bg-secondary">HR report</span>
                            ) : (
                              <span className="badge bg-light text-dark border">Manual</span>
                            )}
                          </td>
                          <td className="small text-muted">{s.notes || '—'}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger p-0"
                              onClick={() => onDeleteStrike(s.strike_id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No strikes recorded.</p>
              )}
              {atLimit && onOpenRemoval && (
                <div className="border-top pt-3 mt-3">
                  <button type="button" className="btn btn-danger" onClick={onOpenRemoval}>
                    Begin removal confirmation (two executives)
                  </button>
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
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
    </>
  )
}

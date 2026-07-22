import React from 'react'

export default function StrikeDetailModal({
  open,
  strike,
  memberName,
  recorderName,
  formatDateLong,
  onClose,
  onDelete,
}) {
  if (!open || !strike) return null

  const src = strike.source === 'hr_report' ? 'HR report' : 'Manual'

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Strike detail</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              <dl className="row mb-0 small">
                <dt className="col-sm-4 text-muted">Member</dt>
                <dd className="col-sm-8">{memberName}</dd>
                <dt className="col-sm-4 text-muted">Recorded</dt>
                <dd className="col-sm-8">{formatDateLong(strike.created_at)}</dd>
                <dt className="col-sm-4 text-muted">Source</dt>
                <dd className="col-sm-8">
                  <span className={`badge ${strike.source === 'hr_report' ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                    {src}
                  </span>
                </dd>
                <dt className="col-sm-4 text-muted">Recorded by</dt>
                <dd className="col-sm-8">{recorderName || '—'}</dd>
                <dt className="col-sm-4 text-muted align-top pt-1">Notes</dt>
                <dd className="col-sm-8">
                  <div className="border rounded bg-light p-3 small" style={{ whiteSpace: 'pre-wrap' }}>
                    {strike.notes?.trim() ? strike.notes : <span className="text-muted fst-italic">None</span>}
                  </div>
                </dd>
              </dl>
            </div>
            <div className="modal-footer">
              {typeof onDelete === 'function' && (
                <button
                  type="button"
                  className="btn btn-outline-danger me-auto"
                  onClick={async () => {
                    const ok = await onDelete(strike.strike_id)
                    if (ok !== false) onClose()
                  }}
                >
                  <i className="bi bi-trash me-1" />
                  Delete strike
                </button>
              )}
              <button type="button" className="btn btn-dark" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} />
    </>
  )
}

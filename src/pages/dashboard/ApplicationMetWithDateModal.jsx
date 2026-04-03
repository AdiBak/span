import React from 'react'

export default function ApplicationMetWithDateModal({
  open,
  application,
  metWithDate,
  setMetWithDate,
  onClose,
  onConfirm,
  /** Preserves dashboard quirk: backdrop ignored while rejection email is sending */
  disableBackdropClose = false,
}) {
  if (!open || !application) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show') && !disableBackdropClose) {
            onClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Met with date</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted small mb-3">
                Choose the date this applicant was met with. This will set the status to <strong>Met with</strong>.
              </p>
              <label className="form-label" htmlFor="metWithDateInput">
                Date
              </label>
              <input
                id="metWithDateInput"
                type="date"
                className="form-control"
                value={metWithDate}
                onChange={(e) => setMetWithDate(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onConfirm()}>
                Save &amp; mark Met with
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
    </>
  )
}

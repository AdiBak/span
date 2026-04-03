import React from 'react'

export default function SpanCardPasswordModal({
  open,
  qrPassword,
  setQrPassword,
  qrPasswordError,
  onClose,
  onConfirm,
}) {
  if (!open) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1055 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) {
            onClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Password</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              <p>Confirm your password to generate your SPANCard:</p>
              <input
                type="password"
                className="form-control"
                placeholder="Your password"
                value={qrPassword}
                onChange={(e) => setQrPassword(e.target.value)}
              />
              {qrPasswordError && <div className="text-danger mt-2">{qrPasswordError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

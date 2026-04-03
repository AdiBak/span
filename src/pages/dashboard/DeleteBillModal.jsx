import React from 'react'

/**
 * Confirm delete bill (dashboard Bill Management).
 */
export default function DeleteBillModal({ open, bill, billError, onClose, onConfirm }) {
  if (!open || !bill) return null

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
              <h5 className="modal-title text-danger">Delete Bill</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete{' '}
                <strong>
                  {bill.state} {bill.name}
                </strong>
                ?
              </p>
              <p className="text-muted small mb-0">
                This will also delete the associated PDF file. This action cannot be undone.
              </p>
              {billError && <div className="text-danger mt-2">{billError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={onConfirm}>
                Delete Bill
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

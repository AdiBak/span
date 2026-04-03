import React from 'react'

export default function DeleteApplicationConfirmModal({ open, application, onClose, onConfirm }) {
  if (!open || !application) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1060 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) {
            onClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">Delete Application</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete the application from <strong>{application.full_name}</strong>?
              </p>
              <p className="text-muted small mb-0">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={() => onConfirm()}>
                Delete Application
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
    </>
  )
}

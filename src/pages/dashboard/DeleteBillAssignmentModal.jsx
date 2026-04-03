import React from 'react'
import { billAssignmentDisplayTitle } from './billAssignments'

export default function DeleteBillAssignmentModal({
  open,
  assignment,
  error,
  saving,
  onClose,
  onConfirm,
}) {
  if (!open || !assignment) return null

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
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">Delete assignment</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="mb-0">
                Delete this assignment for <strong>{billAssignmentDisplayTitle(assignment)}</strong>? Listed members will no
                longer see it. This cannot be undone.
              </p>
              {error && <div className="text-danger small mt-2">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" disabled={saving} onClick={onConfirm}>
                {saving ? 'Deleting…' : 'Delete assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
    </>
  )
}

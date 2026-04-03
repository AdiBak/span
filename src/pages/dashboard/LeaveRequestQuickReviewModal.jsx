import React from 'react'

export default function LeaveRequestQuickReviewModal({
  open,
  request,
  requestReviewAction,
  requestReviewNotes,
  setRequestReviewNotes,
  onClose,
  onConfirm,
}) {
  if (!open || !request) return null

  const close = () => {
    onClose()
  }

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1055 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) {
            close()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {requestReviewAction === 'approve' ? 'Approve' : 'Decline'} request
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  onClose()
                }}
              ></button>
            </div>
            <div className="modal-body">
              <p className="mb-2">
                <strong>Member:</strong>{' '}
                {request.member ? `${request.member.first_name} ${request.member.last_name}` : 'Unknown'}
              </p>
              <p className="mb-2">
                <strong>Type:</strong> <span className="text-capitalize">{request.type}</span>
              </p>
              <p className="mb-2">
                <strong>Reason:</strong> {request.reason}
              </p>
              <div className="mb-3">
                <label className="form-label">Review notes (optional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={requestReviewNotes}
                  onChange={(e) => setRequestReviewNotes(e.target.value)}
                  placeholder="e.g. reason for decline or any follow-up"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button
                type="button"
                className={requestReviewAction === 'approve' ? 'btn btn-success' : 'btn btn-danger'}
                onClick={onConfirm}
              >
                {requestReviewAction === 'approve' ? 'Approve' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

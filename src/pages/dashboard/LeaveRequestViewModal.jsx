import React from 'react'

export default function LeaveRequestViewModal({
  open,
  request,
  onClose,
  formatDate,
  formatDateLong,
  viewAsData,
  showExecReviewPanel,
  requestReviewNotes,
  setRequestReviewNotes,
  onReviewFromView,
  onStatusChangeFromView,
  onDeleteFromView,
}) {
  if (!open || !request) return null

  const close = () => onClose()

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1056 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) {
            close()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Leave/Extension Request</h5>
              <button type="button" className="btn-close" onClick={() => close()}></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="mb-3">
                <strong>Member:</strong>
                <p className="mb-0 mt-1">
                  {request.member ? `${request.member.first_name} ${request.member.last_name}` : 'Unknown'}
                  {request.member?.email && (
                    <span className="text-muted d-block small">{request.member.email}</span>
                  )}
                </p>
              </div>
              <div className="mb-3">
                <strong>Type:</strong>
                <p className="mb-0 mt-1">
                  <span className="badge bg-secondary text-capitalize">{request.type}</span>
                </p>
              </div>
              <div className="mb-3">
                <strong>Reason:</strong>
                <p className="mb-0 mt-1">{request.reason}</p>
              </div>
              <div className="mb-3">
                <strong>Details:</strong>
                <p className="mb-0 mt-1">
                  {request.type === 'leave' && (request.leave_start || request.leave_end)
                    ? `${request.leave_start ? formatDate(request.leave_start) : '—'} to ${
                        request.leave_end ? formatDate(request.leave_end) : '—'
                      }`
                    : request.type === 'extension' && (request.project_name || request.requested_by_date)
                      ? [request.project_name, request.requested_by_date ? formatDate(request.requested_by_date) : null]
                          .filter(Boolean)
                          .join(' · ')
                      : '—'}
                </p>
              </div>
              <div className="mb-3">
                <strong>Status:</strong>
                <p className="mb-0 mt-1">
                  <span
                    className={`badge ${
                      request.status === 'approved'
                        ? 'bg-success'
                        : request.status === 'declined'
                          ? 'bg-danger'
                          : 'bg-warning text-dark'
                    }`}
                  >
                    {request.status}
                  </span>
                </p>
              </div>
              <div className="mb-3">
                <strong>Submitted:</strong>
                <p className="mb-0 mt-1">{formatDateLong(request.created_at)}</p>
              </div>
              {(request.reviewed_by_member || request.reviewed_at) && (
                <div className="mb-3">
                  <strong>Reviewed by:</strong>
                  <p className="mb-0 mt-1">
                    {request.reviewed_by_member
                      ? `${request.reviewed_by_member.first_name} ${request.reviewed_by_member.last_name}`
                      : 'Unknown'}
                    {request.reviewed_at && (
                      <span className="text-muted d-block small">{formatDateLong(request.reviewed_at)}</span>
                    )}
                  </p>
                </div>
              )}
              {request.review_notes && request.status !== 'pending' && (
                <div className="mb-3">
                  <strong>Review notes:</strong>
                  <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                    {request.review_notes}
                  </p>
                </div>
              )}

              {!viewAsData && showExecReviewPanel && (
                <div className="mt-4 pt-3 border-top">
                  <label className="form-label">Review notes (optional)</label>
                  <textarea
                    className="form-control mb-3"
                    rows="3"
                    value={requestReviewNotes}
                    onChange={(e) => setRequestReviewNotes(e.target.value)}
                    placeholder="Add comments for the member (e.g. reason for decline or follow-up)"
                  />
                  {request.status === 'pending' ? (
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-success" onClick={() => onReviewFromView('approve')}>
                        Approve
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => onReviewFromView('decline')}>
                        Decline
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="small text-muted mb-2">Change status:</p>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${request.status === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                          onClick={() => onStatusChangeFromView('pending')}
                        >
                          Set to Pending
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${request.status === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                          onClick={() => onStatusChangeFromView('approved')}
                        >
                          Set to Approved
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${request.status === 'declined' ? 'btn-danger' : 'btn-outline-danger'}`}
                          onClick={() => onStatusChangeFromView('declined')}
                        >
                          Set to Declined
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!viewAsData && showExecReviewPanel && typeof onDeleteFromView === 'function' && (
                <button type="button" className="btn btn-outline-danger me-auto" onClick={() => onDeleteFromView()}>
                  Delete request
                </button>
              )}
              <button type="button" className="btn btn-outline-dark" onClick={() => close()}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
    </>
  )
}

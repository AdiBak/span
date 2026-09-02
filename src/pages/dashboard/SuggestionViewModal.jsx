import React from 'react'

export default function SuggestionViewModal({
  open,
  suggestion,
  onClose,
  formatDateLong,
  showMemberBlock,
  showExecReview,
  suggestionReviewNotes,
  setSuggestionReviewNotes,
  onSaveComment,
  onStatusChange,
}) {
  if (!open || !suggestion) return null

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
              <h5 className="modal-title">Suggestion</h5>
              <button type="button" className="btn-close" onClick={() => close()}></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {showMemberBlock && (
                <div className="mb-3">
                  <strong>{suggestion._source === 'public_bill' ? 'Submitter (public):' : 'Member:'}</strong>
                  <p className="mb-0 mt-1">
                    {suggestion._source === 'public_bill' ? (
                      <>
                        {suggestion.submitter_name || '—'}
                        {suggestion.submitter_email && (
                          <span className="text-muted d-block small">{suggestion.submitter_email}</span>
                        )}
                      </>
                    ) : suggestion.member ? (
                      <>
                        {`${suggestion.member.first_name} ${suggestion.member.last_name}`}
                        {suggestion.member.email && (
                          <span className="text-muted d-block small">{suggestion.member.email}</span>
                        )}
                      </>
                    ) : (
                      'Unknown'
                    )}
                  </p>
                </div>
              )}
              <div className="mb-3">
                <strong>Type:</strong>
                <p className="mb-0 mt-1">
                  {suggestion._source === 'public_bill' ? (
                    <span className="d-inline-flex flex-wrap gap-1 align-items-center">
                      <span className="badge bg-secondary">Bill / issue</span>
                      <span className="badge bg-info text-dark">Public</span>
                    </span>
                  ) : (
                    <span className="badge bg-secondary">
                      {suggestion.type === 'bill_idea'
                        ? 'Bill idea'
                        : suggestion.type === 'general_interest'
                          ? 'General interest'
                          : 'Web / feature suggestion'}
                    </span>
                  )}
                </p>
              </div>
              {suggestion._source === 'public_bill' && suggestion.state && (
                <div className="mb-3">
                  <strong>State:</strong>
                  <p className="mb-0 mt-1">{suggestion.state}</p>
                </div>
              )}
              <div className="mb-3">
                <strong>Title:</strong>
                <p className="mb-0 mt-1">{suggestion.title}</p>
              </div>
              {suggestion.description && (
                <div className="mb-3">
                  <strong>Description:</strong>
                  <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                    {suggestion.description}
                  </p>
                </div>
              )}
              <div className="mb-3">
                <strong>Status:</strong>
                <p className="mb-0 mt-1">
                  <span
                    className={`badge ${
                      suggestion.status === 'pending'
                        ? 'bg-warning text-dark'
                        : suggestion.status === 'under_review'
                          ? 'bg-info'
                          : suggestion.status === 'approved'
                            ? 'bg-success'
                            : 'bg-danger'
                    }`}
                  >
                    {suggestion.status.replace('_', ' ')}
                  </span>
                </p>
              </div>
              <div className="mb-3">
                <strong>Submitted:</strong>
                <p className="mb-0 mt-1">{formatDateLong(suggestion.created_at)}</p>
              </div>
              {(suggestion.reviewed_by_member || suggestion.reviewed_at) && (
                <div className="mb-3">
                  <strong>Reviewed by:</strong>
                  <p className="mb-0 mt-1">
                    {suggestion.reviewed_by_member
                      ? `${suggestion.reviewed_by_member.first_name} ${suggestion.reviewed_by_member.last_name}`
                      : 'Unknown'}
                    {suggestion.reviewed_at && (
                      <span className="text-muted d-block small">{formatDateLong(suggestion.reviewed_at)}</span>
                    )}
                  </p>
                </div>
              )}
              {(suggestion.review_notes || (!showExecReview && suggestion.status !== 'pending')) && (
                <div className="mb-3">
                  <strong>{showExecReview ? 'Review notes:' : 'Response from SPAN:'}</strong>
                  {suggestion.review_notes ? (
                    <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                      {suggestion.review_notes}
                    </p>
                  ) : (
                    <p className="mb-0 mt-1 text-muted">No comment yet.</p>
                  )}
                </div>
              )}

              {showExecReview && (
                <div className="mt-4 pt-3 border-top">
                  <label className="form-label">Review notes (visible to the member)</label>
                  <textarea
                    className="form-control mb-3"
                    rows="3"
                    value={suggestionReviewNotes}
                    onChange={(e) => setSuggestionReviewNotes(e.target.value)}
                    placeholder="Leave a comment for the member..."
                  />
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <button type="button" className="btn btn-sm btn-dark" onClick={() => onSaveComment()}>
                      Save comment
                    </button>
                  </div>
                  <p className="small text-muted mb-2">Change status:</p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm ${suggestion.status === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => onStatusChange('pending')}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        suggestion.status === 'under_review' ? 'btn-info' : 'btn-outline-info'
                      }`}
                      onClick={() => onStatusChange('under_review')}
                    >
                      Under review
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${suggestion.status === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => onStatusChange('approved')}
                    >
                      Approved
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${suggestion.status === 'declined' ? 'btn-danger' : 'btn-outline-danger'}`}
                      onClick={() => onStatusChange('declined')}
                    >
                      Declined
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
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

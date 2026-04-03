import React from 'react'

export default function ApplicationRejectConfirmModal({
  open,
  application,
  sendRejectionEmail,
  setSendRejectionEmail,
  rejectionEmailReason,
  setRejectionEmailReason,
  rejectionEmailPreview,
  rejectionEmailPreviewLoading,
  rejectionEmailSending,
  onBackdropClose,
  onHeaderClose,
  onCancel,
  onConfirm,
}) {
  if (!open || !application) return null

  const emailTrimmed = (application.email || '').trim()
  const previewBlocked =
    sendRejectionEmail &&
    !!emailTrimmed &&
    (rejectionEmailPreviewLoading || !rejectionEmailPreview)

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show') && !rejectionEmailSending) {
            onBackdropClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">Reject Application</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHeaderClose}
                disabled={rejectionEmailSending}
              ></button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to reject the application from <strong>{application.full_name}</strong>?
              </p>
              <div className="form-check mt-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="sendRejectionEmailCheck"
                  checked={sendRejectionEmail}
                  onChange={(e) => setSendRejectionEmail(e.target.checked)}
                  disabled={rejectionEmailSending}
                />
                <label className="form-check-label" htmlFor="sendRejectionEmailCheck">
                  Send rejection email to <strong>{application.email || '—'}</strong>
                </label>
              </div>
              {sendRejectionEmail && (
                <div className="mt-3">
                  <label className="form-label small text-muted" htmlFor="rejectionEmailReasonInput">
                    Rejection reason (optional, included in email)
                  </label>
                  <textarea
                    id="rejectionEmailReasonInput"
                    className="form-control"
                    rows="3"
                    value={rejectionEmailReason}
                    onChange={(e) => setRejectionEmailReason(e.target.value)}
                    placeholder="Add a short reason the applicant can understand (optional)..."
                    disabled={rejectionEmailSending}
                  />
                </div>
              )}
              {sendRejectionEmail && emailTrimmed && (
                <div className="mt-3">
                  <p className="text-muted small mb-2">
                    Preview the message below. When you confirm, the application is marked <strong>Rejected</strong> and
                    this email is sent via Resend.
                  </p>
                  {rejectionEmailPreviewLoading && (
                    <div className="text-center py-4 text-muted">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading preview…</span>
                      </div>
                    </div>
                  )}
                  {!rejectionEmailPreviewLoading && rejectionEmailPreview && (
                    <>
                      <dl className="row small mb-3">
                        <dt className="col-sm-2">From</dt>
                        <dd className="col-sm-10 text-break">{rejectionEmailPreview.from}</dd>
                        <dt className="col-sm-2">To</dt>
                        <dd className="col-sm-10 text-break">{rejectionEmailPreview.to?.join(', ')}</dd>
                        <dt className="col-sm-2">Cc</dt>
                        <dd className="col-sm-10 text-break">{rejectionEmailPreview.cc?.join(', ') || '—'}</dd>
                        <dt className="col-sm-2">Subject</dt>
                        <dd className="col-sm-10 text-break">{rejectionEmailPreview.subject}</dd>
                      </dl>
                      <label className="form-label small text-muted">Preview</label>
                      <div
                        className="border rounded bg-white overflow-auto"
                        style={{ maxHeight: 'min(50vh, 420px)', backgroundColor: '#fff' }}
                        dangerouslySetInnerHTML={{ __html: rejectionEmailPreview.html }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={onCancel}
                disabled={rejectionEmailSending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onConfirm}
                disabled={rejectionEmailSending || previewBlocked}
              >
                {rejectionEmailSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Sending email...
                  </>
                ) : (
                  <>Reject{sendRejectionEmail ? ' & Send Email' : ''}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
    </>
  )
}

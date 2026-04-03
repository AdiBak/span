import React from 'react'

export default function ApplicationInviteEmailPreviewModal({
  open,
  application,
  inviteEmailPreview,
  inviteEmailPreviewLoading,
  inviteEmailSending,
  onBackdropClose,
  onHeaderClose,
  onCancel,
  onSend,
}) {
  if (!open || !application) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1075 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show') && !inviteEmailSending && !inviteEmailPreviewLoading) {
            onBackdropClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-envelope-check me-2"></i>
                Send interview invitation
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHeaderClose}
                disabled={inviteEmailSending || inviteEmailPreviewLoading}
              ></button>
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                Review the message below. When you confirm, the email is sent via Resend and the application is set to{' '}
                <strong>Invited</strong>.
              </p>
              {inviteEmailPreviewLoading && (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading preview…</span>
                  </div>
                </div>
              )}
              {!inviteEmailPreviewLoading && inviteEmailPreview && (
                <>
                  <dl className="row small mb-3">
                    <dt className="col-sm-2">From</dt>
                    <dd className="col-sm-10 text-break">{inviteEmailPreview.from}</dd>
                    <dt className="col-sm-2">To</dt>
                    <dd className="col-sm-10 text-break">{inviteEmailPreview.to?.join(', ')}</dd>
                    <dt className="col-sm-2">Cc</dt>
                    <dd className="col-sm-10 text-break">{inviteEmailPreview.cc?.join(', ') || '—'}</dd>
                    <dt className="col-sm-2">Subject</dt>
                    <dd className="col-sm-10 text-break">{inviteEmailPreview.subject}</dd>
                  </dl>
                  <label className="form-label small text-muted">Preview</label>
                  <div
                    className="border rounded bg-white overflow-auto"
                    style={{ maxHeight: 'min(50vh, 420px)', backgroundColor: '#fff' }}
                    dangerouslySetInnerHTML={{ __html: inviteEmailPreview.html }}
                  />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={onCancel}
                disabled={inviteEmailSending || inviteEmailPreviewLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-info"
                onClick={onSend}
                disabled={inviteEmailSending || inviteEmailPreviewLoading || !inviteEmailPreview}
              >
                {inviteEmailSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Sending…
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-1"></i>
                    Send email &amp; mark Invited
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1070 }}></div>
    </>
  )
}

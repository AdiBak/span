import React from 'react'

export default function VolunteerVerificationModal({
  open,
  verificationMember,
  verificationPdfUrl,
  verificationEntryCount,
  verificationSending,
  onDismiss,
  onSend,
}) {
  if (!open || !verificationMember) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show') && !verificationSending) {
            onDismiss()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-file-earmark-pdf me-2"></i>
                Volunteer Verification Letter
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => onDismiss()}
                disabled={verificationSending}
              ></button>
            </div>
            <div className="modal-body p-0" style={{ height: '70vh' }}>
              <div className="d-flex flex-column h-100">
                <div className="px-3 py-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                  <span>
                    <strong>
                      {verificationMember.first_name} {verificationMember.last_name}
                    </strong>
                    <span className="text-muted ms-2">
                      {verificationEntryCount} approved entr{verificationEntryCount === 1 ? 'y' : 'ies'}
                    </span>
                  </span>
                  <span className="text-muted small">
                    Will send to:{' '}
                    <strong>{verificationMember.original_email || verificationMember.email}</strong>
                  </span>
                </div>
                <div className="flex-grow-1">
                  {verificationPdfUrl ? (
                    <iframe
                      src={verificationPdfUrl}
                      title="Verification Letter Preview"
                      width="100%"
                      height="100%"
                      style={{ border: 'none' }}
                    />
                  ) : (
                    <div className="d-flex justify-content-center align-items-center h-100">
                      <span className="spinner-border" role="status"></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={() => onDismiss()}
                disabled={verificationSending}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSend} disabled={verificationSending}>
                {verificationSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-envelope-paper me-1"></i>
                    Send Verification Email
                  </>
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

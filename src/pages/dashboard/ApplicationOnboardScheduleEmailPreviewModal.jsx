import React from 'react'

export default function ApplicationOnboardScheduleEmailPreviewModal({
  open,
  application,
  onboardScheduleWhen2meetUrl,
  setOnboardScheduleWhen2meetUrl,
  onboardScheduleDeadlineNote,
  setOnboardScheduleDeadlineNote,
  onboardScheduleEmailPreview,
  onboardScheduleEmailPreviewLoading,
  onboardScheduleEmailSending,
  onRefreshPreview,
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
          if (
            e.target.className.includes('modal fade show') &&
            !onboardScheduleEmailSending &&
            !onboardScheduleEmailPreviewLoading
          ) {
            onBackdropClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-envelope-check me-2"></i>
                Send onboarding scheduling email
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHeaderClose}
                disabled={onboardScheduleEmailSending || onboardScheduleEmailPreviewLoading}
              ></button>
            </div>
            <div className="modal-body">
              <p className="text-muted small">
                Letterhead-style email with congratulations and scheduling instructions. Optionally add a{' '}
                <strong>when2meet</strong> (or other) <strong>https</strong> link and a short deadline line; leave blank to
                ask them to reply with availability only. Click <strong>Refresh preview</strong> after editing. Sending
                uses Resend and sets the application to <strong>Onboard</strong>.
              </p>
              <div className="row g-2 mb-3">
                <div className="col-12">
                  <label className="form-label small mb-0">Scheduling link (optional)</label>
                  <input
                    type="url"
                    className="form-control form-control-sm"
                    placeholder="https://www.when2meet.com/?…"
                    value={onboardScheduleWhen2meetUrl}
                    onChange={(e) => setOnboardScheduleWhen2meetUrl(e.target.value)}
                    disabled={onboardScheduleEmailSending || onboardScheduleEmailPreviewLoading}
                    autoComplete="off"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small mb-0">Deadline note (optional)</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Wednesday, April 1st"
                    value={onboardScheduleDeadlineNote}
                    onChange={(e) => setOnboardScheduleDeadlineNote(e.target.value)}
                    disabled={onboardScheduleEmailSending || onboardScheduleEmailPreviewLoading}
                    autoComplete="off"
                  />
                </div>
                <div className="col-12">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={onRefreshPreview}
                    disabled={
                      onboardScheduleEmailSending || onboardScheduleEmailPreviewLoading || !application
                    }
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Refresh preview
                  </button>
                </div>
              </div>
              {onboardScheduleEmailPreviewLoading && (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading preview…</span>
                  </div>
                </div>
              )}
              {!onboardScheduleEmailPreviewLoading && onboardScheduleEmailPreview && (
                <>
                  <dl className="row small mb-3">
                    <dt className="col-sm-2">From</dt>
                    <dd className="col-sm-10 text-break">{onboardScheduleEmailPreview.from}</dd>
                    <dt className="col-sm-2">To</dt>
                    <dd className="col-sm-10 text-break">{onboardScheduleEmailPreview.to?.join(', ')}</dd>
                    <dt className="col-sm-2">Cc</dt>
                    <dd className="col-sm-10 text-break">{onboardScheduleEmailPreview.cc?.join(', ') || '—'}</dd>
                    <dt className="col-sm-2">Subject</dt>
                    <dd className="col-sm-10 text-break">{onboardScheduleEmailPreview.subject}</dd>
                  </dl>
                  <label className="form-label small text-muted">Preview</label>
                  <div
                    className="border rounded bg-white overflow-auto"
                    style={{ maxHeight: 'min(50vh, 420px)', backgroundColor: '#fff' }}
                    dangerouslySetInnerHTML={{ __html: onboardScheduleEmailPreview.html }}
                  />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-dark"
                onClick={onCancel}
                disabled={onboardScheduleEmailSending || onboardScheduleEmailPreviewLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onSend}
                disabled={
                  onboardScheduleEmailSending ||
                  onboardScheduleEmailPreviewLoading ||
                  !onboardScheduleEmailPreview
                }
              >
                {onboardScheduleEmailSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Sending…
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-1"></i>
                    Send email &amp; mark Onboard
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

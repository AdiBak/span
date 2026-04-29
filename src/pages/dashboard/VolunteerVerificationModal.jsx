import React from 'react'

export default function VolunteerVerificationModal({
  open,
  verificationMember,
  verificationPdfUrl,
  verificationApprovedEntries,
  selectedVerificationEntryIds,
  verificationEntryCount,
  verificationPreviewDirty,
  verificationGenerating,
  verificationSending,
  onSelectionChange,
  onRebuildPreview,
  onDismiss,
  onSend,
}) {
  if (!open || !verificationMember) return null

  const allIds = (verificationApprovedEntries || []).map((e) => e.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedVerificationEntryIds.includes(id))

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    onSelectionChange(allSelected ? [] : allIds)
  }

  const toggleOne = (entryId) => {
    if (!onSelectionChange) return
    const next = selectedVerificationEntryIds.includes(entryId)
      ? selectedVerificationEntryIds.filter((id) => id !== entryId)
      : [...selectedVerificationEntryIds, entryId]
    onSelectionChange(next)
  }

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
                <div className="row g-0 flex-grow-1">
                  <div className="col-md-4 border-end bg-light" style={{ maxHeight: '100%', overflowY: 'auto' }}>
                    <div className="p-3">
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="selectAllVerificationEntries"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          disabled={verificationSending}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="selectAllVerificationEntries">
                          Select all
                        </label>
                      </div>
                      <div className="small text-muted mb-2">
                        {selectedVerificationEntryIds.length} of {allIds.length} approved entries selected
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {(verificationApprovedEntries || []).map((entry) => (
                          <label key={entry.id} className="border rounded p-2 bg-white small">
                            <input
                              className="form-check-input me-2"
                              type="checkbox"
                              checked={selectedVerificationEntryIds.includes(entry.id)}
                              onChange={() => toggleOne(entry.id)}
                              disabled={verificationSending}
                            />
                            <span className="fw-semibold d-block">{entry.volunteering_job_title || 'Volunteer entry'}</span>
                            <span className="text-muted d-block">
                              {entry.start_timestamp ? new Date(entry.start_timestamp).toLocaleString() : 'No date'}
                            </span>
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-dark mt-3"
                        onClick={onRebuildPreview}
                        disabled={verificationSending || verificationGenerating || selectedVerificationEntryIds.length === 0}
                      >
                        {verificationGenerating ? 'Rebuilding…' : 'Rebuild preview'}
                      </button>
                      {verificationPreviewDirty && (
                        <div className="text-warning small mt-2">
                          Selection changed. Rebuild preview before sending.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-8">
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
              <button
                type="button"
                className="btn btn-dark"
                onClick={onSend}
                disabled={
                  verificationSending ||
                  verificationGenerating ||
                  verificationPreviewDirty ||
                  selectedVerificationEntryIds.length === 0
                }
              >
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

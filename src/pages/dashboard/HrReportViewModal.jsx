import React, { useEffect, useState } from 'react'

export default function HrReportViewModal({
  open,
  report,
  onClose,
  formatDateLong,
  formatDate,
  showExecStatusControls,
  onUpdateStatus,
  showRecordStrikeForRegarding,
  recordingStrike,
  onRecordStrikeFromReport,
  showPolicyViolationEmail,
  onOpenPolicyViolationEmail,
  canDelete,
  onDelete,
}) {
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    if (!open || !report) return
    setResolutionNotes(report.review_notes || '')
  }, [open, report?.report_id, report?.review_notes])

  if (!open || !report) return null

  const applyStatus = async (status) => {
    if (!report.report_id || typeof onUpdateStatus !== 'function') return
    setSavingNotes(true)
    try {
      await onUpdateStatus(report.report_id, status, resolutionNotes)
    } finally {
      setSavingNotes(false)
    }
  }

  const saveNotesOnly = async () => {
    if (!report.report_id || typeof onUpdateStatus !== 'function') return
    setSavingNotes(true)
    try {
      await onUpdateStatus(report.report_id, report.status, resolutionNotes)
    } finally {
      setSavingNotes(false)
    }
  }

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
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">HR Report Details</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <strong>Submitted By:</strong>
                  <p>
                    {report.submitted_by_member
                      ? `${report.submitted_by_member.first_name} ${report.submitted_by_member.last_name}`
                      : 'Unknown'}
                  </p>
                </div>
                <div className="col-md-6">
                  <strong>Submitted:</strong>
                  <p>{formatDateLong(report.created_at)}</p>
                </div>
                <div className="col-md-6">
                  <strong>Nature of Complaint:</strong>
                  <p>{report.nature_of_complaint}</p>
                </div>
                <div className="col-md-6">
                  <strong>Regarding:</strong>
                  <p className="mb-0">
                    {report.regarding_member
                      ? `${report.regarding_member.first_name} ${report.regarding_member.last_name}`
                      : report.regarding_name || 'N/A'}
                  </p>
                  {!report.regarding_member_id && report.regarding_contact ? (
                    <p className="small text-muted mb-0 mt-1">
                      Contact: {report.regarding_contact}
                    </p>
                  ) : null}
                </div>
                <div className="col-md-6">
                  <strong>Date Occurred:</strong>
                  <p>{formatDate(report.date_occurred)}</p>
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong>
                  {showExecStatusControls ? (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        className={`btn btn-sm ${report.status === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                        disabled={savingNotes}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          applyStatus('pending')
                        }}
                      >
                        Pending
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${report.status === 'reviewed' ? 'btn-info' : 'btn-outline-info'}`}
                        disabled={savingNotes}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          applyStatus('reviewed')
                        }}
                      >
                        Reviewed
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${report.status === 'resolved' ? 'btn-success' : 'btn-outline-success'}`}
                        disabled={savingNotes}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          applyStatus('resolved')
                        }}
                      >
                        Resolved
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          report.status === 'dismissed' ? 'btn-secondary' : 'btn-outline-secondary'
                        }`}
                        disabled={savingNotes}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          applyStatus('dismissed')
                        }}
                      >
                        Dismissed
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2">
                      <span
                        className={`badge ${
                          report.status === 'pending'
                            ? 'bg-warning text-dark'
                            : report.status === 'resolved'
                              ? 'bg-success'
                              : report.status === 'dismissed'
                                ? 'bg-secondary'
                                : 'bg-info'
                        }`}
                      >
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </p>
                  )}
                </div>
                <div className="col-12">
                  <strong>Details:</strong>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{report.details || 'No additional details provided.'}</p>
                </div>

                {showExecStatusControls ? (
                  <div className="col-12">
                    <div className="border rounded p-3 bg-light">
                      <label className="form-label fw-semibold mb-1" htmlFor="hr-resolution-notes">
                        Resolution / incident notes
                      </label>
                      <p className="small text-muted mb-2">
                        Meeting details, outcome, and follow-ups for this report. Prefer this over the strike log
                        unless you are recording an actual strike.
                      </p>
                      <textarea
                        id="hr-resolution-notes"
                        className="form-control"
                        rows={4}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="e.g. Met with member on 8/20 — discussed conduct, agreed next steps…"
                        disabled={savingNotes}
                      />
                      <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          disabled={savingNotes}
                          onClick={saveNotesOnly}
                        >
                          {savingNotes ? 'Saving…' : 'Save notes'}
                        </button>
                        <span className="small text-muted">
                          Notes also save when you change status (including Resolved).
                        </span>
                      </div>
                    </div>
                  </div>
                ) : report.review_notes ? (
                  <div className="col-12">
                    <strong>Resolution notes:</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{report.review_notes}</p>
                  </div>
                ) : null}

                {report.reviewed_by && report.reviewed_at && (
                  <div className="col-md-6">
                    <strong>Last reviewed:</strong>
                    <p className="mb-0">{formatDateLong(report.reviewed_at)}</p>
                    {report.reviewed_by_member ? (
                      <p className="small text-muted mb-0">
                        {report.reviewed_by_member.first_name} {report.reviewed_by_member.last_name}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {canDelete && typeof onDelete === 'function' && (
                <button type="button" className="btn btn-outline-danger me-auto" onClick={onDelete}>
                  <i className="bi bi-trash me-1" />
                  Delete report
                </button>
              )}
              {showRecordStrikeForRegarding && report.regarding_member_id && typeof onRecordStrikeFromReport === 'function' && (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  disabled={recordingStrike}
                  onClick={() => onRecordStrikeFromReport(report)}
                >
                  {recordingStrike ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Recording…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-exclamation-triangle me-1" />
                      Record strike for subject
                    </>
                  )}
                </button>
              )}
              {showPolicyViolationEmail &&
                report.regarding_member_id &&
                typeof onOpenPolicyViolationEmail === 'function' && (
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={onOpenPolicyViolationEmail}
                  >
                    <i className="bi bi-envelope me-1" />
                    Email member (CC EDs)
                  </button>
                )}
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
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

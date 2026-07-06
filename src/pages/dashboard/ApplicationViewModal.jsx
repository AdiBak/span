import React from 'react'
import {
  applicationStatusBadgeClass,
  applicationStatusLabel,
  isAllowedApplicationStatusTransition,
  isApplicationPipelineStatus,
} from './applications'

import { APPLICATIONS_RESUMES_BASE_URL } from './constants'
import AiCheckResultPanel from '../../components/AiCheckResultPanel'

export default function ApplicationViewModal({
  open,
  application,
  onClose,
  formatDateLong,
  applicationNumericGrade,
  setApplicationNumericGrade,
  applicationNotes,
  setApplicationNotes,
  onSaveNumericGrade,
  onOpenInviteEmail,
  onOpenMetWithDate,
  onOpenOnboardEmail,
  onAccept,
  onOpenRejectConfirm,
  onResetToPending,
  onOpenDeleteModal,
  aiCheckResult,
  aiCheckLoading,
  onCheckAi,
}) {
  if (!open || !application) return null

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
        <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '800px' }}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Application: {application.full_name}</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <strong>Email:</strong>
                  <p>
                    <a href={`mailto:${application.email}`}>{application.email}</a>
                  </p>
                </div>
                <div className="col-md-6">
                  <strong>Phone:</strong>
                  <p>
                    <a href={`tel:${application.phone_number}`}>{application.phone_number}</a>
                  </p>
                </div>
                <div className="col-md-6">
                  <strong>Age:</strong>
                  <p>{application.age != null && application.age !== '' ? application.age : 'Not provided'}</p>
                </div>
                <div className="col-md-6">
                  <strong>School grade:</strong>
                  <p>{application.grade}</p>
                </div>
                <div className="col-md-6">
                  <strong>School:</strong>
                  <p>{application.school}</p>
                </div>
                <div className="col-md-6">
                  <strong>Country / region:</strong>
                  <p>{application.country || '—'}</p>
                </div>
                <div className="col-md-6">
                  <strong>State / province / region:</strong>
                  <p>{application.state || '—'}</p>
                </div>
                <div className="col-md-6">
                  <strong>Hours per Week:</strong>
                  <p>{application.hours_per_week}</p>
                </div>
                <div className="col-md-6">
                  <strong>How they heard about SPAN:</strong>
                  <p className="mb-0">{application.referral_source}</p>
                  {application.referral_friend_name && (
                    <p className="text-muted small mb-0 mt-1">Referred by: {application.referral_friend_name}</p>
                  )}
                </div>
                {application.linkedin_url && (
                  <div className="col-md-6">
                    <strong>LinkedIn:</strong>
                    <p>
                      <a
                        href={application.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        <i className="bi bi-linkedin me-1"></i>
                        {application.linkedin_url}
                      </a>
                    </p>
                  </div>
                )}
                {application.instagram_url && (
                  <div className="col-md-6">
                    <strong>Instagram:</strong>
                    <p>
                      <a
                        href={application.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        <i className="bi bi-instagram me-1"></i>
                        {application.instagram_url}
                      </a>
                    </p>
                  </div>
                )}
                {application.resume_file && (
                  <div className="col-12">
                    <strong>Resume:</strong>
                    <p>
                      <a
                        href={`${APPLICATIONS_RESUMES_BASE_URL}/${application.resume_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-file-earmark-pdf me-1"></i>
                        View Resume
                      </a>
                    </p>
                  </div>
                )}
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-start">
                    <strong>Additional Info:</strong>
                    {application.additional_info && onCheckAi && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onCheckAi(application.additional_info)}
                        disabled={aiCheckLoading}
                        title="Run AI text detection (ScreenComply TMR ensemble via server)"
                      >
                        {aiCheckLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Checking…
                          </>
                        ) : (
                          <>
                            <i className="bi bi-robot me-1"></i>Check AI
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p>{application.additional_info || 'None provided'}</p>
                  {aiCheckResult && (
                    <div className="mb-2">
                      <AiCheckResultPanel result={aiCheckResult} />
                    </div>
                  )}
                </div>
                <div className="col-md-6">
                  <strong>Submitted:</strong>
                  <p>{formatDateLong(application.submitted_at)}</p>
                </div>
                <div className="col-md-6">
                  <strong>Status:</strong>
                  <p>
                    <span className={`badge ${applicationStatusBadgeClass(application.status)}`}>
                      {applicationStatusLabel(application.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="applicationNumericGradeInput">
                  <strong>Review score</strong>
                  <span className="text-muted fw-normal ms-1">(internal, e.g. 1, 2, 3, 1.5)</span>
                </label>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <input
                    id="applicationNumericGradeInput"
                    type="number"
                    className="form-control"
                    style={{ maxWidth: '140px' }}
                    step="any"
                    min="0"
                    inputMode="decimal"
                    value={applicationNumericGrade}
                    onChange={(e) => setApplicationNumericGrade(e.target.value)}
                    placeholder="—"
                  />
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onSaveNumericGrade()}>
                    <i className="bi bi-save me-1"></i>Save review score
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  <strong>Notes:</strong>
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={applicationNotes}
                  onChange={(e) => setApplicationNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                />
              </div>

              {isApplicationPipelineStatus(application.status) && (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  You can move this application <strong>forward</strong> in the pipeline (skipping stages is OK) or reject
                  it. Earlier stages (e.g. back to Pending or Invited) are not available once you&apos;ve moved ahead. Add
                  notes and a review score for your records.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Close
              </button>
              <div className="d-flex gap-2 flex-wrap">
                {isApplicationPipelineStatus(application.status) && (
                  <>
                    {isAllowedApplicationStatusTransition(application.status, 'invited') && (
                      <button type="button" className="btn btn-info" onClick={onOpenInviteEmail}>
                        <i className="bi bi-envelope me-1"></i>Mark Invited (email)
                      </button>
                    )}
                    {isAllowedApplicationStatusTransition(application.status, 'met_with') && (
                      <button type="button" className="btn btn-primary" onClick={onOpenMetWithDate}>
                        <i className="bi bi-people me-1"></i>Mark Met with
                      </button>
                    )}
                    {isAllowedApplicationStatusTransition(application.status, 'onboard') && (
                      <button type="button" className="btn btn-secondary" onClick={onOpenOnboardEmail}>
                        <i className="bi bi-envelope me-1"></i>Mark Onboard (email)
                      </button>
                    )}
                    {isAllowedApplicationStatusTransition(application.status, 'accepted') && (
                      <button type="button" className="btn btn-success" onClick={onAccept}>
                        <i className="bi bi-check-circle me-1"></i>Accept & Add Member
                      </button>
                    )}
                    {isAllowedApplicationStatusTransition(application.status, 'rejected') && (
                      <button type="button" className="btn btn-danger" onClick={onOpenRejectConfirm}>
                        <i className="bi bi-x-circle me-1"></i>Reject
                      </button>
                    )}
                  </>
                )}
                {(application.status === 'accepted' || application.status === 'rejected') && (
                  <>
                    <button type="button" className="btn btn-outline-primary" onClick={onResetToPending}>
                      Reset to Pending
                    </button>
                    <button type="button" className="btn btn-outline-danger" onClick={onOpenDeleteModal}>
                      <i className="bi bi-trash me-1"></i>Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

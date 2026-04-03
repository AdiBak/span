import React from 'react'

export default function HrReportSubmitModal({
  open,
  onClose,
  hrReportForm,
  setHrReportForm,
  hrReportError,
  hrReportSuccess,
  onSubmit,
}) {
  if (!open) return null

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
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Submit HR Report</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              {hrReportError && <div className="alert alert-danger">{hrReportError}</div>}
              {hrReportSuccess && <div className="alert alert-success">{hrReportSuccess}</div>}

              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                All HR reports are confidential and will be reviewed by executive directors. Reports involving an executive
                director will not be visible to that person.
              </div>

              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">
                    Nature of Complaint <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={hrReportForm.nature}
                    onChange={(e) => setHrReportForm({ ...hrReportForm, nature: e.target.value })}
                    placeholder="e.g., Harassment, Discrimination, Policy Violation, etc."
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Regarding (Member Name)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={hrReportForm.regardingName}
                    onChange={(e) => setHrReportForm({ ...hrReportForm, regardingName: e.target.value })}
                    placeholder="Name of person this report is about (optional)"
                  />
                  <small className="text-muted">If this is about a specific member, enter their name</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Date Occurred <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={hrReportForm.dateOccurred}
                    onChange={(e) => setHrReportForm({ ...hrReportForm, dateOccurred: e.target.value })}
                    required
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label">Details</label>
                  <textarea
                    className="form-control"
                    rows="5"
                    value={hrReportForm.details}
                    onChange={(e) => setHrReportForm({ ...hrReportForm, details: e.target.value })}
                    placeholder="Provide additional details about the incident..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSubmit}>
                Submit Report
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

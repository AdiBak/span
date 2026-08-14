import React, { useMemo } from 'react'

const OTHER = '__other__'

export default function HrReportSubmitModal({
  open,
  onClose,
  hrReportForm,
  setHrReportForm,
  hrReportError,
  hrReportSuccess,
  onSubmit,
  membersList = [],
}) {
  const sortedMembers = useMemo(() => {
    return [...(membersList || [])].sort((a, b) => {
      const an = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase()
      const bn = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase()
      return an.localeCompare(bn)
    })
  }, [membersList])

  if (!open) return null

  const regardingSelectValue = hrReportForm.regardingMemberId || ''
  const isOther = regardingSelectValue === OTHER

  function handleRegardingSelect(value) {
    if (value === OTHER) {
      setHrReportForm({
        ...hrReportForm,
        regardingMemberId: OTHER,
        regardingName: hrReportForm.regardingName || '',
        regardingContact: hrReportForm.regardingContact || '',
      })
      return
    }
    if (!value) {
      setHrReportForm({
        ...hrReportForm,
        regardingMemberId: '',
        regardingName: '',
        regardingContact: '',
      })
      return
    }
    const m = sortedMembers.find((row) => String(row.member_id) === String(value))
    setHrReportForm({
      ...hrReportForm,
      regardingMemberId: value,
      regardingName: m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : '',
      regardingContact: '',
    })
  }

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
                Reports are confidential and reviewed by executive directors in the dashboard. Submitting does{' '}
                <strong>not</strong> email the person named — leadership sends any follow-up separately. Reports about
                an executive director are hidden from that person.
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
                  <label className="form-label">Regarding</label>
                  <select
                    className="form-select"
                    value={regardingSelectValue}
                    onChange={(e) => handleRegardingSelect(e.target.value)}
                  >
                    <option value="">Select… (optional)</option>
                    {sortedMembers.map((m) => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                    <option value={OTHER}>Other (not in directory)…</option>
                  </select>
                  <small className="text-muted">
                    SPAN member from the directory, or Other for someone outside the organization.
                  </small>
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

                {isOther && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label">
                        Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={hrReportForm.regardingName}
                        onChange={(e) =>
                          setHrReportForm({ ...hrReportForm, regardingName: e.target.value })
                        }
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Contact info (optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={hrReportForm.regardingContact || ''}
                        onChange={(e) =>
                          setHrReportForm({ ...hrReportForm, regardingContact: e.target.value })
                        }
                        placeholder="Email, phone, or other reference"
                      />
                      <small className="text-muted">For leadership reference only — not emailed automatically.</small>
                    </div>
                  </>
                )}

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

import React from 'react'

export default function LeaveRequestSubmitModal({
  open,
  onClose,
  requestForm,
  setRequestForm,
  requestError,
  requestSuccess,
  onSubmit,
}) {
  if (!open) return null

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1055 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Request leave or extension</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={requestForm.type}
                    onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                  >
                    <option value="leave">Leave / break</option>
                    <option value="extension">Project extension</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                    placeholder="Explain your request..."
                    required
                  />
                </div>
                {requestForm.type === 'leave' && (
                  <div className="mb-3 row">
                    <div className="col-md-6">
                      <label className="form-label">Start date (optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={requestForm.leaveStart}
                        onChange={(e) => setRequestForm({ ...requestForm, leaveStart: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">End date (optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={requestForm.leaveEnd}
                        onChange={(e) => setRequestForm({ ...requestForm, leaveEnd: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {requestForm.type === 'extension' && (
                  <div className="mb-3">
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label className="form-label">Project name (optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={requestForm.projectName}
                          onChange={(e) => setRequestForm({ ...requestForm, projectName: e.target.value })}
                          placeholder="e.g. Policy brief"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Requested New Deadline (optional)</label>
                        <input
                          type="date"
                          className="form-control"
                          value={requestForm.requestedByDate}
                          onChange={(e) => setRequestForm({ ...requestForm, requestedByDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {requestError && <div className="text-danger small mt-2">{requestError}</div>}
                {requestSuccess && <div className="text-success small mt-2">{requestSuccess}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-dark">
                  Submit request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

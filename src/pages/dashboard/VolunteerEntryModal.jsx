import React from 'react'

export default function VolunteerEntryModal({
  open,
  volunteerForm,
  setVolunteerForm,
  volunteerError,
  onClose,
  onSave,
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
              <h5 className="modal-title">Add Volunteer Entry</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Job Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={volunteerForm.jobTitle}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, jobTitle: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Job Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={volunteerForm.jobDesc}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, jobDesc: e.target.value })}
                  required
                ></textarea>
              </div>
              <div className="mb-3">
                <label className="form-label">Input Method</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="inputMode"
                    id="inputModeDatetime"
                    checked={volunteerForm.inputMode === 'datetime'}
                    onChange={() => setVolunteerForm({ ...volunteerForm, inputMode: 'datetime' })}
                  />
                  <label className="btn btn-outline-primary" htmlFor="inputModeDatetime">
                    <i className="bi bi-calendar-range me-1"></i>Date & Time Range
                  </label>
                  <input
                    type="radio"
                    className="btn-check"
                    name="inputMode"
                    id="inputModeHours"
                    checked={volunteerForm.inputMode === 'hours'}
                    onChange={() => setVolunteerForm({ ...volunteerForm, inputMode: 'hours' })}
                  />
                  <label className="btn btn-outline-primary" htmlFor="inputModeHours">
                    <i className="bi bi-clock me-1"></i>Hours Only
                  </label>
                </div>
              </div>
              {volunteerForm.inputMode === 'datetime' ? (
                <div className="mb-3 row">
                  <div className="col-md-6">
                    <label className="form-label">Start Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={volunteerForm.startTime}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, startTime: e.target.value })}
                      required={volunteerForm.inputMode === 'datetime'}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={volunteerForm.endTime}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, endTime: e.target.value })}
                      required={volunteerForm.inputMode === 'datetime'}
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-3 row">
                  <div className="col-md-6">
                    <label className="form-label">Work Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={volunteerForm.workDate}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, workDate: e.target.value })}
                      required={volunteerForm.inputMode === 'hours'}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Hours</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.25"
                      min="0.25"
                      value={volunteerForm.hours}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, hours: e.target.value })}
                      placeholder="e.g., 2.5 for 2 hours 30 minutes"
                      required={volunteerForm.inputMode === 'hours'}
                    />
                    <small className="text-muted">Enter hours as a decimal (e.g., 2.5 = 2h 30m)</small>
                  </div>
                </div>
              )}
              {volunteerError && <div className="text-danger mt-2">{volunteerError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

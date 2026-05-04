import React from 'react'

/**
 * Add / edit member (registration permission). Exec-only permission checkboxes.
 */
export default function MemberFormModal({
  open,
  editingMemberId,
  memberForm,
  setMemberForm,
  memberError,
  memberSuccess,
  showPermissionsSection,
  markEmailAsManuallyEdited,
  onBackdropClose,
  onHeaderClose,
  onCancelFooter,
  onImportApplication,
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
            onBackdropClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '800px' }}>
          <div className="modal-content">
            <div className="modal-header d-flex justify-content-between align-items-center w-100">
              <h5 className="modal-title mb-0">{editingMemberId ? 'Edit Member' : 'Add New Member'}</h5>
              <div className="d-flex gap-2 align-items-center">
                {!editingMemberId && (
                  <button type="button" className="btn btn-outline-primary btn-sm" onClick={onImportApplication}>
                    <i className="bi bi-download me-1"></i>Import from Application
                  </button>
                )}
                <button type="button" className="btn-close" onClick={onHeaderClose}></button>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {memberError && <div className="alert alert-danger">{memberError}</div>}
              {memberSuccess && <div className="alert alert-success">{memberSuccess}</div>}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">
                    First Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.firstName}
                    onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Last Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.lastName}
                    onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Middle name (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.middleName}
                    onChange={(e) => setMemberForm({ ...memberForm, middleName: e.target.value })}
                    placeholder="Not used for SPAN email"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Preferred public name (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.preferredName}
                    onChange={(e) => setMemberForm({ ...memberForm, preferredName: e.target.value })}
                    placeholder="Shown on directory & blog; leave blank to use first (middle) last"
                  />
                  <small className="text-muted">
                    Members can also edit this from their dashboard. Does not change SPAN email (first.last only).
                  </small>
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Email (SPAN Email) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={memberForm.email}
                    onChange={(e) => {
                      markEmailAsManuallyEdited()
                      setMemberForm({ ...memberForm, email: e.target.value })
                    }}
                    placeholder="firstname.lastname@spanationwide.org"
                    required
                  />
                  <small className="text-muted">
                    Auto-generated as first.last@spanationwide.org from first and last name only, or enter manually
                  </small>
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Original Email (Personal Email) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    value={memberForm.originalEmail}
                    onChange={(e) => setMemberForm({ ...memberForm, originalEmail: e.target.value })}
                    placeholder="personal@example.com"
                    required
                  />
                  <small className="text-muted">Where to forward SPAN emails</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Role <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    placeholder="e.g., Content Writer, Advocate, Analyst, etc."
                    required
                  />
                  <small className="text-muted">This is the official role shown in the directory</small>
                </div>
                {editingMemberId && (
                  <div className="col-md-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="memberFormActive"
                        checked={memberForm.active !== false}
                        onChange={(e) => setMemberForm({ ...memberForm, active: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="memberFormActive">
                        Active member
                      </label>
                    </div>
                    <small className="text-muted d-block">
                      Uncheck to move member to Inactive; they won’t appear in the directory.
                    </small>
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={memberForm.startDate}
                    onChange={(e) => setMemberForm({ ...memberForm, startDate: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    value={memberForm.dob}
                    onChange={(e) => setMemberForm({ ...memberForm, dob: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.city}
                    onChange={(e) => setMemberForm({ ...memberForm, city: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.state}
                    onChange={(e) => setMemberForm({ ...memberForm, state: e.target.value })}
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label">School Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.schoolName}
                    onChange={(e) => setMemberForm({ ...memberForm, schoolName: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                    placeholder="(123) 456-7890"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">LinkedIn</label>
                  <input
                    type="url"
                    className="form-control"
                    value={memberForm.linkedin}
                    onChange={(e) => setMemberForm({ ...memberForm, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Instagram</label>
                  <input
                    type="text"
                    className="form-control"
                    value={memberForm.instagram}
                    onChange={(e) => setMemberForm({ ...memberForm, instagram: e.target.value })}
                    placeholder="@username"
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label">Bio</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={memberForm.bio}
                    onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
                    placeholder="Brief biography..."
                  />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={memberForm.notes}
                    onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                    placeholder="Internal notes..."
                  />
                </div>

                {showPermissionsSection && (
                  <div className="col-md-12">
                    <label className="form-label fw-bold">Dashboard Access</label>
                    <small className="text-muted d-block mb-2">
                      Choose which dashboard sections and tools this member can access.
                    </small>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={memberForm.volunteer}
                            onChange={(e) => setMemberForm({ ...memberForm, volunteer: e.target.checked })}
                            id="memberVolunteer"
                          />
                          <label className="form-check-label" htmlFor="memberVolunteer">
                            Volunteer Hours
                          </label>
                          <small className="text-muted d-block">
                            Can view and manage volunteer hour submissions.
                          </small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={memberForm.applications}
                            onChange={(e) => setMemberForm({ ...memberForm, applications: e.target.checked })}
                            id="memberApplications"
                          />
                          <label className="form-check-label" htmlFor="memberApplications">
                            Applications
                          </label>
                          <small className="text-muted d-block">
                            Can review and update applicant pipeline statuses.
                          </small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={memberForm.bills}
                            onChange={(e) => setMemberForm({ ...memberForm, bills: e.target.checked })}
                            id="memberBills"
                          />
                          <label className="form-check-label" htmlFor="memberBills">
                            Bills and Outreach
                          </label>
                          <small className="text-muted d-block">
                            Can access bill workflows, assignments, and legislator outreach tools.
                          </small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={memberForm.registration}
                            onChange={(e) => setMemberForm({ ...memberForm, registration: e.target.checked })}
                            id="memberRegistration"
                          />
                          <label className="form-check-label" htmlFor="memberRegistration">
                            Member Management
                          </label>
                          <small className="text-muted d-block">
                            Can add/edit members and manage registration-related access.
                          </small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={memberForm.blog}
                            onChange={(e) => setMemberForm({ ...memberForm, blog: e.target.checked })}
                            id="memberBlog"
                          />
                          <label className="form-check-label" htmlFor="memberBlog">
                            Blog OTP Access
                          </label>
                          <small className="text-muted d-block">
                            Can arm OTP forwarding for the shared Medium account.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={onCancelFooter}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSave}>
                {editingMemberId ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

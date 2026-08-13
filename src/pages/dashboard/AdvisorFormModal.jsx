import React from 'react'

export default function AdvisorFormModal({
  open,
  editingAdvisorId,
  advisorForm,
  setAdvisorForm,
  advisorError,
  advisorSuccess,
  currentPhotoPreviewUrl,
  setAdvisorPhotoFile,
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
              <h5 className="modal-title">{editingAdvisorId ? 'Edit Mentor' : 'Add Mentor'}</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              {advisorError && <div className="alert alert-danger">{advisorError}</div>}
              {advisorSuccess && <div className="alert alert-success">{advisorSuccess}</div>}

              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">
                    Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={advisorForm.fullName}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, fullName: e.target.value })}
                    placeholder="e.g., Jane Smith"
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={advisorForm.title}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, title: e.target.value })}
                    placeholder="e.g., Chief Medical Officer"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Company / Organization</label>
                  <input
                    type="text"
                    className="form-control"
                    value={advisorForm.company}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, company: e.target.value })}
                    placeholder="e.g., Acme Health"
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label">LinkedIn URL (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={advisorForm.linkedinUrl}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, linkedinUrl: e.target.value })}
                    placeholder="https://www.linkedin.com/in/..."
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={advisorForm.displayOrder}
                    onChange={(e) =>
                      setAdvisorForm({ ...advisorForm, displayOrder: parseInt(e.target.value, 10) || 999 })
                    }
                    placeholder="999"
                  />
                  <small className="text-muted">Lower numbers appear first</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={advisorForm.active ? 'true' : 'false'}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, active: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">
                    Photo {!editingAdvisorId && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setAdvisorPhotoFile(e.target.files[0] || null)}
                  />
                  <small className="text-muted">
                    {editingAdvisorId
                      ? 'Leave empty to keep current photo'
                      : 'Upload a headshot for the Members page Leadership tab'}
                  </small>
                  {editingAdvisorId && currentPhotoPreviewUrl && (
                    <div className="mt-2">
                      <p className="small mb-1">Current photo:</p>
                      <img
                        src={currentPhotoPreviewUrl}
                        alt="Current photo"
                        className="rounded-circle object-fit-cover"
                        style={{ width: '96px', height: '96px' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSave}>
                {editingAdvisorId ? 'Update Mentor' : 'Add Mentor'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

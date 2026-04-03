import React from 'react'

export default function SchoolFormModal({
  open,
  editingSchoolId,
  schoolForm,
  setSchoolForm,
  schoolError,
  schoolSuccess,
  currentLogoPreviewUrl,
  setSchoolLogoFile,
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
              <h5 className="modal-title">{editingSchoolId ? 'Edit School' : 'Add School'}</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              {schoolError && <div className="alert alert-danger">{schoolError}</div>}
              {schoolSuccess && <div className="alert alert-success">{schoolSuccess}</div>}

              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">
                    School Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={schoolForm.schoolName}
                    onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                    placeholder="e.g., Rice University"
                    required
                  />
                </div>

                <div className="col-md-12">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="schoolActive"
                      checked={schoolForm.active !== false}
                      onChange={(e) => setSchoolForm({ ...schoolForm, active: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="schoolActive">
                      Active (show on homepage carousel)
                    </label>
                  </div>
                </div>

                <div className="col-md-12">
                  <label className="form-label">
                    Logo {!editingSchoolId && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setSchoolLogoFile(e.target.files[0] || null)}
                  />
                  <small className="text-muted">
                    {editingSchoolId ? 'Leave empty to keep current logo' : 'Upload school logo'}
                  </small>
                  {editingSchoolId && currentLogoPreviewUrl && (
                    <div className="mt-2">
                      <p className="small mb-1">Current logo:</p>
                      <img
                        src={currentLogoPreviewUrl}
                        alt="Current logo"
                        style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }}
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
                {editingSchoolId ? 'Update School' : 'Add School'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

import React from 'react'

export default function PartnerFormModal({
  open,
  editingPartnerId,
  partnerForm,
  setPartnerForm,
  partnerError,
  partnerSuccess,
  currentLogoPreviewUrl,
  setPartnerLogoFile,
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
              <h5 className="modal-title">{editingPartnerId ? 'Edit Partner' : 'Add Partner'}</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              {partnerError && <div className="alert alert-danger">{partnerError}</div>}
              {partnerSuccess && <div className="alert alert-success">{partnerSuccess}</div>}

              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">
                    Partner Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={partnerForm.partnerName}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerName: e.target.value })}
                    placeholder="e.g., Beyond Partisan"
                    required
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label">Website URL (Optional)</label>
                  <input
                    type="url"
                    className="form-control"
                    value={partnerForm.websiteUrl}
                    onChange={(e) => setPartnerForm({ ...partnerForm, websiteUrl: e.target.value })}
                    placeholder="https://example.org"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={partnerForm.displayOrder}
                    onChange={(e) =>
                      setPartnerForm({ ...partnerForm, displayOrder: parseInt(e.target.value, 10) || 999 })
                    }
                    placeholder="999"
                  />
                  <small className="text-muted">Lower numbers appear first</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={partnerForm.active ? 'true' : 'false'}
                    onChange={(e) => setPartnerForm({ ...partnerForm, active: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="col-md-12">
                  <label className="form-label">
                    Logo {!editingPartnerId && <span className="text-danger">*</span>}
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => setPartnerLogoFile(e.target.files[0] || null)}
                  />
                  <small className="text-muted">
                    {editingPartnerId ? 'Leave empty to keep current logo' : 'Upload partner organization logo'}
                  </small>
                  {editingPartnerId && currentLogoPreviewUrl && (
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
                {editingPartnerId ? 'Update Partner' : 'Add Partner'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

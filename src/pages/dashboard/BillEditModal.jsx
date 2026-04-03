import React from 'react'

/**
 * Edit existing bill modal (dashboard Bill Management).
 */
export default function BillEditModal({
  open,
  editBillForm,
  setEditBillForm,
  setEditBillPdfFile,
  billError,
  billSuccess,
  allMembers,
  showHiddenCheckbox,
  onClose,
  onSave,
  onToggleCollaborator,
  setBillError,
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
              <h5 className="modal-title">Edit Bill</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">
                  State <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editBillForm.state}
                  onChange={(e) => setEditBillForm({ ...editBillForm, state: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Bill Name/Number <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={editBillForm.name}
                  onChange={(e) => setEditBillForm({ ...editBillForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Position <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={editBillForm.position}
                  onChange={(e) => setEditBillForm({ ...editBillForm, position: e.target.value })}
                  required
                >
                  <option value="Support">Support</option>
                  <option value="Oppose">Oppose</option>
                  <option value="Support If Amended">Support If Amended</option>
                  <option value="Propose">Propose</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Description <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={editBillForm.description}
                  onChange={(e) => setEditBillForm({ ...editBillForm, description: e.target.value })}
                  required
                ></textarea>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Bill Date <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={editBillForm.billDate}
                  onChange={(e) => setEditBillForm({ ...editBillForm, billDate: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">LegiScan Link</label>
                <input
                  type="url"
                  className="form-control"
                  value={editBillForm.legiscanLink}
                  onChange={(e) => setEditBillForm({ ...editBillForm, legiscanLink: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Proposal link (Google Doc or similar) <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://docs.google.com/..."
                  value={editBillForm.googleDocLink}
                  onChange={(e) => setEditBillForm({ ...editBillForm, googleDocLink: e.target.value })}
                />
                <small className="text-muted">Provide a link to the proposal doc so it can be edited.</small>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Proposal PDF <span className="text-danger">*</span>
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.type !== 'application/pdf') {
                        setBillError('Please upload a PDF file.')
                        return
                      }
                      setEditBillPdfFile(file)
                    }
                  }}
                />
                <small className="text-muted">
                  A PDF must be on file—upload if missing, or upload a new file to replace the existing one.
                </small>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Collaborators <span className="text-danger">*</span>
                </label>
                <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {allMembers.length === 0 ? (
                    <p className="text-muted small mb-0">Loading members...</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {allMembers.map((m) => {
                        const fullName = `${m.first_name} ${m.last_name}`
                        const isSelected = editBillForm.collaborators.includes(fullName)
                        return (
                          <button
                            key={m.member_id}
                            type="button"
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => onToggleCollaborator(m.member_id)}
                          >
                            {fullName}
                            {isSelected && <i className="bi bi-check ms-1"></i>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <small className="text-muted">Select at least one collaborator</small>
              </div>
              {showHiddenCheckbox ? (
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="editBillHidden"
                    checked={!!editBillForm.hidden}
                    onChange={(e) => setEditBillForm({ ...editBillForm, hidden: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="editBillHidden">
                    Hide from public site (approved but not shown on Bills page)
                  </label>
                </div>
              ) : null}
              {billError && <div className="text-danger mt-2">{billError}</div>}
              {billSuccess && <div className="text-success mt-2">{billSuccess}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSave}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

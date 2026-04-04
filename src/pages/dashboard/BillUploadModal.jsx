import React from 'react'

/**
 * New bill upload / publish-from-assignment modal (dashboard).
 */
export default function BillUploadModal({
  open,
  billModalSourceAssignmentId,
  publishLegiscanLookup = 'idle',
  billForm,
  setBillForm,
  setBillPdfFile,
  billError,
  billSuccess,
  allMembers,
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
              <h5 className="modal-title">
                {billModalSourceAssignmentId ? 'Publish bill (approved assignment)' : 'Upload New Bill'}
              </h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              {billModalSourceAssignmentId && (
                <div className="alert alert-info small py-2 mb-3">
                  This task is marked approved. Finish this form to create an <strong>approved</strong> bill (visible on the
                  public Bills page). It will also appear under <strong>Bill Management → Outreach</strong> for LegiScan
                  sponsors and optional Open States prospects. Assignees are pre-selected as collaborators; the doc link is
                  prefilled from the task when available. If state and bill number match LegiScan, we try to prefill the
                  LegiScan link automatically (requires <code className="small">VITE_LEGISCAN_API_KEY</code>). Upload the
                  proposal PDF file below for the site (required).
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">
                  State <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., California, Texas"
                  value={billForm.state}
                  onChange={(e) => setBillForm({ ...billForm, state: e.target.value })}
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
                  placeholder="e.g., HB 1234, AB 567"
                  value={billForm.name}
                  onChange={(e) => setBillForm({ ...billForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Position <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={billForm.position}
                  onChange={(e) => setBillForm({ ...billForm, position: e.target.value })}
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
                  placeholder="Describe the bill and SPAN's position..."
                  value={billForm.description}
                  onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
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
                  value={billForm.billDate}
                  onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">LegiScan Link</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://legiscan.com/..."
                  value={billForm.legiscanLink}
                  onChange={(e) => setBillForm({ ...billForm, legiscanLink: e.target.value })}
                />
                {billModalSourceAssignmentId && publishLegiscanLookup === 'pending' && (
                  <small className="text-muted d-block mt-1">Looking up LegiScan…</small>
                )}
                {billModalSourceAssignmentId && publishLegiscanLookup === 'filled' && (
                  <small className="text-success d-block mt-1">LegiScan link prefilled from state and bill number.</small>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Proposal link (Google Doc or similar) <span className="text-danger">*</span>
                </label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://docs.google.com/..."
                  value={billForm.googleDocLink}
                  onChange={(e) => setBillForm({ ...billForm, googleDocLink: e.target.value })}
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
                      setBillPdfFile(file)
                    }
                  }}
                />
                <small className="text-muted">
                  Stored as {billForm.state || 'state'}/{billForm.name ? billForm.name.replace(/[^a-zA-Z0-9]/g, '_') : 'bill'}
                  .pdf
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
                        const isSelected = billForm.collaborators.includes(fullName)
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
                <small className="text-muted">Select at least one member who worked on this bill</small>
              </div>
              {billError && <div className="text-danger mt-2">{billError}</div>}
              {billSuccess && <div className="text-success mt-2">{billSuccess}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSave}>
                {billModalSourceAssignmentId ? 'Save & publish bill' : 'Upload Bill'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

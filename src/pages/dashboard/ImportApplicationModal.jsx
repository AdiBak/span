import React from 'react'
import { applicationStatusBadgeClass, applicationStatusLabel } from './applications'

const IMPORT_STATUSES = ['pending', 'invited', 'met_with', 'onboard', 'accepted']

export default function ImportApplicationModal({
  open,
  applications,
  formatDateLong,
  onClose,
  onImport,
}) {
  if (!open) return null

  const rows = applications.filter((app) => IMPORT_STATUSES.includes(app.status))

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) {
            onClose()
          }
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Import from Application</h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p className="text-muted mb-3">Select an application to import data into the member form:</p>
              {rows.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>School</th>
                        <th>State</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((app) => (
                        <tr key={app.application_id}>
                          <td>{app.full_name}</td>
                          <td>{app.email}</td>
                          <td>{app.school || '-'}</td>
                          <td>{app.state || '-'}</td>
                          <td>{formatDateLong(app.submitted_at)}</td>
                          <td>
                            <span className={`badge ${applicationStatusBadgeClass(app.status)}`}>
                              {applicationStatusLabel(app.status)}
                            </span>
                          </td>
                          <td>
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => onImport(app)}>
                              <i className="bi bi-download me-1"></i>Import
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-4">
                  No applications available to import (pending through onboard, or accepted).
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
    </>
  )
}

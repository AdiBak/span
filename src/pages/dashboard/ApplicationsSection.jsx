import React from 'react'
import { applicationStatusBadgeClass, applicationStatusLabel } from './applications'

/**
 * Applications table + status filters (dashboard).
 */
export default function ApplicationsSection({
  sectionOrder,
  sectionId,
  applicationFilter,
  setApplicationFilter,
  effectiveApplications,
  filteredEffectiveApplications,
  formatDateLong,
  onViewApplication,
  onSetMetWithAt,
}) {
  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor" style={{ order: sectionOrder }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h3 className="mb-0">New Member Applications</h3>
        <div className="btn-group flex-wrap" role="group">
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setApplicationFilter('all')}
          >
            All ({effectiveApplications.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={() => setApplicationFilter('pending')}
          >
            Pending ({effectiveApplications.filter((a) => a.status === 'pending').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'invited' ? 'btn-info' : 'btn-outline-info'}`}
            onClick={() => setApplicationFilter('invited')}
          >
            Invited ({effectiveApplications.filter((a) => a.status === 'invited').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'met_with' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setApplicationFilter('met_with')}
          >
            Met with ({effectiveApplications.filter((a) => a.status === 'met_with').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'onboard' ? 'btn-secondary' : 'btn-outline-secondary'}`}
            onClick={() => setApplicationFilter('onboard')}
          >
            Onboard ({effectiveApplications.filter((a) => a.status === 'onboard').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'accepted' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setApplicationFilter('accepted')}
          >
            Accepted ({effectiveApplications.filter((a) => a.status === 'accepted').length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${applicationFilter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setApplicationFilter('rejected')}
          >
            Rejected ({effectiveApplications.filter((a) => a.status === 'rejected').length})
          </button>
        </div>
      </div>

      {filteredEffectiveApplications.length > 0 ? (
        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Age</th>
                <th>School grade</th>
                <th>Review score</th>
                <th>Country</th>
                <th>State / region</th>
                <th>Submitted</th>
                {applicationFilter === 'met_with' && <th>Met with</th>}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredEffectiveApplications.map((app) => (
                <tr key={app.application_id}>
                  <td>{app.full_name}</td>
                  <td>
                    <a href={`mailto:${app.email}`}>{app.email}</a>
                  </td>
                  <td>{app.age != null && app.age !== '' ? app.age : '—'}</td>
                  <td>{app.grade}</td>
                  <td>{app.numeric_grade != null && app.numeric_grade !== '' ? app.numeric_grade : '—'}</td>
                  <td>{app.country || '—'}</td>
                  <td>{app.state || '—'}</td>
                  <td>{formatDateLong(app.submitted_at)}</td>
                  {applicationFilter === 'met_with' && (
                    <td style={{ minWidth: '150px' }}>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        defaultValue={app.met_with_at ? String(app.met_with_at).slice(0, 10) : ''}
                        key={`${app.application_id}-met-${app.met_with_at ?? ''}`}
                        onBlur={(e) => {
                          const next = e.target.value || ''
                          const prev = app.met_with_at ? String(app.met_with_at).slice(0, 10) : ''
                          if (next === prev) return
                          onSetMetWithAt(app.application_id, next)
                        }}
                      />
                    </td>
                  )}
                  <td>
                    <span className={`badge ${applicationStatusBadgeClass(app.status)}`}>
                      {applicationStatusLabel(app.status)}
                    </span>
                  </td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onViewApplication(app)}>
                      <i className="bi bi-eye me-1"></i>View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
          <p>
            No {applicationFilter === 'all' ? '' : `${applicationStatusLabel(applicationFilter).toLowerCase()} `}
            applications found.
          </p>
        </div>
      )}
    </section>
  )
}

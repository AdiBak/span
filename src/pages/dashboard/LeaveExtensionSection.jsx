import React from 'react'
import LeaveExtensionCalendar from '../../components/LeaveExtensionCalendar'

export default function LeaveExtensionSection({
  sectionOrder,
  sectionId,
  leaveExtensionViewMode,
  setLeaveExtensionViewMode,
  viewAsData,
  showExecRequestFilters,
  /** Exec-only: filter leave rows by policy team. Team leads are scoped to one team — hide this. */
  showRequestTeamFilter = true,
  memberRequestFilter,
  setMemberRequestFilter,
  memberRequestTeamFilter,
  setMemberRequestTeamFilter,
  memberRequestTeamFilterOptions,
  resolveRequestTeamName,
  allMemberRequests,
  effectiveRequests,
  formatDate,
  formatDateLong,
  onOpenNewRequest,
  onViewRequest,
}) {
  const isExecDisplay = showExecRequestFilters
  const requests = effectiveRequests

  let body
  if (requests.length > 0) {
    if (leaveExtensionViewMode === 'calendar') {
      body = (
        <LeaveExtensionCalendar
          requests={requests}
          isExecDisplay={isExecDisplay}
          onSelectRequest={onViewRequest}
        />
      )
    } else {
      body = (
        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table table-hover">
            <thead>
              <tr>
                {isExecDisplay && <th>Member</th>}
                {isExecDisplay && <th>Team</th>}
                <th>Type</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.request_id}>
                  {isExecDisplay && (
                    <td>
                      {req.member ? `${req.member.first_name} ${req.member.last_name}` : 'Unknown'}
                      {req.member?.email && <div className="small text-muted">{req.member.email}</div>}
                    </td>
                  )}
                  {isExecDisplay && (
                    <td>
                      {(() => {
                        const teamName = resolveRequestTeamName ? resolveRequestTeamName(req) : 'Unassigned teams'
                        return teamName && teamName !== 'Unassigned teams' ? (
                          <span className="badge bg-light text-dark border">{teamName}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )
                      })()}
                    </td>
                  )}
                  <td>
                    <span className="badge bg-secondary text-capitalize">{req.type}</span>
                  </td>
                  <td>{req.reason}</td>
                  <td>
                    {req.type === 'leave' && (req.leave_start || req.leave_end)
                      ? `${req.leave_start ? formatDate(req.leave_start) : '—'} to ${
                          req.leave_end ? formatDate(req.leave_end) : '—'
                        }`
                      : req.type === 'extension' && (req.project_name || req.requested_by_date)
                        ? [req.project_name, req.requested_by_date ? formatDate(req.requested_by_date) : null]
                            .filter(Boolean)
                            .join(' · ')
                        : '—'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        req.status === 'approved'
                          ? 'bg-success'
                          : req.status === 'declined'
                            ? 'bg-danger'
                            : 'bg-warning text-dark'
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td>{formatDateLong(req.created_at)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => onViewRequest(req)}>
                      <i className="bi bi-eye me-1"></i>View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
  } else {
    body = (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-calendar-x display-4 d-block mb-3"></i>
        <p className="mb-0">
          {isExecDisplay
            ? `No ${memberRequestFilter === 'all' ? '' : memberRequestFilter} leave or extension requests.`
            : 'No leave or extension requests yet. Use the button above to submit one.'}
        </p>
      </div>
    )
  }

  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor" style={{ order: sectionOrder }}>
      <div className="mb-4">
        <h3 className="mb-2">Leave & Extension Requests</h3>
        <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap w-100">
          <div className="d-flex align-items-center gap-2 flex-wrap" style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div className="btn-group flex-shrink-0" role="group" aria-label="Leave requests view">
              <button
                type="button"
                className={`btn btn-sm ${leaveExtensionViewMode === 'calendar' ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => setLeaveExtensionViewMode('calendar')}
              >
                <i className="bi bi-calendar3 me-1"></i>Calendar
              </button>
              <button
                type="button"
                className={`btn btn-sm ${leaveExtensionViewMode === 'table' ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => setLeaveExtensionViewMode('table')}
              >
                <i className="bi bi-table me-1"></i>Table
              </button>
            </div>
            {showExecRequestFilters && (
              <>
                <div className="btn-group flex-shrink-0" role="group" aria-label="Filter by request status">
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setMemberRequestFilter('all')}
                    style={{ flex: '0 0 auto' }}
                  >
                    All ({allMemberRequests.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setMemberRequestFilter('pending')}
                    style={{ flex: '0 0 auto' }}
                  >
                    Pending ({allMemberRequests.filter((r) => r.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setMemberRequestFilter('approved')}
                    style={{ flex: '0 0 auto' }}
                  >
                    Approved ({allMemberRequests.filter((r) => r.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'declined' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setMemberRequestFilter('declined')}
                    style={{ flex: '0 0 auto' }}
                  >
                    Declined ({allMemberRequests.filter((r) => r.status === 'declined').length})
                  </button>
                </div>
                {setMemberRequestTeamFilter && showRequestTeamFilter && (
                  <select
                    className="form-select form-select-sm flex-shrink-0"
                    style={{ width: 'auto', minWidth: '9.5rem', maxWidth: '16rem' }}
                    value={memberRequestTeamFilter || 'all'}
                    onChange={(e) => setMemberRequestTeamFilter(e.target.value)}
                    aria-label="Filter leave requests by team"
                  >
                    {(memberRequestTeamFilterOptions || ['all']).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === 'all' ? 'All teams' : opt}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
          {!viewAsData && (
            <button
              type="button"
              className="btn btn-dark btn-sm flex-shrink-0 align-self-center"
              onClick={onOpenNewRequest}
            >
              <i className="bi bi-plus-circle me-2"></i>Make new request
            </button>
          )}
        </div>
      </div>
      {body}
    </section>
  )
}

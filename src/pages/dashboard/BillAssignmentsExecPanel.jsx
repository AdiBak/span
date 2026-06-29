import React from 'react'
import {
  billAssignmentAssigneeIds,
  billAssignmentDisplayTitle,
  billAssignmentStatusBadgeClass,
  billAssignmentStatusLabel,
} from './billAssignments'

const STATUS_FILTERS = ['all', 'available', 'not_started', 'in_progress', 'completed', 'in_review', 'approved']

/**
 * Exec Bill Management → Assigned bills: filters, accordion, actions.
 */
export default function BillAssignmentsExecPanel({
  billAssignments,
  execAssignmentFilter,
  onExecAssignmentFilterChange,
  execAssignmentTeamFilter = 'all',
  onExecAssignmentTeamFilterChange,
  assignmentTeamFilterOptions = ['all'],
  resolveAssignmentTeamLabel = () => 'Unassigned teams',
  viewAsData,
  onOpenAssignWork,
  formatDate,
  resolveMemberName,
  resolveMemberNames,
  onExecStatus,
  onApproveAndPublish,
  onReopenPublish,
  onEditAssignment,
  onRequestDeleteAssignment,
  /** Hide exec-only publish / approval flows (policy team leads). */
  teamLeadMode = false,
  /** When teamLeadMode, delete only allowed for assignments created by this member. */
  currentMemberId = null,
}) {
  const showStatusBadge = execAssignmentFilter === 'all'
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <div
          className="d-flex align-items-center gap-2 flex-nowrap overflow-auto"
          style={{ minWidth: 0, flex: '1 1 auto' }}
        >
          <div className="btn-group" role="group" aria-label="Filter by assignment status">
            {STATUS_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${execAssignmentFilter === key ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => onExecAssignmentFilterChange(key)}
              >
                {key === 'all'
                  ? `All (${billAssignments.length})`
                  : `${billAssignmentStatusLabel(key)} (${billAssignments.filter((x) => x.status === key).length})`}
              </button>
            ))}
          </div>
          {onExecAssignmentTeamFilterChange && !teamLeadMode && (
            <select
              className="form-select form-select-sm flex-shrink-0"
              style={{ width: 'auto', minWidth: '140px', maxWidth: '220px' }}
              value={execAssignmentTeamFilter}
              onChange={(e) => onExecAssignmentTeamFilterChange(e.target.value)}
              aria-label="Filter assignments by team"
            >
              {assignmentTeamFilterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All teams' : opt}
                </option>
              ))}
            </select>
          )}
        </div>
        {!viewAsData && (
          <button type="button" className="btn btn-dark btn-sm flex-shrink-0" onClick={onOpenAssignWork}>
            <i className="bi bi-plus-circle me-1"></i>Assign work
          </button>
        )}
      </div>
      {(() => {
        const filtered =
          execAssignmentFilter === 'all'
            ? billAssignments
            : billAssignments.filter((x) => x.status === execAssignmentFilter)
        const teamFiltered =
          teamLeadMode || execAssignmentTeamFilter === 'all'
            ? filtered
            : filtered.filter((x) => resolveAssignmentTeamLabel(x) === execAssignmentTeamFilter)
        if (teamFiltered.length === 0) {
          return (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-list-task display-4 d-block mb-3"></i>
              <p>No assignments match this filter.</p>
            </div>
          )
        }
        return (
          <div className="accordion mb-4" id="execBillAssignmentsAccordion" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {teamFiltered.map((a) => {
              const cid = `collapseExecAssign${String(a.assignment_id).replace(/-/g, '')}`
              const assigneeIds = billAssignmentAssigneeIds(a)
              const teamLabel = resolveAssignmentTeamLabel(a)
              return (
                <div key={a.assignment_id} className="accordion-item mb-2 shadow-sm border rounded">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed bg-white text-dark"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#${cid}`}
                      aria-expanded="false"
                    >
                      <div className="d-flex w-100 justify-content-between align-items-center flex-wrap gap-2 pe-2">
                        <span className="fw-bold text-start">{billAssignmentDisplayTitle(a)}</span>
                        {showStatusBadge && (
                          <span className={`badge ${billAssignmentStatusBadgeClass(a.status)}`}>
                            {billAssignmentStatusLabel(a.status)}
                          </span>
                        )}
                        {a.status === 'approved' && a.resulting_bill_id != null && (
                          <span className="badge bg-dark text-nowrap">
                            <i className="bi bi-check2-circle me-1" aria-hidden="true" />
                            Published
                          </span>
                        )}
                        <span className="text-muted small">
                          {assigneeIds.length ? resolveMemberNames(assigneeIds) : resolveMemberName(null)}
                          {a.due_date ? ` · due ${formatDate(a.due_date)}` : ''}
                        </span>
                        {teamLabel && teamLabel !== 'Unassigned teams' && (
                          <span className="badge bg-light text-dark border">{teamLabel}</span>
                        )}
                      </div>
                    </button>
                  </h2>
                  <div id={cid} className="accordion-collapse collapse" data-bs-parent="#execBillAssignmentsAccordion">
                    <div className="accordion-body">
                      <div className="mb-2">
                        <strong>Goal</strong>
                        <p className="mb-0 mt-1">{a.goal}</p>
                      </div>
                      {a.additional_info && (
                        <div className="mb-2">
                          <strong>Additional info</strong>
                          <p className="mb-0 mt-1">{a.additional_info}</p>
                        </div>
                      )}
                      <div className="mb-2 small text-muted">Assigned by {resolveMemberName(a.assigned_by_member_id)}</div>
                      {a.prefill_position && (
                        <div className="mb-2 small">
                          <strong>SPAN position</strong>
                          <span className="text-muted ms-1">{a.prefill_position}</span>
                        </div>
                      )}
                      {a.resulting_bill_id != null && (
                        <p className="small text-success mb-2">Linked published bill #{a.resulting_bill_id}</p>
                      )}
                      {a.status === 'approved' && a.resulting_bill_id == null && (
                        <p className="small text-warning mb-2 mb-md-0">
                          No bill linked yet. If you closed the publish window without saving, use <strong>Publish bill…</strong>{' '}
                          below to open it again with the same prefilled info.
                        </p>
                      )}
                      {(a.deliverable_doc_link || a.deliverable_pdf_url) && (
                        <div className="mb-3">
                          <strong>Deliverables</strong>
                          {a.deliverable_doc_link && (
                            <p className="mb-1 mt-1">
                              <a href={a.deliverable_doc_link} target="_blank" rel="noopener noreferrer">
                                Open doc / link
                              </a>
                            </p>
                          )}
                          {a.deliverable_pdf_url && (
                            <p className="mb-0 mt-1">
                              <a href={a.deliverable_pdf_url} target="_blank" rel="noopener noreferrer">
                                PDF URL
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                      <div className="d-flex flex-wrap gap-2 align-items-center w-100">
                        {!teamLeadMode && a.status === 'completed' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => onExecStatus(a.assignment_id, 'in_review')}
                            >
                              Mark in review
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => onApproveAndPublish(a)}
                            >
                              Approve &amp; publish bill…
                            </button>
                          </>
                        )}
                        {!teamLeadMode && a.status === 'in_review' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => onApproveAndPublish(a)}
                          >
                            Approve &amp; publish bill…
                          </button>
                        )}
                        {!teamLeadMode && a.status === 'approved' && a.resulting_bill_id == null && !viewAsData && (
                          <button
                            type="button"
                            className="btn btn-sm btn-dark"
                            onClick={() => onReopenPublish(a)}
                          >
                            <i className="bi bi-file-earmark-plus me-1"></i>Publish bill…
                          </button>
                        )}
                        {!viewAsData && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => onEditAssignment(a)}
                            >
                              <i className="bi bi-pencil me-1"></i>Edit
                            </button>
                            {(!teamLeadMode ||
                              (currentMemberId != null &&
                                String(a.assigned_by_member_id) === String(currentMemberId))) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger ms-auto"
                                onClick={() => onRequestDeleteAssignment(a)}
                              >
                                <i className="bi bi-trash me-1"></i>Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </>
  )
}

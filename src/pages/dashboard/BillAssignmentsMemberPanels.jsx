import React from 'react'
import {
  billAssignmentAssigneeIds,
  billAssignmentDisplayTitle,
  billAssignmentStatusBadgeClass,
  billAssignmentStatusLabel,
} from './billAssignments'

const MEMBER_STATUS_FILTERS = ['all', 'not_started', 'in_progress', 'completed', 'in_review', 'approved']

/** Bill Submission → Open tasks */
export function BillAssignmentsOpenTasksPanel({
  billAssignments,
  formatDate,
  resolveMemberName,
  onClaim,
}) {
  const pool = billAssignments.filter((a) => a.status === 'available' && billAssignmentAssigneeIds(a).length === 0)
  if (pool.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <i className="bi bi-inbox display-4 d-block mb-3"></i>
        <p>No open tasks right now.</p>
      </div>
    )
  }
  return (
    <div className="accordion mb-4" id="memberOpenTasksAccordion" style={{ maxHeight: '600px', overflowY: 'auto' }}>
      {pool.map((a) => {
        const cid = `collapseOpenTask${String(a.assignment_id).replace(/-/g, '')}`
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
                  <span className={`badge ${billAssignmentStatusBadgeClass(a.status)}`}>
                    {billAssignmentStatusLabel(a.status)}
                  </span>
                  {a.due_date && <span className="text-muted small">Due {formatDate(a.due_date)}</span>}
                </div>
              </button>
            </h2>
            <div id={cid} className="accordion-collapse collapse" data-bs-parent="#memberOpenTasksAccordion">
              <div className="accordion-body">
                <div className="mb-2">
                  <strong>Goal</strong>
                  <p className="mb-0 mt-1">{a.goal}</p>
                </div>
                {a.additional_info && (
                  <div className="mb-3">
                    <strong>Additional info</strong>
                    <p className="mb-0 mt-1">{a.additional_info}</p>
                  </div>
                )}
                <div className="mb-2 small text-muted">Posted by {resolveMemberName(a.assigned_by_member_id)}</div>
                {a.prefill_position && (
                  <div className="mb-2 small">
                    <strong>SPAN position</strong>
                    <span className="text-muted ms-1">{a.prefill_position}</span>
                  </div>
                )}
                <button type="button" className="btn btn-sm btn-primary" onClick={() => onClaim(a.assignment_id)}>
                  <i className="bi bi-hand-index-thumb me-1"></i>Claim this task
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Bill Submission → Assigned to me */
export function BillAssignmentsMemberAssignedPanel({
  billAssignments,
  memberAssignmentFilter,
  onMemberAssignmentFilterChange,
  effectiveMemberId,
  memberDeliverableInputs,
  setMemberDeliverableInputs,
  formatDate,
  viewAsData,
  onSaveDeliverable,
  onAssigneeStatus,
}) {
  const mine = billAssignments.filter((x) => billAssignmentAssigneeIds(x).includes(effectiveMemberId))

  return (
    <>
      {viewAsData &&
        billAssignments.some((a) => a.status === 'available' && billAssignmentAssigneeIds(a).length === 0) && (
          <div className="mb-4 p-3 border rounded bg-light">
            <h4 className="h6 text-muted mb-2">Open tasks (pool)</h4>
            <ul className="list-unstyled mb-0 small">
              {billAssignments
                .filter((a) => a.status === 'available' && billAssignmentAssigneeIds(a).length === 0)
                .map((a) => (
                  <li key={a.assignment_id} className="mb-2">
                    <strong>{billAssignmentDisplayTitle(a)}</strong>
                    {a.due_date ? ` · due ${formatDate(a.due_date)}` : ''}
                  </li>
                ))}
            </ul>
          </div>
        )}
      <p className="text-muted small mb-3">
        Work items assigned by the exec team. A task may be shared with several members—everyone sees the same deliverables and
        status. Add both a proposal doc link and a proposal PDF URL, save, then mark complete when ready for review.
      </p>
      <div className="btn-group flex-wrap mb-3" role="group">
        {MEMBER_STATUS_FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            className={`btn btn-sm ${memberAssignmentFilter === key ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => onMemberAssignmentFilterChange(key)}
          >
            {key === 'all'
              ? `All (${mine.length})`
              : `${billAssignmentStatusLabel(key)} (${mine.filter((x) => x.status === key).length})`}
          </button>
        ))}
      </div>
      {(() => {
        const filtered =
          memberAssignmentFilter === 'all' ? mine : mine.filter((x) => x.status === memberAssignmentFilter)
        if (filtered.length === 0) {
          return (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-inbox display-4 d-block mb-3"></i>
              <p>No assignments in this view.</p>
            </div>
          )
        }
        return (
          <div className="accordion mb-4" id="memberBillAssignmentsAccordion" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filtered.map((a) => {
              const cid = `collapseMemberAssign${String(a.assignment_id).replace(/-/g, '')}`
              const draft = memberDeliverableInputs[a.assignment_id] || {
                doc: a.deliverable_doc_link || '',
                pdf: a.deliverable_pdf_url || '',
              }
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
                        <span className={`badge ${billAssignmentStatusBadgeClass(a.status)}`}>
                          {billAssignmentStatusLabel(a.status)}
                        </span>
                        {a.due_date && <span className="text-muted small">Due {formatDate(a.due_date)}</span>}
                      </div>
                    </button>
                  </h2>
                  <div id={cid} className="accordion-collapse collapse" data-bs-parent="#memberBillAssignmentsAccordion">
                    <div className="accordion-body">
                      <div className="mb-2">
                        <strong>Goal</strong>
                        <p className="mb-0 mt-1">{a.goal}</p>
                      </div>
                      {a.additional_info && (
                        <div className="mb-3">
                          <strong>Additional info</strong>
                          <p className="mb-0 mt-1">{a.additional_info}</p>
                        </div>
                      )}
                      {a.prefill_position && (
                        <div className="mb-2 small">
                          <strong>SPAN position</strong>
                          <span className="text-muted ms-1">{a.prefill_position}</span>
                        </div>
                      )}
                      <div className="mb-2">
                        <label className="form-label small mb-0">
                          Proposal doc link <span className="text-danger">*</span>
                        </label>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          placeholder="https://docs.google.com/..."
                          value={draft.doc}
                          disabled={a.status === 'approved' || viewAsData}
                          onChange={(e) =>
                            setMemberDeliverableInputs((prev) => ({
                              ...prev,
                              [a.assignment_id]: { ...draft, doc: e.target.value },
                            }))
                          }
                        />
                        <small className="text-muted">Provide a link to the proposal doc so it can be edited.</small>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small mb-0">
                          Proposal PDF URL <span className="text-danger">*</span>
                        </label>
                        <input
                          type="url"
                          className="form-control form-control-sm"
                          placeholder="https://drive.google.com/... or direct PDF link"
                          value={draft.pdf}
                          disabled={a.status === 'approved' || viewAsData}
                          onChange={(e) =>
                            setMemberDeliverableInputs((prev) => ({
                              ...prev,
                              [a.assignment_id]: { ...draft, pdf: e.target.value },
                            }))
                          }
                        />
                        <small className="text-muted">Link to the PDF (e.g. shared Drive file).</small>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {a.status !== 'approved' && !viewAsData && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => onSaveDeliverable(a.assignment_id)}
                          >
                            Save deliverables
                          </button>
                        )}
                        {a.status === 'not_started' && !viewAsData && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => onAssigneeStatus(a.assignment_id, 'in_progress')}
                          >
                            Start work
                          </button>
                        )}
                        {(a.status === 'in_progress' || a.status === 'not_started') && !viewAsData && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => onAssigneeStatus(a.assignment_id, 'completed')}
                          >
                            Mark complete for review
                          </button>
                        )}
                      </div>
                      {a.status === 'completed' && (
                        <p className="small text-muted mt-2 mb-0">Submitted — waiting for exec review.</p>
                      )}
                      {a.status === 'in_review' && (
                        <p className="small text-warning mt-2 mb-0">In review by exec team.</p>
                      )}
                      {a.status === 'approved' && <p className="small text-success mt-2 mb-0">Approved. Thank you!</p>}
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

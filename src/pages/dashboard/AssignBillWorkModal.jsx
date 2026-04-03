import React from 'react'
import { canonicalUSStateName } from '../../lib/usStateCanonical'
import { assignTaskPrefillBillOptionLabel, normalizeBillFormPosition } from './billAssignments'

/**
 * Exec: create / edit bill assignment (prefill, topic, assignees, open pool).
 */
export default function AssignBillWorkModal({
  open,
  editingAssignment,
  assignBillForm,
  setAssignBillForm,
  assignBillError,
  assignBillSaving,
  assignPrefillBillChoices,
  allBills,
  assigneePickerMembers,
  resolveMemberName,
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
        <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingAssignment ? 'Edit assignment' : 'Assign work'}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="border rounded p-3 mb-3 bg-light">
                <label className="form-label fw-semibold">Bill prefill (optional)</label>
                <p className="small text-muted mb-2">
                  When you approve this task, the bill form opens with these fields filled; assignees become collaborators.
                </p>
                <div className="mb-3">
                  <label className="form-label small mb-1" htmlFor="assign-prefill-bill-select">
                    Prefill from existing bill
                  </label>
                  <select
                    id="assign-prefill-bill-select"
                    className="form-select form-select-sm"
                    value={assignBillForm.prefillSourceBillId}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) {
                        setAssignBillForm((f) => ({ ...f, prefillSourceBillId: '' }))
                        return
                      }
                      const bill = allBills.find((b) => String(b.bill_id) === v)
                      if (!bill) return
                      setAssignBillForm((f) => ({
                        ...f,
                        prefillSourceBillId: v,
                        prefillState: canonicalUSStateName(bill.state) || String(bill.state || '').trim(),
                        prefillBillName: String(bill.name || '').trim(),
                        prefillPosition: normalizeBillFormPosition(bill.position),
                      }))
                    }}
                  >
                    <option value="">— None (enter state / bill # below) —</option>
                    {assignPrefillBillChoices.map((b) => (
                      <option key={b.bill_id} value={String(b.bill_id)} title={assignTaskPrefillBillOptionLabel(b)}>
                        {assignTaskPrefillBillOptionLabel(b)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row g-2">
                  <div className="col-md-4">
                    <label className="form-label small mb-0">State</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. OH or Ohio"
                      value={assignBillForm.prefillState}
                      onChange={(e) =>
                        setAssignBillForm({
                          ...assignBillForm,
                          prefillState: e.target.value,
                          prefillSourceBillId: '',
                        })
                      }
                    />
                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                      Saved as full name (CA → California) for grouping.
                    </span>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small mb-0">Bill name / number</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. HB 123"
                      value={assignBillForm.prefillBillName}
                      onChange={(e) =>
                        setAssignBillForm({
                          ...assignBillForm,
                          prefillBillName: e.target.value,
                          prefillSourceBillId: '',
                        })
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small mb-0">SPAN position</label>
                    <select
                      className="form-select form-select-sm"
                      value={assignBillForm.prefillPosition}
                      onChange={(e) =>
                        setAssignBillForm({
                          ...assignBillForm,
                          prefillPosition: e.target.value,
                          prefillSourceBillId: '',
                        })
                      }
                    >
                      <option value="Support">Support</option>
                      <option value="Oppose">Oppose</option>
                      <option value="Support If Amended">Support If Amended</option>
                      <option value="Propose">Propose</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Topic / concept</label>
                <input
                  type="text"
                  className="form-control"
                  value={assignBillForm.title}
                  onChange={(e) => setAssignBillForm({ ...assignBillForm, title: e.target.value })}
                  placeholder="Short title"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Goal</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={assignBillForm.goal}
                  onChange={(e) => setAssignBillForm({ ...assignBillForm, goal: e.target.value })}
                  placeholder="What should be delivered?"
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Additional info (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={assignBillForm.additionalInfo}
                  onChange={(e) => setAssignBillForm({ ...assignBillForm, additionalInfo: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Who is this for?</label>
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="assignBillMode"
                    id="assignBillDirect"
                    checked={!assignBillForm.poolOpen}
                    onChange={() => setAssignBillForm((f) => ({ ...f, poolOpen: false }))}
                  />
                  <label className="form-check-label" htmlFor="assignBillDirect">
                    Assign to one or more members (shared task)
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="assignBillMode"
                    id="assignBillPool"
                    checked={assignBillForm.poolOpen}
                    onChange={() => setAssignBillForm((f) => ({ ...f, poolOpen: true }))}
                  />
                  <label className="form-check-label" htmlFor="assignBillPool">
                    Post as an <strong>open task</strong> — shown under Bill Submission → Open tasks.{' '}
                    <strong>One person</strong> can claim it (first come, first served); not a shared assignee list.
                  </label>
                </div>
              </div>
              {!assignBillForm.poolOpen && (
                <div className="mb-3">
                  <label className="form-label">Assignees</label>
                  <p className="form-text small text-muted mb-2">
                    Only members with <strong>Bill</strong> permission. Everyone checked shares the same task; deliverables and
                    status update for all.
                  </p>
                  {assigneePickerMembers.length === 0 && assignBillForm.assigneeMemberIds.length === 0 ? (
                    <div className="alert alert-warning small mb-0 py-2">
                      No members have Bill permission yet. Enable it in Member Management for at least one member, or choose an
                      open task instead.
                    </div>
                  ) : (
                    <>
                      {assigneePickerMembers.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mb-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              setAssignBillForm((f) => {
                                const extra = f.assigneeMemberIds.filter(
                                  (id) => !assigneePickerMembers.some((m) => m.member_id === id)
                                )
                                return {
                                  ...f,
                                  assigneeMemberIds: [...extra, ...assigneePickerMembers.map((m) => m.member_id)],
                                }
                              })
                            }
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setAssignBillForm((f) => ({ ...f, assigneeMemberIds: [] }))}
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                      <div className="border rounded p-2 bg-light" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {assignBillForm.assigneeMemberIds
                          .filter((id) => !assigneePickerMembers.some((m) => m.member_id === id))
                          .map((id) => (
                            <div key={`extra-${id}`} className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`assignee-modal-${id}`}
                                checked
                                onChange={() => {
                                  setAssignBillForm((f) => ({
                                    ...f,
                                    assigneeMemberIds: f.assigneeMemberIds.filter((x) => x !== id),
                                  }))
                                }}
                              />
                              <label className="form-check-label" htmlFor={`assignee-modal-${id}`}>
                                {resolveMemberName(id)} <span className="text-muted small">(current)</span>
                              </label>
                            </div>
                          ))}
                        {assigneePickerMembers.map((m) => {
                          const mid = m.member_id
                          const checked = assignBillForm.assigneeMemberIds.includes(mid)
                          return (
                            <div key={mid} className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`assignee-modal-${mid}`}
                                checked={checked}
                                onChange={() => {
                                  setAssignBillForm((f) => {
                                    const next = new Set(f.assigneeMemberIds)
                                    if (next.has(mid)) next.delete(mid)
                                    else next.add(mid)
                                    return { ...f, assigneeMemberIds: [...next] }
                                  })
                                }}
                              />
                              <label className="form-check-label" htmlFor={`assignee-modal-${mid}`}>
                                {m.first_name} {m.last_name}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Due date (optional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={assignBillForm.dueDate}
                  onChange={(e) => setAssignBillForm({ ...assignBillForm, dueDate: e.target.value })}
                />
              </div>
              {assignBillError && <div className="text-danger small">{assignBillError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-dark"
                disabled={
                  assignBillSaving ||
                  (!assignBillForm.poolOpen &&
                    assigneePickerMembers.length === 0 &&
                    assignBillForm.assigneeMemberIds.length === 0 &&
                    !editingAssignment)
                }
                onClick={onSave}
              >
                {assignBillSaving ? 'Saving…' : editingAssignment ? 'Save changes' : 'Create assignment'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
    </>
  )
}

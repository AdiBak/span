import React, { useEffect, useMemo, useState } from 'react'
import { memberLegalName, memberSiteDisplayName } from '../../lib/memberDisplayName'

export default function VolunteerEntryModal({
  open,
  volunteerForm,
  setVolunteerForm,
  volunteerError,
  onClose,
  onSave,
  /** When true, show member picker so supervisors can issue hours for others. */
  canIssueForOthers = false,
  memberOptions = [],
  currentMemberId = null,
}) {
  const [memberFilter, setMemberFilter] = useState('')

  useEffect(() => {
    if (open) setMemberFilter('')
  }, [open])

  const sortedOptions = useMemo(() => {
    const rows = (memberOptions || []).filter((m) => m && m.member_id)
    return [...rows].sort((a, b) =>
      memberLegalName(a).localeCompare(memberLegalName(b), undefined, { sensitivity: 'base' }),
    )
  }, [memberOptions])

  const filteredOptions = useMemo(() => {
    const q = memberFilter.trim().toLowerCase()
    if (!q) return sortedOptions
    return sortedOptions.filter((m) => {
      const legal = memberLegalName(m).toLowerCase()
      const site = memberSiteDisplayName(m).toLowerCase()
      const email = String(m.email || '').toLowerCase()
      return legal.includes(q) || site.includes(q) || email.includes(q)
    })
  }, [sortedOptions, memberFilter])

  const selectedIds = useMemo(() => {
    const raw = volunteerForm.forMemberIds
    if (Array.isArray(raw) && raw.length) return raw.map(String)
    if (volunteerForm.forMemberId) return [String(volunteerForm.forMemberId)]
    if (currentMemberId) return [String(currentMemberId)]
    return []
  }, [volunteerForm.forMemberIds, volunteerForm.forMemberId, currentMemberId])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const othersSelected = selectedIds.some((id) => String(id) !== String(currentMemberId))
  const issuingForOthers = canIssueForOthers && othersSelected
  const issuedOtherCount = selectedIds.filter((id) => String(id) !== String(currentMemberId)).length

  const setSelectedIds = (ids) => {
    setVolunteerForm({ ...volunteerForm, forMemberIds: ids.map(String), forMemberId: '' })
  }

  const toggleMember = (memberId) => {
    const id = String(memberId)
    const next = new Set(selectedSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(Array.from(next))
  }

  const selectAllFiltered = () => {
    const next = new Set(selectedSet)
    for (const m of filteredOptions) next.add(String(m.member_id))
    setSelectedIds(Array.from(next))
  }

  const selectOnlySelf = () => {
    if (currentMemberId) setSelectedIds([String(currentMemberId)])
  }

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
                {issuingForOthers ? 'Issue Volunteer Hours' : 'Add Volunteer Entry'}
              </h5>
              <button type="button" className="btn-close" onClick={() => onClose()}></button>
            </div>
            <div className="modal-body">
              {canIssueForOthers && (
                <div className="mb-3">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                    <label className="form-label mb-0" id="volunteer-for-members-label">
                      Members ({selectedIds.length} selected)
                    </label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={selectAllFiltered}
                        disabled={filteredOptions.length === 0}
                      >
                        Select all{memberFilter ? ' (filtered)' : ''}
                      </button>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={selectOnlySelf}
                        disabled={!currentMemberId}
                      >
                        Only me
                      </button>
                    </div>
                  </div>
                  <input
                    type="search"
                    className="form-control form-control-sm mb-2"
                    placeholder="Filter by name…"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    autoComplete="off"
                  />
                  <div
                    className="border rounded bg-white px-2 py-2"
                    style={{ maxHeight: '180px', overflowY: 'auto' }}
                    role="group"
                    aria-labelledby="volunteer-for-members-label"
                  >
                    {filteredOptions.length === 0 ? (
                      <p className="small text-muted mb-0">No members match this filter.</p>
                    ) : (
                      filteredOptions.map((m) => {
                        const id = String(m.member_id)
                        const legal = memberLegalName(m) || id
                        const site = memberSiteDisplayName(m)
                        const label = site && site !== legal ? `${legal} (${site})` : legal
                        const selfTag = id === String(currentMemberId) ? ' — you' : ''
                        const checked = selectedSet.has(id)
                        return (
                          <div key={id} className="form-check py-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`vol-member-${id}`}
                              checked={checked}
                              onChange={() => toggleMember(id)}
                            />
                            <label className="form-check-label small" htmlFor={`vol-member-${id}`}>
                              {label}
                              {selfTag}
                            </label>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <small className="text-muted">
                    {selectedIds.length === 0
                      ? 'Select who should receive these hours. Use Only me for your own pending request.'
                      : issuingForOthers
                        ? 'Others get approved hours immediately. If you include yourself, your row stays pending.'
                        : 'Your own request will be submitted as pending approval.'}
                  </small>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Job Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={volunteerForm.jobTitle}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, jobTitle: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Job Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={volunteerForm.jobDesc}
                  onChange={(e) => setVolunteerForm({ ...volunteerForm, jobDesc: e.target.value })}
                  required
                ></textarea>
              </div>
              <div className="mb-3">
                <label className="form-label">Input Method</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="inputMode"
                    id="inputModeDatetime"
                    checked={volunteerForm.inputMode === 'datetime'}
                    onChange={() => setVolunteerForm({ ...volunteerForm, inputMode: 'datetime' })}
                  />
                  <label className="btn btn-outline-primary" htmlFor="inputModeDatetime">
                    <i className="bi bi-calendar-range me-1"></i>Date & Time Range
                  </label>
                  <input
                    type="radio"
                    className="btn-check"
                    name="inputMode"
                    id="inputModeHours"
                    checked={volunteerForm.inputMode === 'hours'}
                    onChange={() => setVolunteerForm({ ...volunteerForm, inputMode: 'hours' })}
                  />
                  <label className="btn btn-outline-primary" htmlFor="inputModeHours">
                    <i className="bi bi-clock me-1"></i>Hours Only
                  </label>
                </div>
              </div>
              {volunteerForm.inputMode === 'datetime' ? (
                <div className="mb-3 row">
                  <div className="col-md-6">
                    <label className="form-label">Start Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={volunteerForm.startTime}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, startTime: e.target.value })}
                      required={volunteerForm.inputMode === 'datetime'}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={volunteerForm.endTime}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, endTime: e.target.value })}
                      required={volunteerForm.inputMode === 'datetime'}
                    />
                  </div>
                </div>
              ) : (
                <div className="mb-3 row">
                  <div className="col-md-6">
                    <label className="form-label">Work Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={volunteerForm.workDate}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, workDate: e.target.value })}
                      required={volunteerForm.inputMode === 'hours'}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Hours</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.25"
                      min="0.25"
                      value={volunteerForm.hours}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, hours: e.target.value })}
                      placeholder="e.g., 2.5 for 2 hours 30 minutes"
                      required={volunteerForm.inputMode === 'hours'}
                    />
                    <small className="text-muted">Enter hours as a decimal (e.g., 2.5 = 2h 30m)</small>
                  </div>
                </div>
              )}
              {volunteerError && <div className="text-danger mt-2">{volunteerError}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-dark" onClick={() => onClose()}>
                Cancel
              </button>
              <button type="button" className="btn btn-dark" onClick={onSave}>
                {issuingForOthers ? `Issue hours (${issuedOtherCount})` : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
    </>
  )
}

import React, { useEffect, useState } from 'react'

/**
 * Create / edit SPAN org events (exec) or team deadlines (team lead / exec).
 */
export default function CalendarEventModal({
  open,
  onClose,
  mode, // 'span_event' | 'deadline'
  event = null, // existing row when editing
  teamOptions = [], // [{ team_id, name }]
  canEdit = false,
  canDelete = false,
  saving = false,
  onSave,
  onDelete,
}) {
  const isEdit = !!event?.event_id
  const kind = event?.kind || mode || 'span_event'
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (event) {
      setTitle(event.title || '')
      setStartDate(String(event.start_date || '').slice(0, 10))
      setEndDate(event.end_date ? String(event.end_date).slice(0, 10) : '')
      setTeamId(event.team_id ? String(event.team_id) : '')
    } else {
      setTitle('')
      setStartDate('')
      setEndDate('')
      setTeamId(teamOptions[0]?.team_id ? String(teamOptions[0].team_id) : '')
    }
  }, [open, event, teamOptions])

  if (!open) return null

  const titleLabel = kind === 'deadline' ? 'Deadline' : 'SPAN event'
  const readOnly = isEdit && !canEdit

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    const t = title.trim()
    if (!t) {
      setError('Title is required.')
      return
    }
    if (!startDate) {
      setError('Start date is required.')
      return
    }
    if (kind === 'deadline' && !teamId) {
      setError('Choose a team for this deadline.')
      return
    }
    if (endDate && endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }
    await onSave?.({
      event_id: event?.event_id,
      kind,
      title: t,
      start_date: startDate,
      end_date: kind === 'span_event' && endDate ? endDate : null,
      team_id: kind === 'deadline' ? teamId : null,
    })
  }

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: 'block', zIndex: 1065 }}
        onClick={(e) => {
          if (e.target.className.includes('modal fade show')) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? (readOnly ? titleLabel : `Edit ${titleLabel.toLowerCase()}`) : `Add ${titleLabel.toLowerCase()}`}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}
                <div className="mb-3">
                  <label className="form-label" htmlFor="calEventTitle">
                    Title
                  </label>
                  <input
                    id="calEventTitle"
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={readOnly || saving}
                    required
                  />
                </div>
                <div className="row g-2 mb-3">
                  <div className={kind === 'span_event' ? 'col-md-6' : 'col-12'}>
                    <label className="form-label" htmlFor="calEventStart">
                      {kind === 'deadline' ? 'Date' : 'Start date'}
                    </label>
                    <input
                      id="calEventStart"
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={readOnly || saving}
                      required
                    />
                  </div>
                  {kind === 'span_event' && (
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="calEventEnd">
                        End date (optional)
                      </label>
                      <input
                        id="calEventEnd"
                        type="date"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={readOnly || saving}
                      />
                    </div>
                  )}
                </div>
                {kind === 'deadline' && (
                  <div className="mb-0">
                    <label className="form-label" htmlFor="calEventTeam">
                      Team
                    </label>
                    <select
                      id="calEventTeam"
                      className="form-select"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      disabled={readOnly || saving || (isEdit && teamOptions.length <= 1)}
                      required
                    >
                      {!teamId && <option value="">Select team…</option>}
                      {teamOptions.map((t) => (
                        <option key={t.team_id} value={t.team_id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {isEdit && canDelete && (
                  <button
                    type="button"
                    className="btn btn-outline-danger me-auto"
                    disabled={saving}
                    onClick={() => onDelete?.(event)}
                  >
                    Delete
                  </button>
                )}
                <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
                  {readOnly ? 'Close' : 'Cancel'}
                </button>
                {!readOnly && (
                  <button type="submit" className="btn btn-dark" disabled={saving}>
                    {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} />
    </>
  )
}

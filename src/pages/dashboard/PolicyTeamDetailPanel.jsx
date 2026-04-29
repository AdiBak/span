import React, { useEffect, useMemo, useState } from 'react'

function roleLabel(member) {
  const r = String(member?.role || '').trim()
  return r || '—'
}

/**
 * Right pane: edit one policy team (lead, roster, batch add, delete). Used in split policy-teams layout.
 */
export default function PolicyTeamDetailPanel({
  team,
  billsOnly,
  leadChoices,
  rosterMemberIds,
  getMember,
  memberTeamId,
  saving,
  onSetLead,
  onAddMembersToTeam,
  onRemoveMemberFromTeam,
  onDeleteTeam,
}) {
  const [selectedAddIds, setSelectedAddIds] = useState(() => new Set())

  const rosterSet = useMemo(() => new Set((rosterMemberIds || []).map((id) => String(id))), [rosterMemberIds])

  const eligibleToAdd = useMemo(() => {
    return (billsOnly || []).filter((m) => !rosterSet.has(String(m.member_id)))
  }, [billsOnly, rosterSet])

  useEffect(() => {
    if (team?.team_id) setSelectedAddIds(new Set())
  }, [team?.team_id])

  if (!team) {
    return (
      <div className="border rounded bg-light d-flex align-items-center justify-content-center p-4 text-muted small" style={{ minHeight: '240px' }}>
        Select a team on the left to view and edit lead, roster, and members.
      </div>
    )
  }

  const rosterIds = rosterMemberIds || []
  const leadId = `policy-team-lead-${team.team_id}`
  const addGroupId = `policy-team-add-heading-${team.team_id}`

  const toggleAddId = (memberId) => {
    const k = String(memberId)
    setSelectedAddIds((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const selectAllEligible = () => {
    setSelectedAddIds(new Set(eligibleToAdd.map((m) => String(m.member_id))))
  }

  const clearSelection = () => setSelectedAddIds(new Set())

  const handleAddSelected = () => {
    const ids = Array.from(selectedAddIds)
    if (!ids.length) return
    onAddMembersToTeam(ids, team.team_id)
    setSelectedAddIds(new Set())
  }

  return (
    <div className="border rounded p-3 h-100" style={{ maxHeight: 'min(70vh, 640px)', overflowY: 'auto' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h6 className="mb-0 fw-bold">{team.name}</h6>
          {team.active === false && <span className="badge bg-secondary mt-1">inactive</span>}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          disabled={saving}
          onClick={() => onDeleteTeam(team)}
        >
          Delete team
        </button>
      </div>

      <p className="small text-muted mb-3">
        Bill-permission members only. Choose a lead from members who have &quot;team lead&quot; in their role (their title still appears below).
      </p>

      <div className="mb-3">
        <label className="form-label fw-semibold small mb-1" htmlFor={leadId}>
          Team lead
        </label>
        <select
          id={leadId}
          className="form-select form-select-sm"
          value={team.lead_member_id || ''}
          onChange={(e) => onSetLead(team.team_id, e.target.value)}
          disabled={saving}
        >
          <option value="">— No lead —</option>
          {leadChoices.map((m) => (
            <option key={m.member_id} value={m.member_id}>
              {m.first_name} {m.last_name} · {roleLabel(m)}
            </option>
          ))}
        </select>
        {team.lead_member_id && getMember?.(team.lead_member_id) && (
          <p className="small text-muted mb-0 mt-2">
            Role on file: <span className="text-dark">{roleLabel(getMember(team.lead_member_id))}</span>
          </p>
        )}
      </div>

      <div className="mb-3">
        <div className="fw-semibold small mb-2">Roster ({rosterIds.length})</div>
        {rosterIds.length === 0 ? (
          <p className="text-muted small mb-0">No members yet. Add people below.</p>
        ) : (
          <ul className="list-group list-group-flush border rounded small">
            {rosterIds.map((id) => {
              const m = getMember?.(id)
              const name = m
                ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown'
                : String(id)
              return (
                <li
                  key={id}
                  className="list-group-item d-flex justify-content-between align-items-start gap-2 py-2"
                >
                  <div>
                    <div>{name}</div>
                    <div className="small text-muted">Role: {m ? roleLabel(m) : '—'}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary flex-shrink-0"
                    disabled={saving}
                    onClick={() => onRemoveMemberFromTeam(id)}
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border rounded p-3 bg-light">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <span className="form-label small fw-semibold mb-0" id={addGroupId}>
            Add members to this team
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              disabled={saving || eligibleToAdd.length === 0}
              onClick={selectAllEligible}
            >
              Select all
            </button>
            <button
              type="button"
              className="btn btn-link btn-sm p-0"
              disabled={saving || selectedAddIds.size === 0}
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        </div>
        {eligibleToAdd.length === 0 ? (
          <p className="small text-muted mb-0">Everyone with Bill permission is already on this roster.</p>
        ) : (
          <>
            <div
              className="border rounded bg-white px-2 py-2"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
              role="group"
              aria-labelledby={addGroupId}
            >
              {eligibleToAdd.map((m) => {
                const id = String(m.member_id)
                const checked = selectedAddIds.has(id)
                const moveNote =
                  memberTeamId[m.member_id] && memberTeamId[m.member_id] !== team.team_id
                    ? ' (moves from another team)'
                    : ''
                return (
                  <div key={id} className="form-check py-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`add-${team.team_id}-${id}`}
                      checked={checked}
                      onChange={() => toggleAddId(id)}
                      disabled={saving}
                    />
                    <label className="form-check-label small" htmlFor={`add-${team.team_id}-${id}`}>
                      {m.first_name} {m.last_name}
                      <span className="text-muted"> · {roleLabel(m)}</span>
                      {moveNote && <span className="text-warning">{moveNote}</span>}
                    </label>
                  </div>
                )
              })}
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
              <button
                type="button"
                className="btn btn-sm btn-dark"
                disabled={saving || selectedAddIds.size === 0}
                onClick={handleAddSelected}
              >
                Add selected{selectedAddIds.size ? ` (${selectedAddIds.size})` : ''}
              </button>
              <p className="small text-muted mb-0">
                One team per member — adding someone already on another team moves them here.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

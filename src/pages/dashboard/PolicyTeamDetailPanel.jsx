import React, { useEffect, useMemo, useState } from 'react'

function roleLabel(member) {
  const r = String(member?.role || '').trim()
  return r || '—'
}

/** Matches DB index `idx_policy_teams_name_lower` (lower(trim(name))). */
function normalizedPolicyTeamName(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * Right pane: edit one policy team (lead, roster, batch add, delete). Used in split policy-teams layout.
 */
export default function PolicyTeamDetailPanel({
  team,
  membersPool,
  leadChoices,
  rosterMemberIds,
  getMember,
  memberTeamId,
  saving,
  onSetTeamLeads,
  onAddMembersToTeam,
  onRemoveMemberFromTeam,
  onDeleteTeam,
  onRenameTeam,
  /** Map member_id → team_id where they are already a designated lead (exclude from other teams’ adds/leads). */
  leadMemberIdToTeamId = {},
  teamNameById = {},
  /** Policy/bill teams vs marketing/blog/general (copy + lead eligibility differ in parent). */
  isPolicyTeam = true,
}) {
  const [selectedAddIds, setSelectedAddIds] = useState(() => new Set())
  const [nameInput, setNameInput] = useState('')

  const rosterSet = useMemo(() => new Set((rosterMemberIds || []).map((id) => String(id))), [rosterMemberIds])

  const leadIdSet = useMemo(
    () => new Set((team?.lead_member_ids || []).map((id) => String(id))),
    [team?.lead_member_ids]
  )

  const eligibleToAdd = useMemo(() => {
    const curTid = team?.team_id != null ? String(team.team_id) : null
    return (membersPool || []).filter((m) => {
      const id = String(m.member_id)
      if (rosterSet.has(id) || leadIdSet.has(id)) return false
      const ledTeam = leadMemberIdToTeamId[id]
      if (ledTeam != null && curTid != null && String(ledTeam) !== curTid) return false
      return true
    })
  }, [membersPool, rosterSet, leadIdSet, leadMemberIdToTeamId, team?.team_id])

  useEffect(() => {
    if (team?.team_id) setSelectedAddIds(new Set())
  }, [team?.team_id])

  useEffect(() => {
    if (team?.name != null) setNameInput(String(team.name))
  }, [team?.team_id, team?.name])

  useEffect(() => {
    const curTid = team?.team_id != null ? String(team.team_id) : null
    setSelectedAddIds((prev) => {
      const next = new Set()
      for (const id of prev) {
        if (rosterSet.has(id) || leadIdSet.has(id)) continue
        const ledTeam = leadMemberIdToTeamId[id]
        if (ledTeam != null && curTid != null && String(ledTeam) !== curTid) continue
        next.add(id)
      }
      return next
    })
  }, [rosterSet, leadIdSet, leadMemberIdToTeamId, team?.team_id])

  if (!team) {
    return (
      <div className="border rounded bg-light d-flex align-items-center justify-content-center p-4 text-muted small" style={{ minHeight: '240px' }}>
        Select a team on the left to view and edit lead, roster, and members.
      </div>
    )
  }

  const rosterIds = rosterMemberIds || []
  const leadDisplayIds = team.lead_member_ids || []
  const nonLeadRosterIds = rosterIds.filter((id) => !leadIdSet.has(String(id)))
  const rosterListCount = leadDisplayIds.length + nonLeadRosterIds.length
  const leadGroupId = `policy-team-leads-${team.team_id}`
  const addGroupId = `policy-team-add-heading-${team.team_id}`

  const toggleLeadId = (memberId) => {
    const k = String(memberId)
    const next = new Set(leadIdSet)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    onSetTeamLeads(team.team_id, Array.from(next))
  }

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
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div className="flex-grow-1" style={{ minWidth: 'min(100%, 18rem)' }}>
          <label className="form-label small mb-1 fw-semibold" htmlFor={`policy-team-name-${team.team_id}`}>
            Team name
          </label>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              id={`policy-team-name-${team.team_id}`}
              type="text"
              className="form-control form-control-sm"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={saving}
              autoComplete="off"
              style={{ maxWidth: '22rem' }}
            />
            <button
              type="button"
              className="btn btn-sm btn-dark"
              disabled={saving || normalizedPolicyTeamName(nameInput) === normalizedPolicyTeamName(team.name)}
              onClick={() => onRenameTeam?.(team.team_id, nameInput)}
            >
              Save name
            </button>
          </div>
          <p className="small text-muted mb-0 mt-1">
            Must be unique among all teams (spacing and capital letters are ignored).
          </p>
          {team.active === false && <span className="badge bg-secondary mt-2">inactive</span>}
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger align-self-start"
          disabled={saving}
          onClick={() => onDeleteTeam(team)}
        >
          Delete team
        </button>
      </div>

      <p className="small text-muted mb-3">
        {isPolicyTeam ? (
          <>
            Bill-permission members only. Check everyone who should be a team lead — they must have &quot;team lead&quot; in
            their role. Someone already a lead on another team must be removed there before they can be added here.
          </>
        ) : (
          <>
            Any active member can be on the roster or be chosen as a team lead. Someone already a lead on another team must
            be removed there before they can be added here.
          </>
        )}
      </p>

      <div className="mb-3">
        <span className="form-label fw-semibold small mb-2 d-block" id={leadGroupId}>
          Team leads
        </span>
        {leadChoices.length === 0 ? (
          <p className="small text-muted mb-0">
            {isPolicyTeam
              ? 'No eligible leads (need Bill permission and "team lead" in role).'
              : 'No active members available for lead selection.'}
          </p>
        ) : (
          <div
            className="border rounded bg-white px-2 py-2"
            style={{ maxHeight: '180px', overflowY: 'auto' }}
            role="group"
            aria-labelledby={leadGroupId}
          >
            {leadChoices.map((m) => {
              const id = String(m.member_id)
              const checked = leadIdSet.has(id)
              const ledTeam = leadMemberIdToTeamId[id]
              const blockedElsewhere =
                ledTeam != null && String(ledTeam) !== String(team.team_id)
              const otherName = blockedElsewhere ? teamNameById[String(ledTeam)] || 'another team' : ''
              return (
                <div key={id} className="form-check py-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`lead-${team.team_id}-${id}`}
                    checked={checked}
                    onChange={() => toggleLeadId(id)}
                    disabled={saving || blockedElsewhere}
                    title={
                      blockedElsewhere
                        ? `Already a team lead for ${otherName}. Remove them there first.`
                        : undefined
                    }
                  />
                  <label
                    className={`form-check-label small ${blockedElsewhere ? 'text-muted' : ''}`}
                    htmlFor={`lead-${team.team_id}-${id}`}
                  >
                    {m.first_name} {m.last_name}
                    <span className="text-muted"> · {roleLabel(m)}</span>
                    {blockedElsewhere && (
                      <span className="text-muted"> — lead on {otherName}</span>
                    )}
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="fw-semibold small mb-2">Roster ({rosterListCount})</div>
        {rosterListCount === 0 ? (
          <p className="text-muted small mb-0">No members yet. Add people below.</p>
        ) : (
          <ul className="list-group list-group-flush border rounded small">
            {leadDisplayIds.map((id) => {
              const m = getMember?.(id)
              const name = m
                ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Unknown'
                : String(id)
              const onRoster = rosterSet.has(String(id))
              return (
                <li
                  key={`lead-${id}`}
                  className="list-group-item d-flex justify-content-between align-items-start gap-2 py-2"
                >
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span>{name}</span>
                      <span className="badge bg-dark">Lead</span>
                    </div>
                    <div className="small text-muted">Role: {m ? roleLabel(m) : '—'}</div>
                  </div>
                  {onRoster ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary flex-shrink-0"
                      disabled={saving}
                      onClick={() => onRemoveMemberFromTeam(id)}
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="small text-muted flex-shrink-0">—</span>
                  )}
                </li>
              )
            })}
            {nonLeadRosterIds.map((id) => {
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
          <p className="small text-muted mb-0">
            {isPolicyTeam
              ? 'Everyone with Bill permission is already on this roster, a lead for this team, or a lead on another team.'
              : 'Everyone who can be added is already on this roster, a lead for this team, or a lead on another team.'}
          </p>
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

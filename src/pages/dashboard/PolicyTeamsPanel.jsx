import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PolicyTeamDetailPanel from './PolicyTeamDetailPanel'

function billsMembers(rows) {
  return (rows || []).filter((m) => m.bills === true || m.bills === 'true')
}

function eligibleTeamLeads(rows) {
  return billsMembers(rows).filter((m) =>
    String(m.role || '')
      .toLowerCase()
      .includes('team lead')
  )
}

/** Same normalization as unique index `idx_policy_teams_name_lower`: lower(trim(name)). */
function normalizedPolicyTeamName(value) {
  return String(value ?? '').trim().toLowerCase()
}

export default function PolicyTeamsPanel({
  policyTeams,
  memberPolicyTeams,
  allMembersForManagement,
  onRefresh,
}) {
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState(null)

  const billsOnly = useMemo(() => billsMembers(allMembersForManagement), [allMembersForManagement])
  const leadChoices = useMemo(() => eligibleTeamLeads(allMembersForManagement), [allMembersForManagement])

  const membersByTeam = useMemo(() => {
    const m = {}
    for (const row of memberPolicyTeams || []) {
      if (!m[row.team_id]) m[row.team_id] = []
      m[row.team_id].push(row.member_id)
    }
    return m
  }, [memberPolicyTeams])

  const memberTeamId = useMemo(() => {
    const o = {}
    for (const row of memberPolicyTeams || []) {
      o[row.member_id] = row.team_id
    }
    return o
  }, [memberPolicyTeams])

  /** member_id → team_id where they are designated as a policy team lead (any team). */
  const leadMemberIdToTeamId = useMemo(() => {
    const o = {}
    for (const t of policyTeams || []) {
      for (const mid of t.lead_member_ids || []) {
        o[String(mid)] = t.team_id
      }
    }
    return o
  }, [policyTeams])

  const teamNameById = useMemo(() => {
    const o = {}
    for (const t of policyTeams || []) {
      o[String(t.team_id)] = String(t.name || '').trim() || 'Team'
    }
    return o
  }, [policyTeams])

  /** Roster members plus leads (deduped) — leads-only row counts toward size. */
  const teamUniqueHeadcount = (team) => {
    const roster = membersByTeam[team.team_id] || []
    const leads = team.lead_member_ids || []
    const s = new Set()
    for (const id of roster) s.add(String(id))
    for (const id of leads) s.add(String(id))
    return s.size
  }

  const getMember = (memberId) =>
    billsOnly.find((x) => String(x.member_id) === String(memberId)) || null

  /** Short line for left rail (up to two names, then +N). */
  const leadsSummaryLine = (team) => {
    const ids = team?.lead_member_ids
    if (!Array.isArray(ids) || ids.length === 0) return 'No leads'
    const labels = ids.map((id) => {
      const m = getMember(id)
      if (!m) return '—'
      const n = `${m.first_name || ''} ${m.last_name || ''}`.trim()
      return n || '—'
    })
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }

  const showMsg = (msg, isErr = false) => {
    setError(isErr ? msg : '')
    setSuccess(!isErr ? msg : '')
    if (msg) setTimeout(() => (isErr ? setError('') : setSuccess('')), 4000)
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    const name = newTeamName.trim()
    if (!name) {
      showMsg('Enter a team name.', true)
      return
    }
    const key = normalizedPolicyTeamName(name)
    if ((policyTeams || []).some((t) => normalizedPolicyTeamName(t.name) === key)) {
      showMsg('A team with this name already exists (spacing and capitals are ignored).', true)
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('policy_teams').insert({ name })
    setSaving(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('idx_policy_teams_name_lower') || (msg.includes('unique') && msg.toLowerCase().includes('name'))) {
        showMsg('A team with this name already exists (spacing and capitals are ignored).', true)
      } else {
        showMsg(msg || 'Could not create team.', true)
      }
      return
    }
    setNewTeamName('')
    showMsg('Team created.')
    await onRefresh?.()
  }

  const handleSetTeamLeads = async (teamId, memberIds) => {
    const ids = [...new Set((memberIds || []).filter(Boolean))].map(String)
    setSaving(true)
    setError('')
    const { error: delErr } = await supabase.from('policy_team_leads').delete().eq('team_id', teamId)
    if (delErr) {
      setSaving(false)
      showMsg(delErr.message || 'Could not update team leads.', true)
      return
    }
    if (ids.length) {
      const { error: insErr } = await supabase
        .from('policy_team_leads')
        .insert(ids.map((member_id) => ({ team_id: teamId, member_id })))
      if (insErr) {
        setSaving(false)
        showMsg(insErr.message || 'Could not set team leads.', true)
        return
      }
    }
    await supabase
      .from('policy_teams')
      .update({ updated_at: new Date().toISOString() })
      .eq('team_id', teamId)
    setSaving(false)
    showMsg('Team leads updated.')
    await onRefresh?.()
  }

  const handleAssignMemberToTeam = async (memberId, teamId) => {
    setSaving(true)
    const { error: delErr } = await supabase.from('member_policy_teams').delete().eq('member_id', memberId)
    if (delErr) {
      setSaving(false)
      showMsg(delErr.message || 'Could not update membership.', true)
      return
    }
    if (teamId && teamId !== '') {
      const { error: insErr } = await supabase
        .from('member_policy_teams')
        .insert({ member_id: memberId, team_id: teamId })
      if (insErr) {
        setSaving(false)
        showMsg(insErr.message || 'Could not assign member.', true)
        return
      }
    }
    setSaving(false)
    showMsg(teamId ? 'Membership updated.' : 'Removed from team.')
    await onRefresh?.()
  }

  /** Add or move multiple Bill-permission members into one team (single refresh). */
  const handleAddMembersToTeamBatch = async (memberIds, teamId) => {
    const ids = [...new Set((memberIds || []).filter(Boolean))].map(String)
    if (!ids.length || !teamId) return
    setSaving(true)
    setError('')
    try {
      for (const mid of ids) {
        const { error: delErr } = await supabase.from('member_policy_teams').delete().eq('member_id', mid)
        if (delErr) throw new Error(delErr.message)
        const { error: insErr } = await supabase
          .from('member_policy_teams')
          .insert({ member_id: mid, team_id: teamId })
        if (insErr) throw new Error(insErr.message)
      }
      showMsg(ids.length === 1 ? 'Member added to team.' : `Added ${ids.length} members to the team.`)
      await onRefresh?.()
    } catch (e) {
      showMsg(e.message || 'Could not update membership.', true)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTeam = async (team) => {
    if (!team?.team_id) return
    const name = String(team.name || 'this team')
    if (!window.confirm(`Delete team "${name}"? This will remove team assignments for its members.`)) return
    setSaving(true)
    const { error: err } = await supabase.from('policy_teams').delete().eq('team_id', team.team_id)
    setSaving(false)
    if (err) {
      showMsg(err.message || 'Could not delete team.', true)
      return
    }
    showMsg('Team deleted.')
    const deletedId = String(team.team_id)
    setSelectedTeamId((prev) => (prev != null && String(prev) === deletedId ? null : prev))
    await onRefresh?.()
  }

  const sortedTeams = useMemo(
    () => [...(policyTeams || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [policyTeams]
  )

  const handleRenameTeam = async (teamId, rawName) => {
    const name = String(rawName ?? '').trim()
    if (!name) {
      showMsg('Team name cannot be empty.', true)
      return
    }
    const key = normalizedPolicyTeamName(name)
    const clash = sortedTeams.some(
      (t) => String(t.team_id) !== String(teamId) && normalizedPolicyTeamName(t.name) === key
    )
    if (clash) {
      showMsg('Another team already uses this name (spacing and capitals are ignored).', true)
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('policy_teams')
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
    setSaving(false)
    if (err) {
      const msg = err.message || ''
      if (msg.includes('idx_policy_teams_name_lower') || (msg.includes('unique') && msg.toLowerCase().includes('name'))) {
        showMsg('Another team already uses this name (spacing and capitals are ignored).', true)
      } else {
        showMsg(msg || 'Could not rename team.', true)
      }
      return
    }
    showMsg('Team name updated.')
    await onRefresh?.()
  }

  useEffect(() => {
    if (!sortedTeams.length) {
      setSelectedTeamId(null)
      return
    }
    setSelectedTeamId((prev) => {
      if (prev != null && sortedTeams.some((t) => String(t.team_id) === String(prev))) return prev
      return sortedTeams[0].team_id
    })
  }, [sortedTeams])

  const selectedTeam =
    selectedTeamId != null
      ? sortedTeams.find((t) => String(t.team_id) === String(selectedTeamId)) || null
      : null

  return (
    <div className="card shadow-sm border mb-4">
      <div className="card-header bg-white">
        <h5 className="mb-0">Policy teams (bill analysts)</h5>
        <small className="text-muted">
          Only members with Bill permission can join a team. Team leads must have Bill permission and &quot;team lead&quot;
          in their role (you can pick several per team). They can review leave for their team and assign bill work within
          the team.
        </small>
      </div>
      <div className="card-body">
        {(error || success) && (
          <div className="mb-3">
            {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
            {success && <div className="alert alert-success py-2 mb-0">{success}</div>}
          </div>
        )}

        <form className="row g-2 align-items-end mb-4" onSubmit={handleCreateTeam}>
          <div className="col-md-8">
            <label className="form-label small mb-1">New team name</label>
            <input
              className="form-control"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. West Policy Team"
              disabled={saving}
            />
          </div>
          <div className="col-md-4 text-end">
            <button type="submit" className="btn btn-dark" disabled={saving}>
              {saving ? 'Saving…' : 'Create team'}
            </button>
          </div>
        </form>

        {sortedTeams.length === 0 ? (
          <p className="text-muted mb-0">No teams yet. Create one above.</p>
        ) : (
          <div className="row g-3 align-items-stretch">
            <div className="col-lg-4">
              <div className="fw-semibold small text-muted mb-2">Teams</div>
              <div className="list-group">
                {sortedTeams.map((team) => {
                  const isActive = selectedTeam && String(selectedTeam.team_id) === String(team.team_id)
                  const leadShort = leadsSummaryLine(team)
                  const headcount = teamUniqueHeadcount(team)
                  return (
                    <button
                      key={team.team_id}
                      type="button"
                      className={`list-group-item list-group-item-action text-start py-2 px-3 ${isActive ? 'active' : ''}`}
                      disabled={saving}
                      onClick={() => setSelectedTeamId(team.team_id)}
                      title="Members on roster plus anyone who is only a designated lead (deduped)"
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <span className="fw-semibold text-truncate">{team.name}</span>
                        <span className={`badge flex-shrink-0 ${isActive ? 'bg-light text-dark' : 'bg-secondary'}`}>
                          {headcount}
                        </span>
                      </div>
                      <div className={`small text-truncate mt-1 ${isActive ? 'text-white-50' : 'text-muted'}`}>
                        {leadShort}
                      </div>
                      {team.active === false && (
                        <span className={`badge mt-1 ${isActive ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                          inactive
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="col-lg-8">
              <PolicyTeamDetailPanel
                team={selectedTeam}
                billsOnly={billsOnly}
                leadChoices={leadChoices}
                rosterMemberIds={selectedTeam ? membersByTeam[selectedTeam.team_id] || [] : []}
                getMember={getMember}
                memberTeamId={memberTeamId}
                saving={saving}
                onSetTeamLeads={handleSetTeamLeads}
                onAddMembersToTeam={handleAddMembersToTeamBatch}
                onRemoveMemberFromTeam={(memberId) => handleAssignMemberToTeam(memberId, null)}
                onDeleteTeam={(t) => handleDeleteTeam(t)}
                onRenameTeam={handleRenameTeam}
                leadMemberIdToTeamId={leadMemberIdToTeamId}
                teamNameById={teamNameById}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

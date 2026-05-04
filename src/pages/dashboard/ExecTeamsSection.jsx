import React, { useMemo, useState } from 'react'
import PolicyTeamsPanel from './PolicyTeamsPanel'

const TEAM_KINDS = [
  { key: 'policy', label: 'Policy (bill)' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'blog', label: 'Blog' },
  { key: 'general', label: 'General' },
]

/**
 * Exec-only: all team management under Member Management with kind tabs.
 */
export default function ExecTeamsSection({
  policyTeams,
  memberPolicyTeams,
  allMembersForManagement,
  onRefresh,
}) {
  const [teamKindTab, setTeamKindTab] = useState('policy')

  const filteredTeams = useMemo(() => {
    return (policyTeams || []).filter((t) => (t.team_kind || 'policy') === teamKindTab)
  }, [policyTeams, teamKindTab])

  const tabLabel = TEAM_KINDS.find((x) => x.key === teamKindTab)?.label || teamKindTab

  return (
    <div className="card shadow-sm border mb-4">
      <div className="card-header bg-white py-3">
        <h5 className="mb-2">Teams</h5>
        <p className="small text-muted mb-3 mb-md-2">
          Policy teams are for bill analysts; Marketing, Blog, and General can include any member and use{' '}
          <strong>Assigned work</strong> (Google Doc deliverables) like policy teams.
        </p>
        <div
          className="btn-group btn-group-sm flex-wrap"
          role="group"
          aria-label="Team category"
        >
          {TEAM_KINDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`btn ${teamKindTab === key ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setTeamKindTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="card-body border-top bg-light pt-3">
        <PolicyTeamsPanel
          embedded
          teams={filteredTeams}
          allTeams={policyTeams}
          teamKind={teamKindTab}
          sectionTitle={`${tabLabel} teams`}
          memberPolicyTeams={memberPolicyTeams}
          allMembersForManagement={allMembersForManagement}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  )
}

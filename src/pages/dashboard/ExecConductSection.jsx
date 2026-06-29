import React, { useMemo, useState, useEffect } from 'react'
import ResignationViewModal from './ResignationViewModal'
import StrikeDetailModal from './StrikeDetailModal'
import {
  RESIGN_STATUS_LABEL,
  RESIGN_FILTER_CONFIG,
  LEGACY_RESIGN_STATUS_LABEL,
  resignStatusBadgeClass,
} from './resignationStatusConfig'

const STRIKE_FILTER_CONFIG = [
  ['all', 'All', 'btn-dark'],
  ['hr_report', 'HR report', 'btn-secondary'],
  ['manual', 'Manual', 'btn-secondary'],
]

const STRIKE_BTN_OUTLINE = {
  'btn-dark': 'btn-outline-dark',
  'btn-secondary': 'btn-outline-secondary',
}

export default function ExecConductSection({
  sectionOrder,
  sectionId,
  removalProposals,
  resignationRows,
  memberStrikeRows,
  membersById,
  currentExecMemberId,
  formatDateLong,
  onConfirmRemovalSecond,
  onCancelRemovalProposal,
  onUpdateResignationStatus,
  onUpdateResignationNotes,
  onOpenHonorableExitEmailModal,
  onOpenRemovalNoticeEmailModal,
}) {
  const [resignFilter, setResignFilter] = useState('all')
  const [strikeFilter, setStrikeFilter] = useState('all')
  const [resignationToView, setResignationToView] = useState(null)
  const [strikeToView, setStrikeToView] = useState(null)

  const strikes = memberStrikeRows || []
  const resignations = resignationRows || []

  const filteredStrikes = useMemo(() => {
    if (strikeFilter === 'all') return strikes
    return strikes.filter((s) => s.source === strikeFilter)
  }, [strikes, strikeFilter])

  const filteredResignations = useMemo(() => {
    if (resignFilter === 'all') return resignations
    return resignations.filter((r) => r.status === resignFilter)
  }, [resignations, resignFilter])

  const showResignStatusColumn = resignFilter === 'all'

  const awaiting = (removalProposals || []).filter((p) => p.status === 'awaiting_second')

  const countResign = (key) =>
    key === 'all'
      ? resignations.length
      : resignations.filter((r) => r.status === key).length

  const countStrike = (key) =>
    key === 'all' ? strikes.length : strikes.filter((s) => s.source === key).length

  const viewingMemberName =
    resignationToView && membersById[resignationToView.member_id]
      ? `${membersById[resignationToView.member_id].first_name} ${membersById[resignationToView.member_id].last_name}`
      : resignationToView?.member_id || '—'

  const strikeModalMember =
    strikeToView && membersById[strikeToView.member_id]
      ? `${membersById[strikeToView.member_id].first_name} ${membersById[strikeToView.member_id].last_name}`
      : strikeToView?.member_id || '—'

  const strikeModalRecorder =
    strikeToView?.recorded_by && membersById[strikeToView.recorded_by]
      ? `${membersById[strikeToView.recorded_by].first_name} ${membersById[strikeToView.recorded_by].last_name}`
      : null

  useEffect(() => {
    if (!resignationToView?.resignation_id) return
    const fresh = resignations.find((r) => r.resignation_id === resignationToView.resignation_id)
    if (fresh) setResignationToView(fresh)
  }, [resignations, resignationToView?.resignation_id])

  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor" style={{ order: sectionOrder }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h3 className="mb-0">Executive Conduct &amp; Resignations</h3>
      </div>

      <div className="alert alert-info mb-4">
        <i className="bi bi-info-circle me-2"></i>
        Strike counts in Member Management match this log. Use the status/source filters like HR Reports, then{' '}
        <strong>View</strong> to open the resignation message or strike detail.
      </div>

      {awaiting.length > 0 && (
        <div className="alert alert-warning mb-4">
          <strong>Removal awaiting second executive:</strong>
          <ul className="mb-0 mt-2">
            {awaiting.map((p) => {
              const mem = membersById[p.member_id]
              const init = membersById[p.initiated_by]
              const name = mem ? `${mem.first_name} ${mem.last_name}` : p.member_id
              const initiator = init ? `${init.first_name} ${init.last_name}` : '—'
              const canConfirm =
                currentExecMemberId && String(p.initiated_by) !== String(currentExecMemberId)
              return (
                <li key={p.proposal_id} className="mb-2">
                  <span className="fw-semibold">{name}</span> — initiated by {initiator}.
                  {canConfirm ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger ms-2"
                      onClick={() => onConfirmRemovalSecond(p)}
                    >
                      Confirm as second executive
                    </button>
                  ) : (
                    <span className="text-muted ms-2 small">Waiting for another executive to confirm.</span>
                  )}
                  {String(p.initiated_by) === String(currentExecMemberId) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary ms-2"
                      onClick={() => onCancelRemovalProposal(p)}
                    >
                      Cancel proposal
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {(removalProposals || []).some((p) => p.status === 'dual_confirmed') && (
        <div className="alert alert-danger mb-4">
          <strong>Dual-confirmed removals:</strong> manually deactivate the member and revoke access when your team is ready. Prior work
          on the site can remain credited.
          <ul className="mt-2 mb-0 small">
            {(removalProposals || [])
              .filter((p) => p.status === 'dual_confirmed')
              .map((p) => {
                const mem = membersById[p.member_id]
                const name = mem ? `${mem.first_name} ${mem.last_name}` : p.member_id
                return <li key={p.proposal_id}>{name}</li>
              })}
          </ul>
        </div>
      )}

      {/* Strike log */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0">Strike Log</h4>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group flex-wrap" role="group" aria-label="Strike filters">
            {STRIKE_FILTER_CONFIG.map(([key, label, activeClass]) => (
              <button
                key={key}
                type="button"
                title={
                  key === 'hr_report'
                    ? 'Strikes linked to an HR report'
                    : key === 'manual'
                      ? 'Manually recorded strikes'
                      : undefined
                }
                className={`btn btn-sm ${
                  strikeFilter === key ? activeClass : STRIKE_BTN_OUTLINE[activeClass] || 'btn-outline-secondary'
                }`}
                onClick={() => setStrikeFilter(key)}
              >
                {label} ({countStrike(key)})
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={onOpenRemovalNoticeEmailModal}
          >
            <i className="bi bi-envelope-exclamation me-1"></i>
            Removal / firing email
          </button>
        </div>
      </div>

      {strikes.length === 0 ? (
        <p className="text-muted small mb-5">No strikes recorded.</p>
      ) : (
        <div className="table-responsive mb-5" style={{ maxHeight: '420px', overflowY: 'auto' }}>
          <table className="table table-hover table-sm align-middle mb-0">
            <thead className="sticky-top bg-white border-bottom" style={{ zIndex: 1 }}>
              <tr>
                <th>Recorded</th>
                <th>Member</th>
                <th>Source</th>
                <th>Notes</th>
                <th>Recorded by</th>
                <th style={{ width: '90px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredStrikes.map((s) => {
                const mem = membersById[s.member_id]
                const rec = s.recorded_by ? membersById[s.recorded_by] : null
                const name = mem ? `${mem.first_name} ${mem.last_name}` : s.member_id
                const recName = rec ? `${rec.first_name} ${rec.last_name}` : '—'
                const preview = (s.notes || '').trim()
                const short =
                  preview.length > 72 ? `${preview.slice(0, 72)}…` : preview || '—'
                return (
                  <tr key={s.strike_id}>
                    <td className="text-nowrap small">{formatDateLong(s.created_at)}</td>
                    <td>{name}</td>
                    <td>
                      <span className={`badge ${s.source === 'hr_report' ? 'bg-secondary' : 'bg-light text-dark border'}`}>
                        {s.source === 'hr_report' ? 'HR report' : 'Manual'}
                      </span>
                    </td>
                    <td className="small text-muted text-truncate" style={{ maxWidth: '200px' }} title={preview}>
                      {short}
                    </td>
                    <td className="small">{recName}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setStrikeToView(s)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredStrikes.length === 0 && strikes.length > 0 && (
            <p className="text-muted small py-3 mb-0">No strikes match this filter.</p>
          )}
        </div>
      )}

      {/* Resignation requests */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h4 className="mb-0">Resignation Requests</h4>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group flex-wrap" role="group" aria-label="Resignation status filters">
            {RESIGN_FILTER_CONFIG.map(([key, label, activeClass]) => {
              const outlineMap = {
                'btn-dark': 'btn-outline-dark',
                'btn-warning': 'btn-outline-warning',
                'btn-info': 'btn-outline-info',
                'btn-primary': 'btn-outline-primary',
                'btn-success': 'btn-outline-success',
                'btn-secondary': 'btn-outline-secondary',
              }
              const outline = outlineMap[activeClass] || 'btn-outline-dark'
              return (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm ${resignFilter === key ? activeClass : outline}`}
                  onClick={() => setResignFilter(key)}
                >
                  {label} ({countResign(key)})
                </button>
              )
            })}
          </div>
          <button type="button" className="btn btn-sm btn-dark" onClick={onOpenHonorableExitEmailModal}>
            <i className="bi bi-envelope-heart me-1"></i>
            Honorable exit email
          </button>
        </div>
      </div>

      {resignations.length === 0 ? (
        <p className="text-muted small">No resignation requests yet.</p>
      ) : (
        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table table-hover table-sm align-middle mb-0">
            <thead className="sticky-top bg-white border-bottom" style={{ zIndex: 1 }}>
              <tr>
                <th>Member</th>
                <th>Submitted</th>
                {showResignStatusColumn && <th>Status</th>}
                <th>Exec notes</th>
                <th style={{ width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredResignations.map((r) => {
                const mem = membersById[r.member_id]
                const name = mem ? `${mem.first_name} ${mem.last_name}` : r.member_id
                return (
                  <tr key={r.resignation_id}>
                    <td>{name}</td>
                    <td className="text-nowrap small">{formatDateLong(r.created_at)}</td>
                    {showResignStatusColumn && (
                      <td style={{ minWidth: '140px' }}>
                        <span className={`badge ${resignStatusBadgeClass(r.status)}`}>
                          {RESIGN_STATUS_LABEL[r.status] || LEGACY_RESIGN_STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>
                    )}
                    <td style={{ minWidth: '180px' }}>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Internal notes"
                        defaultValue={r.exec_notes || ''}
                        onBlur={(e) => onUpdateResignationNotes(r.resignation_id, e.target.value.trim() || null)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setResignationToView(r)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredResignations.length === 0 && resignations.length > 0 && (
            <p className="text-muted small py-3 mb-0">No requests match this filter.</p>
          )}
        </div>
      )}

      <ResignationViewModal
        open={!!resignationToView}
        row={resignationToView}
        memberName={viewingMemberName}
        formatDateLong={formatDateLong}
        onClose={() => setResignationToView(null)}
        onUpdateResignationStatus={onUpdateResignationStatus}
      />

      <StrikeDetailModal
        open={!!strikeToView}
        strike={strikeToView}
        memberName={strikeModalMember}
        recorderName={strikeModalRecorder}
        formatDateLong={formatDateLong}
        onClose={() => setStrikeToView(null)}
      />
    </section>
  )
}

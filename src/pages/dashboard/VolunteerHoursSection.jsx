import React from 'react'
import { IMAGE_BASE_URL } from './constants'

/**
 * Volunteer hours accordion list + filters (dashboard).
 */
export default function VolunteerHoursSection({
  sectionOrder,
  sectionId,
  volunteerFilter,
  setVolunteerFilter,
  effectiveVolunteerEntries,
  groupedEntries,
  viewAsData,
  effectiveMember,
  formatDuration,
  formatDateLong,
  onAddEntry,
  canSuperviseVolunteerHours,
  canExecVolunteerActions,
  verificationGenerating,
  onApproveEntry,
  onDenyEntry,
  onCommentEntry,
  onRequestDeleteEntry,
  onSendVerification,
}) {
  const showStatusBadge = volunteerFilter === 'all'
  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor" style={{ order: sectionOrder }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h3 className="mb-0">Volunteer Hours</h3>
        <div className="d-flex align-items-center gap-2">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${volunteerFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setVolunteerFilter('all')}
            >
              All ({effectiveVolunteerEntries.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${volunteerFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setVolunteerFilter('pending')}
            >
              Pending ({effectiveVolunteerEntries.filter((e) => e.approved === 'waiting').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${volunteerFilter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setVolunteerFilter('approved')}
            >
              Approved ({effectiveVolunteerEntries.filter((e) => e.approved === 'approved').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${volunteerFilter === 'declined' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setVolunteerFilter('declined')}
            >
              Declined ({effectiveVolunteerEntries.filter((e) => e.approved === 'denied').length})
            </button>
          </div>
          {!viewAsData && (
            <button className="btn btn-dark btn-sm" onClick={onAddEntry}>
              <i className="bi bi-plus-circle me-2"></i>Add Entry
            </button>
          )}
        </div>
      </div>
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {Object.entries(groupedEntries).map(([memberId, entries]) => {
          const firstEntry = entries[0]
          const memberData = viewAsData ? effectiveMember : firstEntry.members || {}
          const isOwn = firstEntry.member_id === effectiveMember.member_id
          const memberName = isOwn ? 'You' : `${memberData.first_name || ''} ${memberData.last_name || ''}`.trim()
          const memberImage = memberData.image
            ? `${IMAGE_BASE_URL}/${memberData.image}`
            : `${IMAGE_BASE_URL}/default.jpg`

          return (
            <div key={memberId} className="accordion mb-3 shadow-sm border rounded">
              <h2 className="accordion-header">
                <button
                  className="accordion-button collapsed bg-light text-dark"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#collapseUser${memberId}`}
                  aria-expanded="false"
                >
                  <div className="d-flex align-items-center gap-2">
                    <img src={memberImage} alt={memberName} className="rounded-circle" width="32" height="32" />
                    <span>{memberName}</span>
                    <span className="fw-bold ms-2 text-muted">
                      ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                    </span>
                  </div>
                </button>
              </h2>
              <div id={`collapseUser${memberId}`} className="accordion-collapse collapse" data-bs-parent=".accordion">
                <div className="accordion-body">
                  <div className="accordion">
                    {entries.map((entry) => {
                      const start = new Date(entry.start_timestamp)
                      const end = new Date(entry.end_timestamp)
                      const duration = formatDuration(entry.start_timestamp, entry.end_timestamp)
                      const statusColor =
                        entry.approved === 'approved'
                          ? { bg: 'bg-success', color: 'white' }
                          : entry.approved === 'denied'
                            ? { bg: 'bg-danger', color: 'white' }
                            : { bg: 'bg-warning', color: 'black' }

                      return (
                        <div key={entry.id} className="accordion-item mb-2 shadow-sm border rounded">
                          <h2 className="accordion-header">
                            <button
                              className="accordion-button collapsed bg-white text-dark"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target={`#collapse${entry.id}`}
                              aria-expanded="false"
                            >
                              <div className="d-flex w-100 justify-content-between align-items-center">
                                <span>
                                  <i className="bi bi-calendar-event me-2"></i>
                                  {formatDateLong(start)}
                                </span>
                                {showStatusBadge && (
                                  <span className={`badge ${statusColor.bg} text-capitalize`} style={{ color: statusColor.color }}>
                                    {entry.approved}
                                  </span>
                                )}
                                <span className="fw-bold ms-3">{duration}</span>
                              </div>
                            </button>
                          </h2>
                          <div
                            id={`collapse${entry.id}`}
                            className="accordion-collapse collapse"
                            data-bs-parent={`#collapseUser${memberId} .accordion`}
                          >
                            <div className="accordion-body">
                              <p>
                                <strong>{entry.volunteering_job_title}</strong> - {entry.volunteering_job_desc}
                              </p>
                              <p>
                                <i className="bi bi-clock me-1"></i>Start:{' '}
                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p>
                                <i className="bi bi-clock-history me-1"></i>End:{' '}
                                {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p>
                                <i className="bi bi-person-workspace me-1"></i>Supervisor Comment:{' '}
                                {entry.supervisor_comment || '-'}
                              </p>
                              <p>
                                <i className="bi bi-upload me-1"></i>Submitted:{' '}
                                {new Date(entry.request_submit_timestamp || entry.created_at || 0).toLocaleString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              {(entry.reviewed_by_member || entry.reviewed_at) &&
                                (entry.approved === 'approved' || entry.approved === 'denied') && (
                                  <div className="mb-2">
                                    <strong>Reviewed by:</strong>
                                    <p className="mb-0 mt-1">
                                      {entry.reviewed_by_member
                                        ? `${entry.reviewed_by_member.first_name} ${entry.reviewed_by_member.last_name}`
                                        : 'Unknown'}
                                      {entry.reviewed_at && (
                                        <span className="text-muted d-block small">{formatDateLong(entry.reviewed_at)}</span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              {!viewAsData && (
                                <div className="mt-2 d-flex gap-2 flex-wrap">
                                  {canSuperviseVolunteerHours && !isOwn && (
                                    <>
                                      <button
                                        className="btn btn-sm btn-outline-success"
                                        onClick={() => onApproveEntry(entry.id)}
                                      >
                                        <i className="bi bi-check-circle me-1"></i>Approve
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => onDenyEntry(entry.id)}
                                      >
                                        <i className="bi bi-x-circle me-1"></i>Deny
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => onCommentEntry(entry.id)}
                                      >
                                        <i className="bi bi-chat-left-text me-1"></i>Add Comment
                                      </button>
                                    </>
                                  )}
                                  {canExecVolunteerActions && (
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => onRequestDeleteEntry(entry.id)}
                                    >
                                      <i className="bi bi-trash me-1"></i>Delete
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {canExecVolunteerActions && entries.some((e) => e.approved === 'approved') && !viewAsData && (
                    <div className="mt-3 pt-3 border-top d-flex justify-content-end">
                      <button
                        className="btn btn-sm btn-outline-dark"
                        disabled={verificationGenerating}
                        onClick={() => {
                          const approved = entries.filter((e) => e.approved === 'approved')
                          onSendVerification(memberId, approved)
                        }}
                      >
                        {verificationGenerating ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-file-earmark-pdf me-1"></i>Send Verification Letter (
                            {entries.filter((e) => e.approved === 'approved').length} approved)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {Object.keys(groupedEntries).length === 0 && (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-clock-history display-4 d-block mb-3"></i>
            <p>
              {effectiveVolunteerEntries.length === 0
                ? `No volunteer entries found.${!viewAsData ? ' Add your first entry to get started.' : ''}`
                : `No ${
                    volunteerFilter === 'all'
                      ? ''
                      : volunteerFilter === 'pending'
                        ? 'pending'
                        : volunteerFilter === 'declined'
                          ? 'declined'
                          : 'approved'
                  } entries.`}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

import React from 'react'
import BillAssignmentsExecPanel from './BillAssignmentsExecPanel'

/**
 * Policy team lead: assign/track bill work for own team only (RLS-scoped).
 */
export default function TeamLeadAssignmentsSection({
  sectionOrder,
  sectionId,
  currentMemberId,
  billAssignments,
  execAssignmentFilter,
  onExecAssignmentFilterChange,
  execAssignmentTeamFilter,
  onExecAssignmentTeamFilterChange,
  assignmentTeamFilterOptions,
  resolveAssignmentTeamLabel,
  viewAsData,
  onOpenAssignWork,
  formatDate,
  resolveBillAssignmentMemberName,
  resolveBillAssignmentMemberNames,
  onExecStatus,
  onApproveAndPublish,
  onReopenPublish,
  onEditAssignment,
  onRequestDeleteAssignment,
}) {
  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor" style={{ order: sectionOrder }}>
      <h3 className="mb-2">Team — Assigned work</h3>
      <p className="text-muted small mb-4">
        Assign tasks to members on your policy team and track progress. Publishing bills to the site stays with executives.
      </p>
      <BillAssignmentsExecPanel
        billAssignments={billAssignments}
        execAssignmentFilter={execAssignmentFilter}
        onExecAssignmentFilterChange={onExecAssignmentFilterChange}
        execAssignmentTeamFilter={execAssignmentTeamFilter}
        onExecAssignmentTeamFilterChange={onExecAssignmentTeamFilterChange}
        assignmentTeamFilterOptions={assignmentTeamFilterOptions}
        resolveAssignmentTeamLabel={resolveAssignmentTeamLabel}
        viewAsData={viewAsData}
        onOpenAssignWork={onOpenAssignWork}
        formatDate={formatDate}
        resolveMemberName={resolveBillAssignmentMemberName}
        resolveMemberNames={resolveBillAssignmentMemberNames}
        onExecStatus={onExecStatus}
        onApproveAndPublish={onApproveAndPublish}
        onReopenPublish={onReopenPublish}
        onEditAssignment={onEditAssignment}
        onRequestDeleteAssignment={onRequestDeleteAssignment}
        teamLeadMode
        currentMemberId={currentMemberId}
      />
    </section>
  )
}

import React from 'react'
import BillResearchPanel from '../../components/BillResearchPanel'
import {
  BillAssignmentsMemberAssignedPanel,
  BillAssignmentsOpenTasksPanel,
} from './BillAssignmentsMemberPanels'

export default function BillSubmissionSection({
  sectionOrder,
  viewAsData,
  effectiveMember,

  memberBillSectionTab,
  setMemberBillSectionTab,

  billSubmissionViewTab,

  handleAddBill,

  // Research tab
  researchBills,
  researchBillsLoading,
  researchBillsError,
  researchBillSearchState,
  setResearchBillSearchState,
  researchBillSearchNumber,
  setResearchBillSearchNumber,
  researchBillSearchKeywords,
  setResearchBillSearchKeywords,
  researchBillStatusFilter,
  setResearchBillStatusFilter,
  allMembers,
  getBillPdfUrl,
  formatDate,
  loadResearchBills,
  getStateFileName,

  // Open tasks + assigned to me
  billAssignments,
  handleClaimBillAssignment,
  resolveBillAssignmentMemberName,
  memberAssignmentFilter,
  setMemberAssignmentFilter,
  effectiveMemberId,
  memberDeliverableInputs,
  setMemberDeliverableInputs,
  handleSaveAssignmentDeliverable,
  handleAssigneeAssignmentStatus,

  // My submitted bills fallback
  effectiveBills,
  setBillPdfPreviewBill,
  formatDateLong,
}) {
  return (
    <section className="mt-5" style={{ order: sectionOrder }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="mb-0">{viewAsData ? 'Assigned to me' : 'Bill Submission'}</h3>
          {viewAsData && (
            <p className="small text-muted mb-0 mt-1">
              {effectiveMember?.first_name} {effectiveMember?.last_name} (read-only)
            </p>
          )}
        </div>

        {!viewAsData && memberBillSectionTab === 'my_bills' && (
          <button className="btn btn-dark" onClick={handleAddBill}>
            <i className="bi bi-plus-circle me-2"></i>Submit Bill for Review
          </button>
        )}
      </div>

      {!viewAsData && (
        <div className="btn-group mb-3" role="group">
          <button
            type="button"
            className={`btn btn-sm ${
              memberBillSectionTab === 'my_bills' ? 'btn-dark' : 'btn-outline-dark'
            }`}
            onClick={() => setMemberBillSectionTab('my_bills')}
          >
            My bills
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              memberBillSectionTab === 'assigned_to_me' ? 'btn-dark' : 'btn-outline-dark'
            }`}
            onClick={() => setMemberBillSectionTab('assigned_to_me')}
          >
            Assigned to me
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              memberBillSectionTab === 'open_tasks' ? 'btn-dark' : 'btn-outline-dark'
            }`}
            onClick={() => setMemberBillSectionTab('open_tasks')}
          >
            Open tasks
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              memberBillSectionTab === 'research' ? 'btn-dark' : 'btn-outline-dark'
            }`}
            onClick={() => setMemberBillSectionTab('research')}
          >
            Research
          </button>
        </div>
      )}

      {billSubmissionViewTab === 'research' ? (
        <BillResearchPanel
          bills={researchBills}
          loading={researchBillsLoading}
          loadError={researchBillsError}
          spanSearchState={researchBillSearchState}
          onSpanSearchStateChange={setResearchBillSearchState}
          spanSearchBillNumber={researchBillSearchNumber}
          onSpanSearchBillNumberChange={setResearchBillSearchNumber}
          spanSearchKeywords={researchBillSearchKeywords}
          onSpanSearchKeywordsChange={setResearchBillSearchKeywords}
          statusFilter={researchBillStatusFilter}
          onStatusFilterChange={setResearchBillStatusFilter}
          allMembers={allMembers}
          getBillPdfUrl={getBillPdfUrl}
          formatDate={formatDate}
          onRefresh={loadResearchBills}
          getStateFileName={getStateFileName}
        />
      ) : billSubmissionViewTab === 'open_tasks' ? (
        <>
          <p className="text-muted small mb-3">
            Tasks anyone with Bill permission can pick up. <strong>Only one person</strong> can claim each
            task (first come, first served). After you claim it, it moves to <strong>Assigned to me</strong>
            for you.
          </p>
          <BillAssignmentsOpenTasksPanel
            billAssignments={billAssignments}
            formatDate={formatDate}
            resolveMemberName={resolveBillAssignmentMemberName}
            onClaim={handleClaimBillAssignment}
          />
        </>
      ) : billSubmissionViewTab === 'assigned_to_me' ? (
        <BillAssignmentsMemberAssignedPanel
          billAssignments={billAssignments}
          memberAssignmentFilter={memberAssignmentFilter}
          onMemberAssignmentFilterChange={setMemberAssignmentFilter}
          effectiveMemberId={effectiveMemberId}
          memberDeliverableInputs={memberDeliverableInputs}
          setMemberDeliverableInputs={setMemberDeliverableInputs}
          formatDate={formatDate}
          viewAsData={viewAsData}
          onSaveDeliverable={handleSaveAssignmentDeliverable}
          onAssigneeStatus={handleAssigneeAssignmentStatus}
        />
      ) : effectiveBills.length > 0 ? (
        <div>
          <h4 className="mb-3">My Submitted Bills</h4>
          <div className="accordion mb-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {effectiveBills.map((bill) => (
              <div key={bill.bill_id} className="accordion-item mb-2 shadow-sm border rounded">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed bg-white text-dark"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#collapseMyBill${bill.bill_id}`}
                    aria-expanded="false"
                  >
                    <div className="d-flex w-100 justify-content-between align-items-center">
                      <span className="fw-bold">{bill.name}</span>
                      <span
                        className={`badge me-3 ${
                          bill.status === 'approved'
                            ? 'bg-success'
                            : bill.status === 'modified'
                              ? 'bg-info'
                              : bill.status === 'rejected'
                                ? 'bg-danger'
                                : 'bg-warning text-dark'
                        }`}
                      >
                        {bill.status === 'under_review'
                          ? 'Under Review'
                          : bill.status === 'approved'
                            ? 'Approved'
                            : bill.status === 'modified'
                              ? 'Modified'
                              : bill.status === 'rejected'
                                ? 'Rejected'
                                : 'Pending'}
                      </span>
                      {bill.hidden && (
                        <span className="badge bg-secondary me-2" title="Hidden from public Bills page">
                          Hidden
                        </span>
                      )}
                      <span className="text-muted">{formatDate(bill.bill_date)}</span>
                    </div>
                  </button>
                </h2>

                <div id={`collapseMyBill${bill.bill_id}`} className="accordion-collapse collapse">
                  <div className="accordion-body">
                    <div className="mb-3">
                      <strong>State:</strong>
                      <p className="mt-1 mb-0">{bill.state}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Description:</strong>
                      <p className="mt-1 mb-0">{bill.description || '-'}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Status:</strong>
                      <p className="mt-1 mb-0">
                        <span
                          className={`badge ${
                            bill.status === 'approved'
                              ? 'bg-success'
                              : bill.status === 'modified'
                                ? 'bg-info'
                                : bill.status === 'rejected'
                                  ? 'bg-danger'
                                  : 'bg-warning text-dark'
                          }`}
                        >
                          {bill.status === 'under_review'
                            ? 'Under Review'
                            : bill.status === 'approved'
                              ? 'Approved'
                              : bill.status === 'modified'
                                ? 'Modified & Approved'
                                : bill.status === 'rejected'
                                  ? 'Rejected'
                                  : 'Pending'}
                        </span>
                      </p>
                    </div>
                    {bill.review_notes && (
                      <div className="mb-3">
                        <strong>Review Notes:</strong>
                        <p className="mt-1 mb-0">{bill.review_notes}</p>
                      </div>
                    )}
                    {bill.reviewed_at && (
                      <div className="mb-3">
                        <strong>Reviewed:</strong>
                        <p className="mt-1 mb-0">{formatDateLong(bill.reviewed_at)}</p>
                      </div>
                    )}
                    {bill.legiscan_link && (
                      <div className="mb-3">
                        <strong>LegiScan:</strong>
                        <p className="mt-1 mb-0">
                          <a href={bill.legiscan_link} target="_blank" rel="noopener noreferrer" className="text-primary">
                            {bill.legiscan_link}
                          </a>
                        </p>
                      </div>
                    )}
                    {bill.google_doc_link && (
                      <div className="mb-3">
                        <strong>Proposal (Google Doc):</strong>
                        <p className="mt-1 mb-0">
                          <a
                            href={bill.google_doc_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary"
                          >
                            Open proposal doc
                          </a>
                        </p>
                      </div>
                    )}
                    <div className="mt-3 d-flex gap-2 flex-wrap">
                      {bill.pdfExists && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          onClick={() => setBillPdfPreviewBill(bill)}
                        >
                          <i className="bi bi-file-pdf me-1"></i>View PDF
                        </button>
                      )}
                      {bill.google_doc_link && (
                        <a href={bill.google_doc_link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
                          <i className="bi bi-link-45deg me-1"></i>Proposal (Google Doc)
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
          <p>{viewAsData ? 'No submitted bills for this member.' : 'No submitted bills yet. Submit your first bill for review.'}</p>
        </div>
      )}
    </section>
  )
}


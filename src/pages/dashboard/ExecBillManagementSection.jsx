import React, { lazy, Suspense } from 'react'
import BillOutreachPanel from '../../components/BillOutreachPanel'
import AiCheckResultPanel from '../../components/AiCheckResultPanel'
import BillAssignmentsExecPanel from './BillAssignmentsExecPanel'
import { billStateGroupKey, usStateAbbreviation } from '../../lib/usStateCanonical'
import { billStatusFilterBtnClass } from '../../lib/billStatusFilterBtn'

const BillResearchPanel = lazy(() => import('../../components/BillResearchPanel'))

export default function ExecBillManagementSection({
  sectionOrder,
  sectionId,
  execBillSectionTab,
  setExecBillSectionTab,

  // Tab: outreach
  execOutreachBills,
  member,
  loadAllBills,

  // Tab: research
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

  // Tab: review_queue
  billFilter,
  setBillFilter,
  effectiveBills,
  viewAsData,
  handleAddBill,
  setBillPdfPreviewBill,
  handleApproveBill,
  handleModifyAndApproveBill,
  handleRejectBill,
  setSelectedBillForEdit,
  setEditBillForm,
  setEditBillPdfFile,
  setBillError,
  setBillSuccess,
  setShowEditBillModal,
  setSelectedBillForDelete,
  setShowDeleteBillModal,

  // Tab: assigned_bills
  billAssignments,
  execAssignmentFilter,
  onExecAssignmentFilterChange,
  execAssignmentTeamFilter,
  onExecAssignmentTeamFilterChange,
  assignmentTeamFilterOptions,
  resolveAssignmentTeamLabel,
  onOpenAssignWork,
  resolveBillAssignmentMemberName,
  resolveBillAssignmentMemberNames,
  onExecStatus,
  onApproveAndPublish,
  onReopenPublish,
  onEditAssignment,
  onRequestDeleteAssignment,
  billProposalAiChecks = {},
  billProposalAiCheckLoadingId = null,
  onCheckBillProposalAi,
  assignmentAiChecks = {},
  assignmentAiCheckLoadingId = null,
  onCheckAssignmentProposalAi,
}) {
  // Hide the redundant status badge when filtering bills by a specific status.
  const showBillStatusBadge = billFilter === 'all'
  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor" style={{ order: sectionOrder }}>
      <div className="mb-3">
        <h3 className="mb-2">Bill Management</h3>
        <div className="btn-group" role="group">
          <button
            type="button"
            className={`btn btn-sm ${
              execBillSectionTab === 'review_queue' ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={() => setExecBillSectionTab('review_queue')}
          >
            Review queue
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              execBillSectionTab === 'assigned_bills' ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={() => setExecBillSectionTab('assigned_bills')}
          >
            Assigned work
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              execBillSectionTab === 'research' ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={() => setExecBillSectionTab('research')}
          >
            Research
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              execBillSectionTab === 'outreach' ? 'btn-primary' : 'btn-outline-secondary'
            }`}
            onClick={() => setExecBillSectionTab('outreach')}
          >
            Outreach
          </button>
        </div>
      </div>

      {execBillSectionTab === 'outreach' && (
        <BillOutreachPanel bills={execOutreachBills} member={member} onBillsChanged={loadAllBills} />
      )}

      {execBillSectionTab === 'research' && (
        <Suspense
          fallback={
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading research…</span>
              </div>
            </div>
          }
        >
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
        </Suspense>
      )}

      {execBillSectionTab === 'review_queue' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <span className="text-muted small align-self-center">Submitted proposals for approval</span>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${billStatusFilterBtnClass('all', billFilter === 'all')}`}
                  onClick={() => setBillFilter('all')}
                >
                  All ({effectiveBills.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${billStatusFilterBtnClass('under_review', billFilter === 'under_review')}`}
                  onClick={() => setBillFilter('under_review')}
                >
                  Under Review (
                  {effectiveBills.filter(
                    (b) => b.status === 'under_review' || (!b.status && billFilter === 'under_review')
                  ).length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${billStatusFilterBtnClass('approved', billFilter === 'approved')}`}
                  onClick={() => setBillFilter('approved')}
                >
                  Approved (
                  {effectiveBills.filter(
                    (b) => b.status === 'approved' || (!b.status && billFilter === 'approved')
                  ).length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${billStatusFilterBtnClass('modified', billFilter === 'modified')}`}
                  onClick={() => setBillFilter('modified')}
                >
                  Modified ({effectiveBills.filter((b) => b.status === 'modified').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${billStatusFilterBtnClass('rejected', billFilter === 'rejected')}`}
                  onClick={() => setBillFilter('rejected')}
                >
                  Rejected ({effectiveBills.filter((b) => b.status === 'rejected').length})
                </button>
              </div>
              {!viewAsData && (
                <button className="btn btn-dark btn-sm" onClick={handleAddBill}>
                  <i className="bi bi-plus-circle me-2"></i>Upload New Bill
                </button>
              )}
            </div>
          </div>

          {(() => {
            const filteredBills =
              billFilter === 'all'
                ? effectiveBills.filter((bill) => bill.status !== 'outreach_only')
                : effectiveBills.filter((bill) => {
                    if (bill.status === 'outreach_only') return false
                    if (billFilter === 'approved' && (!bill.status || bill.status === 'approved')) return true
                    return bill.status === billFilter
                  })

            // Group by state (canonical so abbreviations match full names)
            const billsByStateFiltered = {}
            filteredBills.forEach((bill) => {
              const state = billStateGroupKey(bill.state)
              if (!billsByStateFiltered[state]) billsByStateFiltered[state] = []
              billsByStateFiltered[state].push(bill)
            })

            const sortedStatesFiltered = Object.keys(billsByStateFiltered).sort((a, b) => {
              if (a === 'Unknown') return 1
              if (b === 'Unknown') return -1
              return a.localeCompare(b)
            })

            return filteredBills.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {sortedStatesFiltered.map((state) => {
                  const stateBills = billsByStateFiltered[state]
                  const stateFileName = getStateFileName(state)
                  const stateHeading =
                    state === 'Unknown' ? 'Unknown' : usStateAbbreviation(state) || state

                  return (
                    <div key={state} className="accordion mb-3 shadow-sm border rounded">
                      <h2 className="accordion-header">
                        <button
                          className="accordion-button collapsed bg-light text-dark"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapseState${state.replace(/\s+/g, '')}`}
                          aria-expanded="false"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={`/images/states/${stateFileName}.svg`}
                              alt={`${state} flag`}
                              style={{ width: '32px', height: 'auto' }}
                              onError={(e) => {
                                e.target.src = '/images/states/United States.svg'
                              }}
                            />
                            <span>{stateHeading}</span>
                            <span className="fw-bold ms-2 text-muted">
                              ({stateBills.length} {stateBills.length === 1 ? 'bill' : 'bills'})
                            </span>
                          </div>
                        </button>
                      </h2>

                      <div
                        id={`collapseState${state.replace(/\s+/g, '')}`}
                        className="accordion-collapse collapse"
                      >
                        <div className="accordion-body">
                          <div
                            className="accordion"
                            id={`stateAccordion${state.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`}
                          >
                            {stateBills.map((bill) => (
                              <div key={bill.bill_id} className="accordion-item mb-2 shadow-sm border rounded">
                                <h2 className="accordion-header">
                                  <button
                                    className="accordion-button collapsed bg-white text-dark"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target={`#collapseBill${bill.bill_id}`}
                                    aria-expanded="false"
                                  >
                                    <div className="d-flex w-100 justify-content-between align-items-center">
                                      <span className="fw-bold">{bill.name}</span>
                                      <div className="d-flex gap-2 align-items-center">
                                        <span
                                          className={`badge ${
                                            bill.position === 'Support'
                                              ? 'bg-success'
                                              : bill.position === 'Oppose'
                                                ? 'bg-danger'
                                                : bill.position === 'Propose'
                                                  ? 'bg-info'
                                                  : 'bg-warning text-dark'
                                          }`}
                                        >
                                          {bill.position}
                                        </span>
                                        {showBillStatusBadge && bill.status && bill.status !== 'approved' && (
                                          <span
                                            className={`badge ${
                                              bill.status === 'under_review'
                                                ? 'bg-warning text-dark'
                                                : bill.status === 'modified'
                                                  ? 'bg-info'
                                                  : bill.status === 'rejected'
                                                    ? 'bg-danger'
                                                    : 'bg-secondary'
                                            }`}
                                            title={
                                              bill.status === 'under_review' ? 'Under Review' : bill.status
                                            }
                                          >
                                            {bill.status === 'under_review'
                                              ? 'Under Review'
                                              : bill.status === 'modified'
                                                ? 'Modified'
                                                : bill.status === 'rejected'
                                                  ? 'Rejected'
                                                  : bill.status}
                                          </span>
                                        )}
                                        {bill.hidden &&
                                          (bill.status === 'approved' || bill.status === 'modified') && (
                                            <span className="badge bg-secondary" title="Hidden from public Bills page">
                                              Hidden
                                            </span>
                                          )}
                                      </div>
                                      <span className="text-muted">{formatDate(bill.bill_date)}</span>
                                    </div>
                                  </button>
                                </h2>

                                <div
                                  id={`collapseBill${bill.bill_id}`}
                                  className="accordion-collapse collapse"
                                  data-bs-parent={`#stateAccordion${state.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`}
                                >
                                  <div className="accordion-body">
                                    <div className="mb-3">
                                      <strong>Description:</strong>
                                      <p className="mt-1 mb-0">{bill.description || '-'}</p>
                                    </div>
                                    {bill.legiscan_link && (
                                      <div className="mb-3">
                                        <strong>LegiScan Link:</strong>
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
                                          <a href={bill.google_doc_link} target="_blank" rel="noopener noreferrer" className="text-primary">
                                            {bill.google_doc_link}
                                          </a>
                                        </p>
                                      </div>
                                    )}
                                    {bill.bill_collaborators && bill.bill_collaborators.length > 0 && (
                                      <div className="mb-3">
                                        <strong>Collaborators:</strong>
                                        <p className="mt-1 mb-0">{bill.bill_collaborators.join(', ')}</p>
                                      </div>
                                    )}
                                    {bill.status === 'under_review' && bill.submitted_by && (
                                      <div className="mb-3">
                                        <strong>Submitted By:</strong>
                                        <p className="mt-1 mb-0">
                                          {(() => {
                                            const submitter = allMembers.find((m) => m.member_id === bill.submitted_by)
                                            return submitter ? `${submitter.first_name} ${submitter.last_name}` : 'Unknown'
                                          })()}
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
                                      {bill.status === 'under_review' && bill.pdfExists && onCheckBillProposalAi && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-secondary"
                                          disabled={billProposalAiCheckLoadingId === bill.bill_id}
                                          title="Extract text from proposal PDF and run ScreenComply AI detection"
                                          onClick={() => onCheckBillProposalAi(bill)}
                                        >
                                          {billProposalAiCheckLoadingId === bill.bill_id ? (
                                            <>
                                              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                              Checking…
                                            </>
                                          ) : (
                                            <>
                                              <i className="bi bi-robot me-1"></i>Check AI (PDF)
                                            </>
                                          )}
                                        </button>
                                      )}

                                      {bill.status === 'under_review' ? (
                                        <>
                                          <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => {
                                              if (window.confirm(`Approve "${bill.name}" and make it live?`)) {
                                                handleApproveBill(bill, false, false)
                                              }
                                            }}
                                          >
                                            <i className="bi bi-check-circle me-1"></i>Approve
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-success"
                                            onClick={() => {
                                              if (
                                                window.confirm(
                                                  `Approve "${bill.name}" but keep it hidden from the public site? It will stay in the backend and the submitter can still see it.`
                                                )
                                              ) {
                                                handleApproveBill(bill, false, true)
                                              }
                                            }}
                                            title="Approved but not shown on public Bills page"
                                          >
                                            <i className="bi bi-eye-slash me-1"></i>Approve but hide
                                          </button>
                                          <button className="btn btn-sm btn-primary" onClick={() => handleModifyAndApproveBill(bill)}>
                                            <i className="bi bi-pencil me-1"></i>Modify & Approve
                                          </button>
                                          <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => {
                                              const notes = window.prompt('Rejection reason (optional):')
                                              if (notes !== null) handleRejectBill(bill, notes)
                                            }}
                                          >
                                            <i className="bi bi-x-circle me-1"></i>Reject
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => {
                                              setSelectedBillForEdit(bill)
                                              setEditBillForm({
                                                state: bill.state || '',
                                                name: bill.name || '',
                                                position: bill.position || 'Support',
                                                description: bill.description || '',
                                                billDate: bill.bill_date
                                                  ? new Date(bill.bill_date).toISOString().split('T')[0]
                                                  : '',
                                                legiscanLink: bill.legiscan_link || '',
                                                googleDocLink: bill.google_doc_link || '',
                                                hidden: !!bill.hidden,
                                                collaborators: bill.bill_collaborators || [],
                                              })
                                              setEditBillPdfFile(null)
                                              setBillError('')
                                              setBillSuccess('')
                                              setShowEditBillModal(true)
                                            }}
                                          >
                                            <i className="bi bi-pencil me-1"></i>Edit
                                          </button>
                                          <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => {
                                              setSelectedBillForDelete(bill)
                                              setShowDeleteBillModal(true)
                                            }}
                                          >
                                            <i className="bi bi-trash me-1"></i>Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                    {billProposalAiChecks[bill.bill_id] && (
                                      <AiCheckResultPanel result={billProposalAiChecks[bill.bill_id]} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
                <p>No {billFilter === 'all' ? '' : billFilter.replace('_', ' ')} bills found.</p>
              </div>
            )
          })()}
        </>
      )}

      {execBillSectionTab === 'assigned_bills' && (
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
          assignmentAiChecks={assignmentAiChecks}
          assignmentAiCheckLoadingId={assignmentAiCheckLoadingId}
          onCheckAssignmentProposalAi={onCheckAssignmentProposalAi}
        />
      )}
    </section>
  )
}


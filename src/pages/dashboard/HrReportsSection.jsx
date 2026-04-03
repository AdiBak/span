import React from 'react'

/**
 * HR reports list + filters; execs see full queue, members see their own submissions.
 */
export default function HrReportsSection({
  sectionOrder,
  hrReportFilter,
  setHrReportFilter,
  effectiveHrReports,
  filteredHrReports,
  viewAsData,
  memberLoaded,
  isExec,
  formatDateLong,
  formatDate,
  onOpenSubmitHrReport,
  onViewReport,
}) {
  return (
    <section className="mt-5" style={{ order: sectionOrder }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h3 className="mb-0">HR Reports</h3>
        <div className="d-flex align-items-center gap-2">
          {isExec && (
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${hrReportFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => setHrReportFilter('all')}
              >
                All ({effectiveHrReports.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${hrReportFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => setHrReportFilter('pending')}
              >
                Pending ({effectiveHrReports.filter((r) => r.status === 'pending').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${hrReportFilter === 'reviewed' ? 'btn-info' : 'btn-outline-info'}`}
                onClick={() => setHrReportFilter('reviewed')}
              >
                Reviewed ({effectiveHrReports.filter((r) => r.status === 'reviewed').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${hrReportFilter === 'resolved' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setHrReportFilter('resolved')}
              >
                Resolved ({effectiveHrReports.filter((r) => r.status === 'resolved').length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${hrReportFilter === 'dismissed' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setHrReportFilter('dismissed')}
              >
                Dismissed ({effectiveHrReports.filter((r) => r.status === 'dismissed').length})
              </button>
            </div>
          )}
          {!viewAsData && (
            <button className="btn btn-dark btn-sm" onClick={onOpenSubmitHrReport}>
              <i className="bi bi-file-earmark-text me-2"></i>Submit HR Report
            </button>
          )}
        </div>
      </div>
      {isExec ? (
        <>
          <div className="alert alert-info mb-3">
            <i className="bi bi-info-circle me-2"></i>
            You can view all HR reports except those that involve you directly.
          </div>
          {filteredHrReports.length > 0 ? (
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Submitted By</th>
                    <th>Nature of Complaint</th>
                    <th>Regarding</th>
                    <th>Date Occurred</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHrReports.map((report) => (
                    <tr key={report.report_id}>
                      <td>{formatDateLong(report.created_at)}</td>
                      <td>
                        {report.submitted_by_member
                          ? `${report.submitted_by_member.first_name} ${report.submitted_by_member.last_name}`
                          : 'Unknown'}
                      </td>
                      <td>{report.nature_of_complaint}</td>
                      <td>
                        {report.regarding_member
                          ? `${report.regarding_member.first_name} ${report.regarding_member.last_name}`
                          : report.regarding_name || 'N/A'}
                      </td>
                      <td>{formatDate(report.date_occurred)}</td>
                      <td>
                        <span
                          className={`badge ${
                            report.status === 'pending'
                              ? 'bg-warning text-dark'
                              : report.status === 'resolved'
                                ? 'bg-success'
                                : report.status === 'dismissed'
                                  ? 'bg-secondary'
                                  : 'bg-info'
                          }`}
                        >
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => onViewReport(report)}
                        >
                          <i className="bi bi-eye me-1"></i>View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
              <p>No {hrReportFilter === 'all' ? '' : hrReportFilter} HR reports found.</p>
            </div>
          )}
        </>
      ) : memberLoaded ? (
        <>
          <p className="text-muted mb-2">Your submitted HR reports.</p>
          {filteredHrReports.length > 0 ? (
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    <th>Nature of Complaint</th>
                    <th>Regarding</th>
                    <th>Date Occurred</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHrReports.map((report) => (
                    <tr key={report.report_id}>
                      <td>{formatDateLong(report.created_at)}</td>
                      <td>{report.nature_of_complaint}</td>
                      <td>
                        {report.regarding_member
                          ? `${report.regarding_member.first_name} ${report.regarding_member.last_name}`
                          : report.regarding_name || 'N/A'}
                      </td>
                      <td>{formatDate(report.date_occurred)}</td>
                      <td>
                        <span
                          className={`badge ${
                            report.status === 'pending'
                              ? 'bg-warning text-dark'
                              : report.status === 'resolved'
                                ? 'bg-success'
                                : report.status === 'dismissed'
                                  ? 'bg-secondary'
                                  : 'bg-info'
                          }`}
                        >
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => onViewReport(report)}
                        >
                          <i className="bi bi-eye me-1"></i>View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
              <p>You have not submitted any HR reports.</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-muted mb-0">
          Submit a confidential HR complaint or report using the button above. Reports are reviewed by executive directors.
        </p>
      )}
    </section>
  )
}

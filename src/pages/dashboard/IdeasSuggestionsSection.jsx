import React from 'react'

export default function IdeasSuggestionsSection({
  sectionOrder,
  viewAsData,
  isExec,
  suggestionForm,
  setSuggestionForm,
  suggestionError,
  suggestionSuccess,
  onSubmitSuggestion,
  suggestionFilter,
  setSuggestionFilter,
  allSuggestions,
  effectiveSuggestions,
  formatDateLong,
  onViewSuggestion,
}) {
  return (
    <section className="mt-5" style={{ order: sectionOrder }}>
      <h3 className="mb-4">Ideas & Suggestions</h3>
      <p className="text-muted mb-3">
        Suggest a bill you want to work on, share interests, or propose a web or feature idea. Execs can review and leave
        comments.
      </p>

      {!viewAsData && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Submit an idea</h5>
            <form onSubmit={onSubmitSuggestion}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={suggestionForm.type}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, type: e.target.value })}
                  >
                    <option value="bill_idea">Bill idea</option>
                    <option value="general_interest">General interest</option>
                    <option value="web_dev_feature">Web / feature suggestion</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Short title for your idea"
                    value={suggestionForm.title}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, title: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Description (optional)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Add details, links, or context"
                    value={suggestionForm.description}
                    onChange={(e) => setSuggestionForm({ ...suggestionForm, description: e.target.value })}
                  />
                </div>
              </div>
              {suggestionError && <div className="text-danger small mt-2">{suggestionError}</div>}
              {suggestionSuccess && <div className="text-success small mt-2">{suggestionSuccess}</div>}
              <button type="submit" className="btn btn-dark mt-3">
                Submit suggestion
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="d-flex align-items-center gap-2 mb-3">
        {isExec && !viewAsData && (
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${suggestionFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setSuggestionFilter('all')}
            >
              All ({allSuggestions.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${suggestionFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setSuggestionFilter('pending')}
            >
              Pending ({allSuggestions.filter((s) => s.status === 'pending').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${suggestionFilter === 'under_review' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setSuggestionFilter('under_review')}
            >
              Under review ({allSuggestions.filter((s) => s.status === 'under_review').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${suggestionFilter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setSuggestionFilter('approved')}
            >
              Approved ({allSuggestions.filter((s) => s.status === 'approved').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${suggestionFilter === 'declined' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setSuggestionFilter('declined')}
            >
              Declined ({allSuggestions.filter((s) => s.status === 'declined').length})
            </button>
          </div>
        )}
      </div>

      {effectiveSuggestions.length > 0 ? (
        <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="table table-hover">
            <thead>
              <tr>
                {isExec && !viewAsData && <th>Member</th>}
                <th>Type</th>
                <th>Title</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {effectiveSuggestions.map((s) => (
                <tr key={s.suggestion_id}>
                  {isExec && !viewAsData && (
                    <td>
                      {s.member ? `${s.member.first_name} ${s.member.last_name}` : 'Unknown'}
                      {s.member?.email && <div className="small text-muted">{s.member.email}</div>}
                    </td>
                  )}
                  <td>
                    <span className="badge bg-secondary">
                      {s.type === 'bill_idea'
                        ? 'Bill idea'
                        : s.type === 'general_interest'
                          ? 'General interest'
                          : 'Web / feature'}
                    </span>
                  </td>
                  <td>{s.title}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === 'pending'
                          ? 'bg-warning text-dark'
                          : s.status === 'under_review'
                            ? 'bg-info'
                            : s.status === 'approved'
                              ? 'bg-success'
                              : 'bg-danger'
                      }`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{formatDateLong(s.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onViewSuggestion(s)}
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
        <div className="text-center py-4 text-muted">
          <i className="bi bi-lightbulb display-4 d-block mb-2"></i>
          <p className="mb-0">
            {viewAsData
              ? 'No suggestions to show.'
              : isExec
                ? `No ${suggestionFilter === 'all' ? '' : suggestionFilter.replace('_', ' ')} suggestions.`
                : "You haven't submitted any suggestions yet."}
          </p>
        </div>
      )}
    </section>
  )
}

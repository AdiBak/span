import React from 'react'
import LegislatureBillTextPane from './LegislatureBillTextPane'

/**
 * Full LegiScan bill body for Research / Compare (same content as Legislature tab detail).
 */
export default function LegislatureResearchBillDetail({
  detail,
  sortedLegTexts,
  legTextIndex,
  onLegTextIndexChange,
  selectedLegText,
  idSuffix = '',
}) {
  if (!detail) return null

  const selectId = `legBillTextVersion${idSuffix ? `-${idSuffix}` : ''}`

  return (
    <div className="legislature-research-bill-detail">
      <div className="mb-3 pb-3 border-bottom">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
          <div>
            <h4 className="h6 mb-1">
              {detail.state} {detail.billNumber}
            </h4>
            <p className="mb-0 fw-semibold">{detail.title || '—'}</p>
            {detail.sessionName && <p className="small text-muted mb-0 mt-1">Session: {detail.sessionName}</p>}
          </div>
          <div className="text-end">
            {detail.status && <span className="badge bg-primary">{detail.status}</span>}
            {detail.chamber && <div className="small text-muted mt-1">{detail.chamber}</div>}
          </div>
        </div>
        {detail.url && (
          <a href={detail.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary mt-2">
            <i className="bi bi-box-arrow-up-right me-1"></i>
            Open on LegiScan
          </a>
        )}
      </div>

      <div className="row g-3 align-items-start">
        <div className="col-lg-5">
          {detail.description && (
            <div className="mb-3">
              <strong>Summary / description</strong>
              <p className="small mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                {detail.description}
              </p>
            </div>
          )}

          {(detail.statusDate || detail.lastAction) && (
            <div className="small text-muted mb-3">
              {detail.statusDate && <div>Status date: {detail.statusDate}</div>}
              {detail.lastAction && <div className="mt-1">Latest action: {detail.lastAction}</div>}
            </div>
          )}

          {detail.sponsors.length > 0 && (
            <div className="mb-3">
              <strong>Sponsors</strong>
              <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-1 small mt-1">
                {detail.sponsors.map((s, i) => (
                  <div key={`${s.name}-${i}`} className="col text-break">
                    <span className="d-block">{s.name}</span>
                    {(s.party || s.role) && (
                      <span className="text-muted">
                        {s.party ? `(${s.party})` : ''}
                        {s.party && s.role ? ' ' : ''}
                        {s.role || ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {sortedLegTexts.length > 0 && (
            <div className="mb-3">
              <label className="form-label small mb-1" htmlFor={selectId}>
                Bill text version
              </label>
              <select
                id={selectId}
                className="form-select form-select-sm"
                value={Math.min(legTextIndex, sortedLegTexts.length - 1)}
                onChange={(e) => onLegTextIndexChange(Number(e.target.value))}
              >
                {sortedLegTexts.map((t, i) => (
                  <option key={t.docId != null ? `d-${t.docId}` : `i-${i}`} value={i}>
                    {t.type}
                    {t.date ? ` (${t.date})` : ''}
                    {t.mime ? ` — ${t.mime}` : ''}
                  </option>
                ))}
              </select>
              {selectedLegText?.url && (
                <a
                  href={selectedLegText.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="small d-inline-block mt-1"
                >
                  Open selected version in new tab
                </a>
              )}
              {!selectedLegText?.url && selectedLegText?.docId != null && (
                <p className="small text-muted mb-0 mt-1">
                  Text loads from LegiScan when no state URL is listed (may take a moment).
                </p>
              )}
            </div>
          )}

          {detail.history.length > 0 && (
            <div className="mb-1">
              <strong>Recent history</strong>
              <div
                className="table-responsive border rounded mt-2"
                style={{ maxHeight: 'min(40vh, 360px)', overflowY: 'auto' }}
              >
                <table className="table table-sm table-striped mb-0 small">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th style={{ width: '7rem' }}>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.history.map((h, idx) => (
                      <tr key={idx}>
                        <td className="text-nowrap">{h.date || '—'}</td>
                        <td>{h.action || h.title || h.description || h.action_desc || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-7">
          <strong className="d-block mb-2">Bill text</strong>
          <LegislatureBillTextPane textEntry={selectedLegText} />
        </div>
      </div>
    </div>
  )
}

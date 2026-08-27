import React, { useState } from 'react'
import { fetchLegiscanBillDetailById, fetchLegiscanBillsByFilters } from '../lib/legiscan'
import { US_STATE_CODE_TO_NAME } from '../lib/usStateCanonical'

const US_STATE_OPTIONS = Object.entries(US_STATE_CODE_TO_NAME)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name))

/**
 * Classroom-friendly LegiScan search (same API as dashboard Research → Legislature).
 */
export default function ClassroomLegiscanPanel() {
  const [state, setState] = useState('CA')
  const [billNumber, setBillNumber] = useState('')
  const [keywords, setKeywords] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState([])
  const [detail, setDetail] = useState(null)
  const [detailBusy, setDetailBusy] = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setDetail(null)
    try {
      const res = await fetchLegiscanBillsByFilters({
        state,
        billNumber,
        keywords,
      })
      if (!res.ok) {
        setResults([])
        setError(res.message || 'Search failed.')
        return
      }
      setResults(res.results || [])
    } catch (err) {
      setResults([])
      setError(err.message || 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  async function openDetail(billId) {
    setDetailBusy(true)
    setError('')
    try {
      const res = await fetchLegiscanBillDetailById(billId)
      if (!res.ok) {
        setDetail(null)
        setError(res.message || 'Could not load bill details.')
        return
      }
      setDetail(res.detail)
    } catch (err) {
      setDetail(null)
      setError(err.message || 'Could not load bill details.')
    } finally {
      setDetailBusy(false)
    }
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-white">
        <h5 className="mb-0">LegiScan bill search</h5>
      </div>
      <div className="card-body">
        <p className="small text-muted mb-3">
          Search real state legislation (same data SPAN uses for bill research). Try a state plus keywords
          (e.g. “patient advocacy”) or a bill number like AB123.
        </p>

        <form className="row g-2 align-items-end mb-3" onSubmit={handleSearch}>
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="classroom-legiscan-state">
              State
            </label>
            <select
              id="classroom-legiscan-state"
              className="form-select form-select-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {US_STATE_OPTIONS.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="classroom-legiscan-bill">
              Bill number
            </label>
            <input
              id="classroom-legiscan-bill"
              className="form-control form-control-sm"
              placeholder="e.g. AB123"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-1" htmlFor="classroom-legiscan-keywords">
              Keywords
            </label>
            <input
              id="classroom-legiscan-keywords"
              className="form-control form-control-sm"
              placeholder="e.g. healthcare students"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-sm btn-dark w-100" disabled={busy}>
              {busy ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {results.length > 0 && (
          <div className="classroom-scroll mb-3 border rounded">
            <div className="list-group list-group-flush">
              {results.map((r) => (
                <button
                  key={r.billId}
                  type="button"
                  className={`list-group-item list-group-item-action small ${
                    detail?.legiscanBillId === r.billId ? 'active' : ''
                  }`}
                  onClick={() => openDetail(r.billId)}
                >
                  <div className="fw-semibold">
                    {r.billNumber || r.billId}
                    {r.state ? ` · ${r.state}` : ''}
                  </div>
                  <div className={detail?.legiscanBillId === r.billId ? 'text-white-50' : 'text-muted'}>
                    {r.title || 'Untitled bill'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {detailBusy && (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-secondary" role="status" />
          </div>
        )}

        {detail && !detailBusy && (
          <div className="border rounded p-3 bg-light">
            <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
              <div>
                <div className="fw-semibold">
                  {detail.billNumber} · {detail.state}
                </div>
                <div className="small text-muted">{detail.sessionName}</div>
              </div>
              {detail.url && (
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline-dark"
                >
                  Open on LegiScan
                </a>
              )}
            </div>
            <h6 className="mb-2">{detail.title}</h6>
            {detail.description && (
              <p className="small classroom-submission-body mb-2">{detail.description}</p>
            )}
            <div className="small mb-2">
              <strong>Status:</strong> {detail.status || '—'}
              {detail.statusDate ? ` (${detail.statusDate})` : ''}
            </div>
            {detail.lastAction && (
              <div className="small mb-2">
                <strong>Last action:</strong> {detail.lastAction}
              </div>
            )}
            {detail.sponsors?.length > 0 && (
              <div className="small mb-2">
                <strong>Sponsors:</strong>{' '}
                {detail.sponsors
                  .slice(0, 8)
                  .map((s) => s.name || s)
                  .filter(Boolean)
                  .join(', ')}
                {detail.sponsors.length > 8 ? '…' : ''}
              </div>
            )}
            {detail.history?.length > 0 && (
              <div className="small">
                <strong>Recent history</strong>
                <ul className="mb-0 mt-1 classroom-scroll" style={{ maxHeight: 160 }}>
                  {detail.history.slice(0, 12).map((h, i) => (
                    <li key={i}>
                      {h.date ? `${h.date}: ` : ''}
                      {h.action || h.title || h.description || 'Update'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

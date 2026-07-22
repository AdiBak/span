import React from 'react'
import { fetchLegiscanBillsByFilters, fetchLegiscanBillDetailById } from '../lib/legiscan'
import { billStatusFilterBtnClass } from '../lib/billStatusFilterBtn'
import SpanResearchBillDetail from './SpanResearchBillDetail'
import LegislatureResearchBillDetail from './LegislatureResearchBillDetail'

/** US states + DC for LegiScan lookup (two-letter codes). */
const US_STATE_OPTIONS = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

function researchFilterChipLabel(key) {
  switch (key) {
    case 'all':
      return 'All'
    case 'under_review':
      return 'Under review'
    case 'approved':
      return 'Approved'
    case 'modified':
      return 'Modified'
    case 'rejected':
      return 'Rejected'
    default:
      return key
  }
}

function spanBillRowStatusLabel(status) {
  if (!status || status === 'approved') return 'Approved'
  if (status === 'under_review') return 'Under review'
  if (status === 'modified') return 'Modified'
  if (status === 'rejected') return 'Rejected'
  return status
}

function spanBillStatusBadgeClass(status) {
  if (status === 'approved' || !status) return 'bg-success'
  if (status === 'under_review') return 'bg-warning text-dark'
  if (status === 'modified') return 'bg-info text-dark'
  if (status === 'rejected') return 'bg-danger'
  return 'bg-secondary'
}

function stateSlug(state) {
  return String(state || 'unknown').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') || 'unknown'
}

function compactBillId(s) {
  return String(s || '').replace(/\s/g, '').toLowerCase()
}

/** Stable string id for bill rows and <select> values (API may use number or UUID string). */
function normBillId(id) {
  if (id == null || id === '') return ''
  return String(id)
}

/** Match SPAN bill.state against free text or a 2-letter code (also checks full state name). */
function spanBillMatchesState(billState, filterRaw) {
  const t = (filterRaw || '').trim().toLowerCase()
  if (!t) return true
  const bs = (billState || '').trim().toLowerCase()
  if (bs.includes(t)) return true
  const byCode = US_STATE_OPTIONS.find((o) => o.code.toLowerCase() === t)
  if (byCode) {
    const n = byCode.name.toLowerCase()
    return bs === byCode.code.toLowerCase() || bs === n || bs.includes(n)
  }
  return false
}

/**
 * SPAN corpus research (v1): search, status filters, by state, rich detail with doc/PDF embeds.
 */
export default function BillResearchPanel({
  bills,
  loading,
  loadError,
  spanSearchState = '',
  onSpanSearchStateChange,
  spanSearchBillNumber = '',
  onSpanSearchBillNumberChange,
  spanSearchKeywords = '',
  onSpanSearchKeywordsChange,
  statusFilter,
  onStatusFilterChange,
  allMembers,
  getBillPdfUrl,
  formatDate,
  onRefresh,
  getStateFileName,
}) {
  const showSpanBillStatusBadge = statusFilter === 'all'
  const [researchSource, setResearchSource] = React.useState('span')
  const [legState, setLegState] = React.useState('GA')
  const [legBillNumber, setLegBillNumber] = React.useState('')
  const [legKeywords, setLegKeywords] = React.useState('')
  const [legResults, setLegResults] = React.useState([])
  const [legSelectedBillId, setLegSelectedBillId] = React.useState(null)
  const [legLoading, setLegLoading] = React.useState(false)
  const [legError, setLegError] = React.useState('')
  const [legDetail, setLegDetail] = React.useState(null)
  const [legTextIndex, setLegTextIndex] = React.useState(0)

  /** Compare tab: SPAN bill + separate LegiScan search state */
  const [compareSpanBillId, setCompareSpanBillId] = React.useState('')
  const [cmpLegState, setCmpLegState] = React.useState('GA')
  const [cmpLegBillNumber, setCmpLegBillNumber] = React.useState('')
  const [cmpLegKeywords, setCmpLegKeywords] = React.useState('')
  const [cmpLegResults, setCmpLegResults] = React.useState([])
  const [cmpLegSelectedBillId, setCmpLegSelectedBillId] = React.useState(null)
  const [cmpLegLoading, setCmpLegLoading] = React.useState(false)
  const [cmpLegError, setCmpLegError] = React.useState('')
  const [cmpLegDetail, setCmpLegDetail] = React.useState(null)
  const [cmpLegTextIndex, setCmpLegTextIndex] = React.useState(0)

  React.useEffect(() => {
    setLegTextIndex(0)
  }, [legDetail?.legiscanBillId])

  React.useEffect(() => {
    setCmpLegTextIndex(0)
  }, [cmpLegDetail?.legiscanBillId])

  const sortedLegTexts = React.useMemo(() => {
    if (!legDetail?.texts?.length) return []
    return [...legDetail.texts].sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return String(b.date).localeCompare(String(a.date))
    })
  }, [legDetail?.texts])

  const selectedLegText =
    sortedLegTexts.length > 0
      ? sortedLegTexts[Math.min(legTextIndex, sortedLegTexts.length - 1)]
      : null

  const sortedCmpLegTexts = React.useMemo(() => {
    if (!cmpLegDetail?.texts?.length) return []
    return [...cmpLegDetail.texts].sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return String(b.date).localeCompare(String(a.date))
    })
  }, [cmpLegDetail?.texts])

  const selectedCmpLegText =
    sortedCmpLegTexts.length > 0
      ? sortedCmpLegTexts[Math.min(cmpLegTextIndex, sortedCmpLegTexts.length - 1)]
      : null

  const loadLegislatureDetail = React.useCallback(async (billId) => {
    if (!billId) return
    setLegError('')
    setLegLoading(true)
    try {
      const detailRes = await fetchLegiscanBillDetailById(billId)
      if (!detailRes.ok) {
        setLegError(detailRes.message)
        return
      }
      setLegDetail(detailRes.detail)
    } finally {
      setLegLoading(false)
    }
  }, [])

  const handleLegislatureLookup = React.useCallback(
    async (e) => {
      e?.preventDefault()
      setLegError('')
      setLegDetail(null)
      setLegResults([])
      setLegSelectedBillId(null)
      setLegLoading(true)
      try {
        const res = await fetchLegiscanBillsByFilters({
          state: legState,
          billNumber: legBillNumber,
          keywords: legKeywords,
        })
        if (!res.ok) {
          setLegError(res.message)
          return
        }
        const rows = res.results || []
        setLegResults(rows)
        if (rows.length > 0) {
          const firstId = rows[0].billId
          setLegSelectedBillId(firstId)
          const detailRes = await fetchLegiscanBillDetailById(firstId)
          if (!detailRes.ok) {
            setLegError(detailRes.message)
            return
          }
          setLegDetail(detailRes.detail)
        }
      } finally {
        setLegLoading(false)
      }
    },
    [legState, legBillNumber, legKeywords]
  )

  const loadCompareLegDetail = React.useCallback(async (billId) => {
    if (!billId) return
    setCmpLegError('')
    setCmpLegLoading(true)
    try {
      const detailRes = await fetchLegiscanBillDetailById(billId)
      if (!detailRes.ok) {
        setCmpLegError(detailRes.message)
        return
      }
      setCmpLegDetail(detailRes.detail)
    } finally {
      setCmpLegLoading(false)
    }
  }, [])

  const handleCompareLegislatureLookup = React.useCallback(
    async (e) => {
      e?.preventDefault()
      setCmpLegError('')
      setCmpLegDetail(null)
      setCmpLegResults([])
      setCmpLegSelectedBillId(null)
      setCmpLegLoading(true)
      try {
        const res = await fetchLegiscanBillsByFilters({
          state: cmpLegState,
          billNumber: cmpLegBillNumber,
          keywords: cmpLegKeywords,
        })
        if (!res.ok) {
          setCmpLegError(res.message)
          return
        }
        const rows = res.results || []
        setCmpLegResults(rows)
        if (rows.length > 0) {
          const firstId = rows[0].billId
          setCmpLegSelectedBillId(firstId)
          const detailRes = await fetchLegiscanBillDetailById(firstId)
          if (!detailRes.ok) {
            setCmpLegError(detailRes.message)
            return
          }
          setCmpLegDetail(detailRes.detail)
        }
      } finally {
        setCmpLegLoading(false)
      }
    },
    [cmpLegState, cmpLegBillNumber, cmpLegKeywords]
  )

  const filtered = React.useMemo(() => {
    let list = bills || []
    if (statusFilter !== 'all') {
      list = list.filter((b) => {
        if (statusFilter === 'approved') {
          return !b.status || b.status === 'approved'
        }
        return b.status === statusFilter
      })
    }
    const stateF = spanSearchState || ''
    const numF = compactBillId(spanSearchBillNumber)
    const kwRaw = (spanSearchKeywords || '').trim().toLowerCase()
    const kwTokens = kwRaw ? kwRaw.split(/\s+/).filter(Boolean) : []

    if (stateF || numF || kwTokens.length) {
      list = list.filter((bill) => {
        if (!spanBillMatchesState(bill.state, stateF)) return false
        if (numF) {
          const nameC = compactBillId(bill.name)
          if (!nameC.includes(numF)) return false
        }
        if (kwTokens.length) {
          const collab = Array.isArray(bill.bill_collaborators)
            ? bill.bill_collaborators.join(' ')
            : typeof bill.bill_collaborators === 'string'
              ? bill.bill_collaborators
              : ''
          const hay = [
            bill.name,
            bill.description,
            collab,
            bill.position,
            bill.legiscan_link,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!kwTokens.every((tok) => hay.includes(tok))) return false
        }
        return true
      })
    }
    return list
  }, [bills, statusFilter, spanSearchState, spanSearchBillNumber, spanSearchKeywords])

  const { sortedStates, byState } = React.useMemo(() => {
    const by = {}
    filtered.forEach((bill) => {
      const s = bill.state || 'Unknown'
      if (!by[s]) by[s] = []
      by[s].push(bill)
    })
    const sorted = Object.keys(by).sort((a, b) => {
      if (a === 'Unknown') return 1
      if (b === 'Unknown') return -1
      return a.localeCompare(b)
    })
    return { sortedStates: sorted, byState: by }
  }, [filtered])

  const flatFilteredBills = React.useMemo(
    () => sortedStates.flatMap((state) => byState[state] || []),
    [sortedStates, byState]
  )

  React.useEffect(() => {
    if (researchSource !== 'compare') return
    setCompareSpanBillId((prev) => {
      const prevKey = normBillId(prev)
      if (prevKey && flatFilteredBills.some((b) => normBillId(b.bill_id) === prevKey)) return prevKey
      return normBillId(flatFilteredBills[0]?.bill_id)
    })
  }, [researchSource, flatFilteredBills])

  const compareSpanBill = React.useMemo(() => {
    const key = normBillId(compareSpanBillId)
    if (!key) return null
    return flatFilteredBills.find((b) => normBillId(b.bill_id) === key) || null
  }, [flatFilteredBills, compareSpanBillId])

  const submitterName = (memberId) => {
    if (!memberId) return null
    const m = allMembers.find((x) => x.member_id === memberId)
    return m ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || null : null
  }

  const scrollBoxStyle = {
    maxHeight: 'min(72vh, 820px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '0.75rem',
  }

  const comparePaneStyle = {
    maxHeight: 'min(78vh, 880px)',
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '0.75rem',
  }

  return (
    <div className="bill-research-panel">
      <div className="btn-group mb-3" role="group" aria-label="Research data source">
        <button
          type="button"
          className={`btn btn-sm ${researchSource === 'span' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setResearchSource('span')}
        >
          SPAN proposals
        </button>
        <button
          type="button"
          className={`btn btn-sm ${researchSource === 'legislature' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setResearchSource('legislature')}
        >
          Legislature (LegiScan)
        </button>
        <button
          type="button"
          className={`btn btn-sm ${researchSource === 'compare' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setResearchSource('compare')}
        >
          Compare
        </button>
      </div>

      {(researchSource === 'span' || researchSource === 'compare') && (
        <>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <p className="text-muted small mb-0">
              {researchSource === 'compare' ? (
                <>
                  Use the left pane to filter and pick a SPAN proposal; use the right pane for LegiScan (separate from the
                  Legislature tab).
                </>
              ) : (
                <>
                  Browse every SPAN proposal in the database (all statuses). Internal review notes are not shown here.
                  Filter by state, bill number, and keywords (all optional). Bills are grouped by state.
                </>
              )}
            </p>
            {typeof onRefresh === 'function' && (
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onRefresh()}>
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh list
              </button>
            )}
          </div>

          {loadError && (
            <div className="alert alert-danger">
              Could not load bills for research: {loadError}
            </div>
          )}

          {loading && !loadError ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
            </div>
          ) : !loadError ? (
            <>
              {researchSource === 'span' && (
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label small mb-1">Bill state</label>
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      placeholder="e.g. AK, Alaska"
                      value={spanSearchState}
                      onChange={(e) => onSpanSearchStateChange?.(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small mb-1">Bill number</label>
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      placeholder="e.g. HB970, SB12"
                      value={spanSearchBillNumber}
                      onChange={(e) => onSpanSearchBillNumberChange?.(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small mb-1">Keywords</label>
                    <input
                      type="search"
                      className="form-control form-control-sm"
                      placeholder="Title, description, collaborators…"
                      value={spanSearchKeywords}
                      onChange={(e) => onSpanSearchKeywordsChange?.(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small mb-1 d-block">Status</label>
                    <div className="btn-group flex-wrap" role="group">
                      {['all', 'under_review', 'approved', 'modified', 'rejected'].map((key) => {
                        const count =
                          key === 'all'
                            ? bills.length
                            : key === 'approved'
                              ? bills.filter((b) => !b.status || b.status === 'approved').length
                              : bills.filter((b) => b.status === key).length
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`btn btn-sm ${billStatusFilterBtnClass(key, statusFilter === key)}`}
                            onClick={() => onStatusFilterChange(key)}
                          >
                            {key === 'all' ? `All (${count})` : `${researchFilterChipLabel(key)} (${count})`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {researchSource === 'compare' ? (
                <div className="row g-3">
                  <div className="col-lg-6">
                    <div className="border rounded bg-white" style={comparePaneStyle}>
                      <p className="small text-muted mb-2">
                        SPAN corpus filters for this pane. Same data as the proposals tab; changing filters here updates your
                        proposal list below.
                      </p>
                      <div className="row g-2 mb-2">
                        <div className="col-sm-6 col-md-4">
                          <label className="form-label small mb-1">Bill state</label>
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="e.g. AK, Alaska"
                            value={spanSearchState}
                            onChange={(e) => onSpanSearchStateChange?.(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-sm-6 col-md-4">
                          <label className="form-label small mb-1">Bill number</label>
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="e.g. HB970, SB12"
                            value={spanSearchBillNumber}
                            onChange={(e) => onSpanSearchBillNumberChange?.(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-12 col-md-8">
                          <label className="form-label small mb-1">Keywords</label>
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="Title, description, collaborators…"
                            value={spanSearchKeywords}
                            onChange={(e) => onSpanSearchKeywordsChange?.(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label small mb-1 d-block">Status</label>
                        <div className="btn-group flex-wrap" role="group">
                          {['all', 'under_review', 'approved', 'modified', 'rejected'].map((key) => {
                            const count =
                              key === 'all'
                                ? bills.length
                                : key === 'approved'
                                  ? bills.filter((b) => !b.status || b.status === 'approved').length
                                  : bills.filter((b) => b.status === key).length
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`btn btn-sm ${billStatusFilterBtnClass(key, statusFilter === key)}`}
                                onClick={() => onStatusFilterChange(key)}
                              >
                                {key === 'all' ? `All (${count})` : `${researchFilterChipLabel(key)} (${count})`}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <label className="form-label small mb-1" htmlFor="compareSpanBillSelect">
                        SPAN proposal
                      </label>
                      <select
                        id="compareSpanBillSelect"
                        className="form-select form-select-sm mb-3"
                        value={normBillId(compareSpanBillId)}
                        onChange={(e) => setCompareSpanBillId(e.target.value)}
                        disabled={flatFilteredBills.length === 0}
                      >
                        {flatFilteredBills.length === 0 ? (
                          <option value="">No matching proposals</option>
                        ) : (
                          flatFilteredBills.map((b) => (
                            <option key={normBillId(b.bill_id)} value={normBillId(b.bill_id)}>
                              {b.state ? `${b.state} · ` : ''}
                              {b.name || b.bill_id}
                            </option>
                          ))
                        )}
                      </select>
                      {flatFilteredBills.length === 0 ? (
                        <p className="text-muted small mb-0">No bills match your filters. Adjust the fields above.</p>
                      ) : compareSpanBill ? (
                        <SpanResearchBillDetail
                          bill={compareSpanBill}
                          submitterName={submitterName}
                          getBillPdfUrl={getBillPdfUrl}
                          layout="stacked"
                        />
                      ) : (
                        <p className="text-muted small mb-0">Select a proposal.</p>
                      )}
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="border rounded bg-white" style={comparePaneStyle}>
                      <p className="small text-muted mb-2">
                        LegiScan lookup for this pane only. Results and bill text stay here when you switch back to the
                        Legislature tab.
                      </p>
                      <form className="row g-2 align-items-end mb-3" onSubmit={handleCompareLegislatureLookup}>
                        <div className="col-sm-6 col-md-4">
                          <label className="form-label small mb-1">State</label>
                          <select
                            className="form-select form-select-sm"
                            value={cmpLegState}
                            onChange={(e) => setCmpLegState(e.target.value)}
                          >
                            <option value="">— Any / national —</option>
                            {US_STATE_OPTIONS.map(({ code, name }) => (
                              <option key={code} value={code}>
                                {code} — {name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-sm-6 col-md-4">
                          <label className="form-label small mb-1">Bill number</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. HB970"
                            value={cmpLegBillNumber}
                            onChange={(e) => setCmpLegBillNumber(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label small mb-1">Keywords</label>
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="e.g. medicaid, mental health"
                            value={cmpLegKeywords}
                            onChange={(e) => setCmpLegKeywords(e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                        <div className="col-md-4">
                          <button type="submit" className="btn btn-dark btn-sm w-100" disabled={cmpLegLoading}>
                            {cmpLegLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" />
                                Looking up…
                              </>
                            ) : (
                              <>
                                <i className="bi bi-search me-1"></i>
                                Look up
                              </>
                            )}
                          </button>
                        </div>
                      </form>

                      {cmpLegError && <div className="alert alert-warning py-2 small mb-2">{cmpLegError}</div>}

                      {cmpLegResults.length > 0 && (
                        <div className="border rounded bg-light mb-3">
                          <div className="px-2 py-1 border-bottom small text-muted">Results ({cmpLegResults.length})</div>
                          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            <div className="list-group list-group-flush">
                              {cmpLegResults.map((r) => (
                                <button
                                  key={r.billId}
                                  type="button"
                                  className={`list-group-item list-group-item-action py-2 ${
                                    cmpLegSelectedBillId === r.billId ? 'active' : ''
                                  }`}
                                  onClick={() => {
                                    setCmpLegSelectedBillId(r.billId)
                                    loadCompareLegDetail(r.billId)
                                  }}
                                >
                                  <div className="d-flex justify-content-between align-items-start gap-2">
                                    <div className="text-start">
                                      <div className="fw-semibold small">
                                        {r.state} {r.billNumber || '—'}
                                      </div>
                                      <div
                                        className={`small ${cmpLegSelectedBillId === r.billId ? '' : 'text-muted'}`}
                                      >
                                        {r.title || 'Untitled bill'}
                                      </div>
                                    </div>
                                    <div className="small text-nowrap">{r.statusDate || ''}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <LegislatureResearchBillDetail
                        detail={cmpLegDetail}
                        sortedLegTexts={sortedCmpLegTexts}
                        legTextIndex={cmpLegTextIndex}
                        onLegTextIndexChange={setCmpLegTextIndex}
                        selectedLegText={selectedCmpLegText}
                        idSuffix="compare"
                      />

                      {!cmpLegDetail && !cmpLegLoading && cmpLegResults.length === 0 && (
                        <p className="text-muted small mb-0">Run a LegiScan search to show official bill detail here.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-search display-4 d-block mb-3"></i>
                  <p>No bills match your filters.</p>
                </div>
              ) : (
                <div className="bill-research-scroll border rounded bg-white" style={scrollBoxStyle}>
                  {sortedStates.map((state) => {
            const stateBills = byState[state]
            const slug = stateSlug(state)
            const collapseId = `collapseResearchState${slug}`
            const innerAccordionId = `researchBillsAccordion-${slug}`
            const stateFileName = typeof getStateFileName === 'function' ? getStateFileName(state) : null

            return (
              <div key={state} className="accordion mb-3 shadow-sm border rounded">
                <h2 className="accordion-header">
                  <button
                    className="accordion-button collapsed bg-light text-dark"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#${collapseId}`}
                    aria-expanded="false"
                  >
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      {stateFileName && (
                        <img
                          src={`/images/states/${stateFileName}.svg`}
                          alt=""
                          style={{ width: '28px', height: 'auto' }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      )}
                      <span>{state}</span>
                      <span className="fw-bold ms-1 text-muted">
                        ({stateBills.length} {stateBills.length === 1 ? 'bill' : 'bills'})
                      </span>
                    </div>
                  </button>
                </h2>
                <div id={collapseId} className="accordion-collapse collapse">
                  <div className="accordion-body pt-2 pb-2">
                    <div className="accordion accordion-flush" id={innerAccordionId}>
                      {stateBills.map((bill) => {
                        const cid = `researchBill${bill.bill_id}`

                        return (
                          <div key={bill.bill_id} className="accordion-item mb-2 border rounded">
                            <h2 className="accordion-header">
                              <button
                                className="accordion-button collapsed bg-white text-dark py-2"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target={`#${cid}`}
                                data-bs-parent={`#${innerAccordionId}`}
                                aria-expanded="false"
                              >
                                <div className="d-flex w-100 justify-content-between align-items-center flex-wrap gap-2 pe-2">
                                  <span className="fw-bold text-start">{bill.name}</span>
                                  {showSpanBillStatusBadge && (
                                    <span className={`badge ${spanBillStatusBadgeClass(bill.status)}`}>
                                      {spanBillRowStatusLabel(bill.status)}
                                    </span>
                                  )}
                                  {bill.hidden && (
                                    <span className="badge bg-secondary" title="Hidden on public Bills page">
                                      Hidden
                                    </span>
                                  )}
                                  <span className="text-muted small">{formatDate(bill.bill_date)}</span>
                                </div>
                              </button>
                            </h2>
                            <div id={cid} className="accordion-collapse collapse" data-bs-parent={`#${innerAccordionId}`}>
                              <div className="accordion-body">
                                <SpanResearchBillDetail
                                  bill={bill}
                                  submitterName={submitterName}
                                  getBillPdfUrl={getBillPdfUrl}
                                  layout="two-column"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
                </div>
              )}
            </>
          ) : null}
        </>
      )}

      {researchSource === 'legislature' && (
        <>
          <p className="text-muted small mb-3">
            Search LegiScan using any combination: <strong>State</strong> alone lists recent bills in that state; add{' '}
            <strong>Bill number</strong> (e.g. HB970) and/or <strong>Keywords</strong> to narrow results. Bill number
            requires a state. Keywords alone search nationwide. Uses your project&apos;s LegiScan API key.
          </p>
          <form className="row g-2 align-items-end mb-3" onSubmit={handleLegislatureLookup}>
            <div className="col-sm-6 col-md-3 col-lg-2">
              <label className="form-label small mb-1">State</label>
              <select
                className="form-select form-select-sm"
                value={legState}
                onChange={(e) => setLegState(e.target.value)}
              >
                <option value="">— Any / national —</option>
                {US_STATE_OPTIONS.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-sm-6 col-md-3 col-lg-2">
              <label className="form-label small mb-1">Bill number</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. HB970"
                value={legBillNumber}
                onChange={(e) => setLegBillNumber(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="col-sm-8 col-md-4 col-lg-5">
              <label className="form-label small mb-1">Keywords</label>
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="e.g. medicaid, mental health"
                value={legKeywords}
                onChange={(e) => setLegKeywords(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="col-sm-4 col-md-2 col-lg-auto">
              <button type="submit" className="btn btn-dark btn-sm w-100" disabled={legLoading}>
                {legLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" />
                    Looking up…
                  </>
                ) : (
                  <>
                    <i className="bi bi-search me-1"></i>
                    Look up
                  </>
                )}
              </button>
            </div>
          </form>

          {legError && <div className="alert alert-warning">{legError}</div>}

          {legResults.length > 0 && (
            <div className="border rounded bg-white mb-3">
              <div className="px-2 py-1 border-bottom bg-light small text-muted">
                Results ({legResults.length})
              </div>
              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <div className="list-group list-group-flush">
                  {legResults.map((r) => (
                    <button
                      key={r.billId}
                      type="button"
                      className={`list-group-item list-group-item-action ${
                        legSelectedBillId === r.billId ? 'active' : ''
                      }`}
                      onClick={() => {
                        setLegSelectedBillId(r.billId)
                        loadLegislatureDetail(r.billId)
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="text-start">
                          <div className="fw-semibold">
                            {r.state} {r.billNumber || '—'}
                          </div>
                          <div className={legSelectedBillId === r.billId ? '' : 'small text-muted'}>
                            {r.title || 'Untitled bill'}
                          </div>
                        </div>
                        <div className="small text-nowrap">{r.statusDate || ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {legDetail && (
            <div className="bill-research-scroll border rounded bg-white" style={scrollBoxStyle}>
              <LegislatureResearchBillDetail
                detail={legDetail}
                sortedLegTexts={sortedLegTexts}
                legTextIndex={legTextIndex}
                onLegTextIndexChange={setLegTextIndex}
                selectedLegText={selectedLegText}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

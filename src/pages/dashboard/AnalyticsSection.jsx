import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchWebAnalyticsSummary } from '../../lib/webAnalytics'

function ymdLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgoLocal(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

function defaultRange() {
  const end = daysAgoLocal(1)
  const start = daysAgoLocal(7)
  return { startDate: ymdLocal(start), endDate: ymdLocal(end) }
}

function formatNumber(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString()
}

function formatShortDate(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || ''
  const d = new Date(`${ymd}T12:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Simple dual-series area/line chart — no chart library. */
function PageViewsChart({ series }) {
  const [hover, setHover] = useState(null)

  const layout = useMemo(() => {
    const rows = (series || []).filter((r) => r?.date)
    const width = 640
    const height = 220
    const pad = { top: 16, right: 12, bottom: 28, left: 44 }
    const innerW = width - pad.left - pad.right
    const innerH = height - pad.top - pad.bottom
    const maxY = Math.max(
      1,
      ...rows.map((r) => Math.max(Number(r.pageViews) || 0, Number(r.visits) || 0)),
    )
    const n = Math.max(rows.length - 1, 1)
    const xAt = (i) => pad.left + (i / n) * innerW
    const yAt = (v) => pad.top + innerH - (Number(v) / maxY) * innerH

    const toPath = (key) => {
      if (!rows.length) return ''
      return rows
        .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(r[key]).toFixed(1)}`)
        .join(' ')
    }

    const toArea = (key) => {
      if (!rows.length) return ''
      const line = toPath(key)
      const lastX = xAt(rows.length - 1).toFixed(1)
      const firstX = xAt(0).toFixed(1)
      const base = pad.top + innerH
      return `${line} L ${lastX} ${base} L ${firstX} ${base} Z`
    }

    const ticks = 4
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
      const v = Math.round((maxY * i) / ticks)
      return { v, y: yAt(v) }
    })

    const labelEvery = rows.length <= 8 ? 1 : rows.length <= 16 ? 2 : Math.ceil(rows.length / 8)

    return {
      rows,
      width,
      height,
      pad,
      xAt,
      yAt,
      viewsPath: toPath('pageViews'),
      visitsPath: toPath('visits'),
      viewsArea: toArea('pageViews'),
      yTicks,
      labelEvery,
    }
  }, [series])

  if (!layout.rows.length) {
    return <p className="small text-muted mb-0 py-4 text-center">No daily data for this range.</p>
  }

  const { rows, width, height, pad, xAt, yAt, viewsPath, visitsPath, viewsArea, yTicks, labelEvery } =
    layout

  return (
    <div className="analytics-chart">
      <div className="d-flex flex-wrap align-items-center gap-3 small mb-2">
        <span className="d-inline-flex align-items-center gap-1">
          <span
            className="rounded-circle d-inline-block"
            style={{ width: 8, height: 8, background: '#0d6efd' }}
            aria-hidden="true"
          />
          Page views
        </span>
        <span className="d-inline-flex align-items-center gap-1 text-muted">
          <span
            className="d-inline-block"
            style={{
              width: 14,
              height: 0,
              borderTop: '2px dashed #6c757d',
            }}
            aria-hidden="true"
          />
          Visits
        </span>
        {hover != null && rows[hover] && (
          <span className="ms-auto text-muted">
            {formatShortDate(rows[hover].date)} · {formatNumber(rows[hover].pageViews)} views ·{' '}
            {formatNumber(rows[hover].visits)} visits
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="220"
        role="img"
        aria-label="Daily page views and visits"
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={`y-${t.v}`}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={t.y}
              y2={t.y}
              stroke="#e9ecef"
              strokeWidth="1"
            />
            <text x={pad.left - 8} y={t.y + 3} textAnchor="end" fontSize="10" fill="#6c757d">
              {formatNumber(t.v)}
            </text>
          </g>
        ))}
        <path d={viewsArea} fill="rgba(13, 110, 253, 0.12)" />
        <path d={viewsPath} fill="none" stroke="#0d6efd" strokeWidth="2" strokeLinejoin="round" />
        <path
          d={visitsPath}
          fill="none"
          stroke="#6c757d"
          strokeWidth="1.75"
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        {rows.map((r, i) => (
          <g key={r.date}>
            {i % labelEvery === 0 && (
              <text x={xAt(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="#6c757d">
                {formatShortDate(r.date)}
              </text>
            )}
            <circle
              cx={xAt(i)}
              cy={yAt(r.pageViews)}
              r={hover === i ? 4.5 : 3}
              fill="#0d6efd"
              opacity={hover == null || hover === i ? 1 : 0.35}
            />
            <rect
              x={xAt(i) - (rows.length > 1 ? (width - pad.left - pad.right) / rows.length / 2 : 12)}
              y={pad.top}
              width={rows.length > 1 ? (width - pad.left - pad.right) / rows.length : 24}
              height={height - pad.top - pad.bottom}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

function BreakdownList({ rows, emptyLabel }) {
  const max = Math.max(1, ...(rows || []).map((r) => r.pageViews || 0))
  if (!rows?.length) {
    return <p className="small text-muted mb-0 py-3 px-3">{emptyLabel}</p>
  }
  return (
    <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto' }}>
      <table className="table table-sm table-hover mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th className="ps-3">Name</th>
            <th className="text-end pe-3" style={{ width: '5.5rem' }}>
              Views
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="small ps-3">
                <div className="text-break" title={row.label}>
                  {row.label}
                </div>
                <div className="progress mt-1" style={{ height: '4px' }} aria-hidden="true">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${Math.round(((row.pageViews || 0) / max) * 100)}%`,
                      backgroundColor: '#0d6efd',
                    }}
                  />
                </div>
              </td>
              <td className="text-end small text-nowrap fw-semibold pe-3">
                {formatNumber(row.pageViews)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PRESETS = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '28d', label: 'Last 28 days', days: 28 },
  { key: '90d', label: 'Last 90 days', days: 90 },
]

const BREAKDOWN_TABS = [
  { key: 'referers', label: 'Referer' },
  { key: 'paths', label: 'Path' },
  { key: 'countries', label: 'Country' },
  { key: 'hosts', label: 'Host' },
  { key: 'browsers', label: 'Browser' },
]

/**
 * Exec-only Cloudflare Web Analytics (page views) with date range + breakdowns.
 */
export default function AnalyticsSection({ sectionId, sectionOrder }) {
  const initial = useMemo(() => defaultRange(), [])
  const [startDate, setStartDate] = useState(initial.startDate)
  const [endDate, setEndDate] = useState(initial.endDate)
  const [activePreset, setActivePreset] = useState('7d')
  const [breakdownTab, setBreakdownTab] = useState('referers')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = useCallback(async (range) => {
    setLoading(true)
    setError('')
    try {
      const json = await fetchWebAnalyticsSummary(range)
      setData(json)
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load({ startDate: initial.startDate, endDate: initial.endDate })
  }, [load, initial.startDate, initial.endDate])

  function applyPreset(preset) {
    const end = daysAgoLocal(1)
    const start = daysAgoLocal(preset.days)
    const next = { startDate: ymdLocal(start), endDate: ymdLocal(end) }
    setStartDate(next.startDate)
    setEndDate(next.endDate)
    setActivePreset(preset.key)
    load(next)
  }

  function applyCustomRange(e) {
    e.preventDefault()
    setActivePreset('custom')
    load({ startDate, endDate })
  }

  const cf = data?.cloudflare
  const totals = cf?.totals
  const series = cf?.series || []
  const breakdownRows = cf?.[breakdownTab] || []
  const breakdownLabel =
    BREAKDOWN_TABS.find((t) => t.key === breakdownTab)?.label || 'Breakdown'

  return (
    <section
      id={sectionId}
      className="mt-5 dashboard-section-anchor"
      style={{ order: sectionOrder }}
    >
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h3 className="mb-0">Analytics</h3>
        <a
          href="https://medium.com/me/stats"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-dark"
        >
          Medium stats <i className="bi bi-box-arrow-up-right ms-1"></i>
        </a>
      </div>

      <p className="text-muted small mb-3">
        Site traffic for the selected range — totals, daily trend, and breakdowns by referer, path,
        country, host, and browser. Medium story stats stay on Medium (use the button above).
      </p>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`btn btn-sm ${activePreset === p.key ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => applyPreset(p)}
                disabled={loading}
              >
                {p.label}
              </button>
            ))}
          </div>
          <form className="row g-2 align-items-end" onSubmit={applyCustomRange}>
            <div className="col-sm-4 col-md-3">
              <label className="form-label small mb-1" htmlFor="analytics-start">
                Start
              </label>
              <input
                id="analytics-start"
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                max={endDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setActivePreset('custom')
                }}
              />
            </div>
            <div className="col-sm-4 col-md-3">
              <label className="form-label small mb-1" htmlFor="analytics-end">
                End
              </label>
              <input
                id="analytics-end"
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                min={startDate}
                max={ymdLocal(daysAgoLocal(1))}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setActivePreset('custom')
                }}
              />
            </div>
            <div className="col-sm-4 col-md-3">
              <button type="submit" className="btn btn-sm btn-dark" disabled={loading}>
                {loading ? 'Loading…' : 'Apply range'}
              </button>
            </div>
          </form>
          {data?.rangeWarning && (
            <p className="small text-warning mb-0 mt-2">{data.rangeWarning}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-1"></i>
          {error}
        </div>
      )}

      {loading && !cf ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-secondary mb-2" role="status">
            <span className="visually-hidden">Loading analytics…</span>
          </div>
          <p className="mb-0 small">Fetching Web Analytics…</p>
        </div>
      ) : !cf?.configured ? (
        <div className="alert alert-secondary">
          {cf?.error || 'Cloudflare Web Analytics is not available yet.'}
        </div>
      ) : cf.error ? (
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-1"></i>
          {cf.error}
        </div>
      ) : (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <div className="border rounded-3 bg-white px-3 py-3 h-100">
                <div className="text-muted small mb-1">Page views</div>
                <div className="fs-3 fw-semibold mb-0">{formatNumber(totals?.pageViews)}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded-3 bg-white px-3 py-3 h-100">
                <div className="text-muted small mb-1">Visits</div>
                <div className="fs-3 fw-semibold mb-0">{formatNumber(totals?.visits)}</div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-0 h6">Daily traffic</h5>
            </div>
            <div className="card-body">
              <PageViewsChart series={series} />
            </div>
          </div>

          <div className="card shadow-sm mb-2">
            <div className="card-header bg-white d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h5 className="mb-0 h6">Breakdown</h5>
              <ul className="nav nav-pills gap-1 mb-0">
                {BREAKDOWN_TABS.map((tab) => (
                  <li className="nav-item" key={tab.key}>
                    <button
                      type="button"
                      className={`nav-link py-1 px-2 small ${
                        breakdownTab === tab.key ? 'active' : ''
                      }`}
                      onClick={() => setBreakdownTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-body p-0">
              <BreakdownList
                rows={breakdownRows}
                emptyLabel={`No ${breakdownLabel.toLowerCase()} data for this range.`}
              />
            </div>
          </div>

          <p className="small text-muted mt-3 mb-0">
            Source: Cloudflare Web Analytics
            {cf.range ? ` · ${cf.range.start} → ${cf.range.end}` : ''}.
            {data?.fetchedAt ? ` Last fetched ${new Date(data.fetchedAt).toLocaleString()}.` : ''}
          </p>
        </>
      )}
    </section>
  )
}

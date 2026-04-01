import React, { useMemo, useState } from 'react'
import './LeaveExtensionCalendar.css'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ymdFromValue(val) {
  if (!val) return null
  const m = String(val).match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function formatYmd(d) {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function parseYmdToLocalDate(ymd) {
  const parts = String(ymd).split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  const [y, m, d] = parts
  return new Date(y, m - 1, d)
}

function eachYmdInRange(startYmd, endYmd) {
  const a = startYmd && endYmd ? (startYmd <= endYmd ? startYmd : endYmd) : (startYmd || endYmd)
  const b = startYmd && endYmd ? (startYmd <= endYmd ? endYmd : startYmd) : (endYmd || startYmd)
  if (!a) return []
  const start = parseYmdToLocalDate(a)
  const end = parseYmdToLocalDate(b || a)
  if (!start || !end) return []
  const out = []
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    out.push(formatYmd(new Date(cur)))
  }
  return out
}

function calendarDatesForRequest(req) {
  if (req.type === 'leave') {
    const s = ymdFromValue(req.leave_start)
    const e = ymdFromValue(req.leave_end)
    if (s && e) return eachYmdInRange(s, e)
    if (s) return [s]
    if (e) return [e]
    const c = ymdFromValue(req.created_at)
    return c ? [c] : []
  }
  const by = ymdFromValue(req.requested_by_date)
  if (by) return [by]
  const c = ymdFromValue(req.created_at)
  return c ? [c] : []
}

function statusChipClass(status) {
  if (status === 'approved') return 'lec-bar--approved'
  if (status === 'declined') return 'lec-bar--declined'
  return 'lec-bar--pending'
}

function briefLabel(req, isExecDisplay) {
  const typeShort = req.type === 'leave' ? 'Leave' : 'Ext'
  const who =
    isExecDisplay && req.member
      ? [req.member.first_name, req.member.last_name ? `${String(req.member.last_name).charAt(0)}.` : null]
          .filter(Boolean)
          .join(' ')
          .trim()
      : ''
  const reason = (req.reason || '').replace(/\s+/g, ' ').trim()
  const snippet = reason.length > 36 ? `${reason.slice(0, 34)}…` : reason
  if (who && snippet) return `${typeShort} · ${who} — ${snippet}`
  if (who) return `${typeShort} · ${who}`
  if (snippet) return `${typeShort} — ${snippet}`
  return typeShort
}

/** Greedy lane assignment for overlapping segments in one week row. */
function assignLanes(segments) {
  if (!segments.length) return { segments: [], laneCount: 1 }
  const sorted = [...segments].sort((a, b) => {
    const da = (a.req.created_at || '').localeCompare(b.req.created_at || '')
    return a.colStart - b.colStart || b.span - a.span || da || (a.req.request_id || 0) - (b.req.request_id || 0)
  })
  const occupied = []
  const out = []
  for (const seg of sorted) {
    let lane = 0
    while (true) {
      const L = occupied[lane] || []
      const clash = L.some((o) => !(seg.colEnd < o.colStart || seg.colStart > o.colEnd))
      if (!clash) {
        if (!occupied[lane]) occupied[lane] = []
        occupied[lane].push({ colStart: seg.colStart, colEnd: seg.colEnd })
        out.push({ ...seg, lane })
        break
      }
      lane++
    }
  }
  const laneCount = Math.max(1, out.reduce((m, s) => Math.max(m, s.lane + 1), 0))
  return { segments: out, laneCount }
}

function buildSegmentsForWeek(weekIdx, cells, requests) {
  const weekStart = weekIdx * 7
  const segments = []
  for (const req of requests || []) {
    const dateSet = new Set(calendarDatesForRequest(req))
    const cols = []
    for (let c = 0; c < 7; c++) {
      const ymd = cells[weekStart + c]?.ymd
      if (ymd && dateSet.has(ymd)) cols.push(c)
    }
    if (!cols.length) continue
    cols.sort((a, b) => a - b)
    let k = 0
    while (k < cols.length) {
      const s = cols[k]
      let p = cols[k]
      k++
      while (k < cols.length && cols[k] === p + 1) {
        p = cols[k]
        k++
      }
      segments.push({
        req,
        colStart: s,
        colEnd: p,
        span: p - s + 1,
        weekIdx,
      })
    }
  }
  return assignLanes(segments)
}

/**
 * @param {object} props
 * @param {Array} props.requests — filtered leave/extension rows (same as table)
 * @param {boolean} props.isExecDisplay — show member name on chips
 * @param {(req: object) => void} props.onSelectRequest — open detail modal
 */
function LeaveExtensionCalendar({ requests, isExecDisplay, onSelectRequest }) {
  const today = useMemo(() => formatYmd(new Date()), [])
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })

  const { monthLabel, weekBundles } = useMemo(() => {
    const year = cursor.y
    const month = cursor.m
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startPad = first.getDay()
    const daysInMonth = last.getDate()
    const monthLabelInner = first.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const cellsInner = []
    const prevLast = new Date(year, month - 1, 0).getDate()
    for (let i = 0; i < startPad; i++) {
      const d = prevLast - startPad + i + 1
      const dt = new Date(year, month - 1, d)
      cellsInner.push({ ymd: formatYmd(dt), day: d, muted: true })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d)
      cellsInner.push({ ymd: formatYmd(dt), day: d, muted: false })
    }
    const tail = (7 - (cellsInner.length % 7)) % 7
    for (let i = 1; i <= tail; i++) {
      const dt = new Date(year, month + 1, i)
      cellsInner.push({ ymd: formatYmd(dt), day: i, muted: true })
    }

    const weekCount = cellsInner.length / 7
    const weekBundlesInner = []
    for (let w = 0; w < weekCount; w++) {
      const weekCells = cellsInner.slice(w * 7, w * 7 + 7)
      const { segments, laneCount } = buildSegmentsForWeek(w, cellsInner, requests)
      weekBundlesInner.push({ weekCells, segments, laneCount })
    }

    return { monthLabel: monthLabelInner, weekBundles: weekBundlesInner }
  }, [cursor, requests])

  const goPrev = () => {
    setCursor((c) => {
      const nm = c.m - 1
      if (nm < 0) return { y: c.y - 1, m: 11 }
      return { y: c.y, m: nm }
    })
  }

  const goNext = () => {
    setCursor((c) => {
      const nm = c.m + 1
      if (nm > 11) return { y: c.y + 1, m: 0 }
      return { y: c.y, m: nm }
    })
  }

  const goToday = () => {
    const n = new Date()
    setCursor({ y: n.getFullYear(), m: n.getMonth() })
  }

  return (
    <div className="lec-wrap">
      <div className="lec-toolbar">
        <h4>{monthLabel}</h4>
        <div className="lec-nav">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goPrev} aria-label="Previous month">
            <i className="bi bi-chevron-left"></i>
          </button>
          <button type="button" className="btn btn-sm btn-outline-dark" onClick={goToday}>
            Today
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goNext} aria-label="Next month">
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
      <div className="lec-legend">
        <span>
          <span className="lec-dot lec-dot--pending" aria-hidden />
          Pending
        </span>
        <span>
          <span className="lec-dot lec-dot--approved" aria-hidden />
          Approved
        </span>
        <span>
          <span className="lec-dot lec-dot--declined" aria-hidden />
          Declined
        </span>
      </div>
      <div className="lec-calendar" role="grid" aria-label="Leave and extension calendar">
        <div className="lec-dow-row" role="row">
          {DOW.map((d) => (
            <div key={d} className="lec-dow" role="columnheader">
              {d}
            </div>
          ))}
        </div>
        {weekBundles.map(({ weekCells, segments, laneCount }, wi) => (
          <div key={wi} className="lec-week" role="row">
            <div className="lec-week-days">
              {weekCells.map((cell) => {
                const isToday = cell.ymd === today
                return (
                  <div
                    key={cell.ymd}
                    className={`lec-day-cell${cell.muted ? ' lec-day-cell--muted' : ''}${isToday ? ' lec-day-cell--today' : ''}`}
                    role="gridcell"
                  >
                    <span className="lec-daynum">{cell.day}</span>
                  </div>
                )
              })}
            </div>
            <div
              className="lec-week-track"
              style={{
                gridTemplateRows: `repeat(${laneCount}, var(--lec-lane-height, 22px))`,
              }}
            >
              {segments.map((seg, si) => (
                <button
                  key={`${wi}-${seg.req.request_id}-${seg.colStart}-${seg.lane}-${si}`}
                  type="button"
                  className={`lec-bar ${statusChipClass(seg.req.status)}`}
                  style={{
                    gridColumn: `${seg.colStart + 1} / span ${seg.span}`,
                    gridRow: seg.lane + 1,
                  }}
                  title={briefLabel(seg.req, isExecDisplay)}
                  onClick={() => onSelectRequest(seg.req)}
                >
                  <span className="lec-bar-label">{briefLabel(seg.req, isExecDisplay)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeaveExtensionCalendar

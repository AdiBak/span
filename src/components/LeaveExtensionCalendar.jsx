import React, { useMemo, useState } from 'react'
import './LeaveExtensionCalendar.css'
import {
  itemsFromBirthdays,
  itemsFromCalendarEvents,
  itemsFromRequests,
  mergeCalendarItems,
} from '../lib/leaveCalendarItems'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatYmd(d) {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function colorClass(colorKey) {
  if (colorKey === 'approved') return 'lec-bar--approved'
  if (colorKey === 'declined') return 'lec-bar--declined'
  if (colorKey === 'birthday') return 'lec-bar--birthday'
  if (colorKey === 'span_event') return 'lec-bar--span-event'
  if (colorKey === 'deadline') return 'lec-bar--deadline'
  return 'lec-bar--pending'
}

/** Greedy lane assignment for overlapping segments in one week row. */
function assignLanes(segments) {
  if (!segments.length) return { segments: [], laneCount: 1 }
  const sorted = [...segments].sort((a, b) => {
    const da = String(a.item.id || '').localeCompare(String(b.item.id || ''))
    return a.colStart - b.colStart || b.span - a.span || da
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

function buildSegmentsForWeek(weekIdx, cells, items) {
  const weekStart = weekIdx * 7
  const segments = []
  for (const item of items || []) {
    const dateSet = item.dateSet || new Set()
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
        item,
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
 * @param {Array} props.requests — filtered leave/extension rows
 * @param {Array} [props.birthdayRows] — active members with dob
 * @param {Array} [props.calendarEvents] — dashboard_calendar_events rows
 * @param {Record<string,string>} [props.teamNameById]
 * @param {boolean} props.isExecDisplay
 * @param {(item: object) => void} props.onSelectItem
 */
function LeaveExtensionCalendar({
  requests,
  birthdayRows = [],
  calendarEvents = [],
  teamNameById = {},
  isExecDisplay,
  onSelectItem,
}) {
  const today = useMemo(() => formatYmd(new Date()), [])
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { y: n.getFullYear(), m: n.getMonth() }
  })

  const items = useMemo(
    () =>
      mergeCalendarItems(
        itemsFromRequests(requests, isExecDisplay),
        itemsFromBirthdays(birthdayRows, cursor),
        itemsFromCalendarEvents(calendarEvents, teamNameById)
      ),
    [requests, birthdayRows, calendarEvents, teamNameById, isExecDisplay, cursor]
  )

  const { monthLabel, weekBundles, hasBars } = useMemo(() => {
    const year = cursor.y
    const month = cursor.m
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const startPad = first.getDay()
    const daysInMonth = last.getDate()
    const monthLabelInner = first.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const cellsInner = []
    const prevLast = new Date(year, month, 0).getDate()
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
    let anyBars = false
    for (let w = 0; w < weekCount; w++) {
      const weekCells = cellsInner.slice(w * 7, w * 7 + 7)
      const { segments, laneCount } = buildSegmentsForWeek(w, cellsInner, items)
      if (segments.length) anyBars = true
      weekBundlesInner.push({ weekCells, segments, laneCount })
    }

    return { monthLabel: monthLabelInner, weekBundles: weekBundlesInner, hasBars: anyBars }
  }, [cursor, items])

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
        <span>
          <span className="lec-dot lec-dot--birthday" aria-hidden />
          Birthday
        </span>
        <span>
          <span className="lec-dot lec-dot--span-event" aria-hidden />
          SPAN event
        </span>
        <span>
          <span className="lec-dot lec-dot--deadline" aria-hidden />
          Deadline
        </span>
      </div>
      <div className="lec-calendar" role="grid" aria-label="Leave, birthdays, and SPAN calendar">
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
                  key={`${wi}-${seg.item.id}-${seg.colStart}-${seg.lane}-${si}`}
                  type="button"
                  className={`lec-bar ${colorClass(seg.item.colorKey)}`}
                  style={{
                    gridColumn: `${seg.colStart + 1} / span ${seg.span}`,
                    gridRow: seg.lane + 1,
                  }}
                  title={seg.item.label}
                  onClick={() => onSelectItem?.(seg.item)}
                >
                  <span className="lec-bar-label">{seg.item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!hasBars && (
        <p className="text-muted small text-center py-3 mb-0">
          No leave requests, birthdays, or events in this month view.
        </p>
      )}
    </div>
  )
}

export default LeaveExtensionCalendar

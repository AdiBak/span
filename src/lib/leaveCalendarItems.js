/** Normalize leave requests, birthdays, and dashboard_calendar_events into calendar items. */

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
  const a = startYmd && endYmd ? (startYmd <= endYmd ? startYmd : endYmd) : startYmd || endYmd
  const b = startYmd && endYmd ? (startYmd <= endYmd ? endYmd : startYmd) : endYmd || startYmd
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

export function calendarDatesForRequest(req) {
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

function requestColorKey(status) {
  if (status === 'approved') return 'approved'
  if (status === 'declined') return 'declined'
  return 'pending'
}

function briefRequestLabel(req, isExecDisplay) {
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

export function itemsFromRequests(requests, isExecDisplay) {
  return (requests || []).map((req) => {
    const dates = calendarDatesForRequest(req)
    const startYmd = dates[0] || null
    const endYmd = dates.length ? dates[dates.length - 1] : null
    return {
      id: `req-${req.request_id}`,
      kind: req.type === 'leave' ? 'leave' : 'extension',
      startYmd,
      endYmd,
      dateSet: new Set(dates),
      label: briefRequestLabel(req, isExecDisplay),
      colorKey: requestColorKey(req.status),
      source: req,
    }
  })
}

/**
 * Place each birthday on the years covered by the visible month grid (including muted pad days).
 * @param {Array<{member_id, first_name, last_name, dob}>} birthdayRows
 * @param {{ y: number, m: number }} cursor — calendar month (0-indexed)
 */
export function itemsFromBirthdays(birthdayRows, cursor) {
  const year = cursor?.y
  const month = cursor?.m
  if (year == null || month == null) return []

  // Years that appear in the padded month grid: prev month / this / next
  const years = new Set([year])
  if (month === 0) years.add(year - 1)
  if (month === 11) years.add(year + 1)

  const out = []
  for (const row of birthdayRows || []) {
    const dob = ymdFromValue(row.dob)
    if (!dob) continue
    const mmdd = dob.slice(5) // MM-DD
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Member'
    for (const y of years) {
      const startYmd = `${y}-${mmdd}`
      // Skip invalid dates (e.g. Feb 29 in non-leap years) by validating parse
      const d = parseYmdToLocalDate(startYmd)
      if (!d || formatYmd(d) !== startYmd) continue
      out.push({
        id: `bday-${row.member_id}-${y}`,
        kind: 'birthday',
        startYmd,
        endYmd: startYmd,
        dateSet: new Set([startYmd]),
        label: `Bday · ${name}`,
        colorKey: 'birthday',
        source: { ...row, birthdayYmd: startYmd },
      })
    }
  }
  return out
}

export function itemsFromCalendarEvents(events, teamNameById = {}) {
  return (events || []).map((ev) => {
    const startYmd = ymdFromValue(ev.start_date)
    const endYmd = ymdFromValue(ev.end_date) || startYmd
    const dates = startYmd ? eachYmdInRange(startYmd, endYmd) : []
    const teamName = ev.team_id ? teamNameById[String(ev.team_id)] || '' : ''
    const isDeadline = ev.kind === 'deadline'
    const label = isDeadline
      ? teamName
        ? `Due · ${ev.title} (${teamName})`
        : `Due · ${ev.title}`
      : `SPAN · ${ev.title}`
    return {
      id: `ev-${ev.event_id}`,
      kind: isDeadline ? 'deadline' : 'span_event',
      startYmd,
      endYmd,
      dateSet: new Set(dates),
      label,
      colorKey: isDeadline ? 'deadline' : 'span_event',
      source: ev,
    }
  })
}

export function mergeCalendarItems(...lists) {
  return lists.flat().filter((it) => it?.dateSet?.size)
}

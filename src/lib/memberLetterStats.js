/**
 * Aggregate stats for honorable letters (approved volunteer hours + bills touched).
 */

function approvedVolunteerHoursDecimal(entries) {
  let sum = 0
  for (const e of entries || []) {
    if (e.approved !== 'approved') continue
    const start = e.start_timestamp ? new Date(e.start_timestamp).getTime() : NaN
    const end = e.end_timestamp ? new Date(e.end_timestamp).getTime() : NaN
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      sum += (end - start) / 3600000
    }
  }
  return sum
}

export function formatHoursDisplay(decimalHours) {
  if (!decimalHours || decimalHours <= 0) return '0'
  const h = Math.floor(decimalHours)
  const m = Math.round((decimalHours - h) * 60)
  if (h <= 0) return `${m} minutes`
  if (m === 0) return h === 1 ? '1 hour' : `${h} hours`
  return `${h} hour${h === 1 ? '' : 's'} and ${m} minutes`
}

export async function fetchLetterStats(supabase, memberId) {
  const [{ data: volRows, error: vErr }, { data: billRows, error: bErr }, assignRes] = await Promise.all([
    supabase
      .from('volunteers')
      .select('start_timestamp,end_timestamp,approved')
      .eq('member_id', memberId),
    supabase
      .from('bills')
      .select('bill_id')
      .eq('submitted_by', memberId)
      .in('status', ['approved', 'modified']),
    supabase.from('bill_assignment_assignees').select('assignment_id').eq('member_id', memberId),
  ])

  if (vErr) console.warn('letter stats volunteers', vErr)
  if (bErr) console.warn('letter stats bills', bErr)

  const volHours = approvedVolunteerHoursDecimal(volRows || [])
  const submittedBillIds = new Set((billRows || []).map((r) => r.bill_id).filter(Boolean))

  const assignmentIds = [...new Set((assignRes.data || []).map((r) => r.assignment_id).filter(Boolean))]
  if (assignmentIds.length > 0) {
    const { data: baRows } = await supabase
      .from('bill_assignments')
      .select('resulting_bill_id')
      .in('assignment_id', assignmentIds)
      .not('resulting_bill_id', 'is', null)
    for (const r of baRows || []) {
      if (r.resulting_bill_id != null) submittedBillIds.add(r.resulting_bill_id)
    }
  }

  return {
    volunteerHoursDecimal: volHours,
    volunteerHoursDisplay: formatHoursDisplay(volHours),
    billsImpactedCount: submittedBillIds.size,
  }
}

/** Full volunteer rows (approved only) — for PDF attachment matching verification letter. */
export async function fetchApprovedVolunteerEntries(supabase, memberId) {
  const { data, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('member_id', memberId)
    .eq('approved', 'approved')
    .order('start_timestamp', { ascending: false })

  if (error) {
    console.warn('fetchApprovedVolunteerEntries', error)
    return []
  }
  return data || []
}

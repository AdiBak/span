import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { fetchLegiscanSponsorsForSpanBill, legiscanSponsorStorageKey } from '../lib/legiscan'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
]

/**
 * Exec Bill Management → Outreach: sync sponsors from LegiScan, track status per legislator.
 * @param {{ bills: object[], member: object | null }} props
 */
export default function BillOutreachPanel({ bills, member }) {
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [targets, setTargets] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

  const sortedBills = useMemo(() => {
    return [...(bills || [])].sort((a, b) => {
      const sa = (a.state || '').localeCompare(b.state || '')
      if (sa !== 0) return sa
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [bills])

  useEffect(() => {
    if (!sortedBills.length) {
      setSelectedBillId(null)
      return
    }
    setSelectedBillId((prev) => {
      if (prev != null && sortedBills.some((b) => b.bill_id === prev)) return prev
      return sortedBills[0].bill_id
    })
  }, [sortedBills])

  const loadTargets = useCallback(async () => {
    if (selectedBillId == null) return
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('bill_outreach_targets')
        .select('*')
        .eq('bill_id', selectedBillId)
        .order('display_name', { ascending: true })
      if (error) throw error
      setTargets(data || [])
    } catch (e) {
      setLoadError(e.message || 'Failed to load outreach targets.')
      setTargets([])
    } finally {
      setLoading(false)
    }
  }, [selectedBillId])

  useEffect(() => {
    loadTargets()
  }, [loadTargets])

  const selectedBill = sortedBills.find((b) => b.bill_id === selectedBillId) || null

  const handleRefreshLegiscan = async () => {
    if (!selectedBill) return
    setRefreshing(true)
    setRefreshMessage('')
    setLoadError('')
    try {
      const res = await fetchLegiscanSponsorsForSpanBill(selectedBill)
      if (!res.ok) {
        setLoadError(res.message || 'LegiScan request failed.')
        return
      }
      const sponsors = res.sponsors || []
      const meta = res.meta || null
      if (!sponsors.length) {
        setRefreshMessage('LegiScan returned no sponsors for this bill.')
        return
      }

      const existingRes = await supabase
        .from('bill_outreach_targets')
        .select('sponsor_key,status,notes,contact_phone,contact_webmail_url')
        .eq('bill_id', selectedBill.bill_id)

      if (existingRes.error) throw existingRes.error

      const existingByKey = new Map(
        (existingRes.data || []).map((r) => [r.sponsor_key, r])
      )

      const seen = new Set()
      const rows = []
      for (const s of sponsors) {
        const sponsorKey = legiscanSponsorStorageKey(s)
        if (!sponsorKey || seen.has(sponsorKey)) continue
        seen.add(sponsorKey)

        const phone = (s.phone || '').trim() || null
        const webmailUrl = (s.webmailUrl || '').trim() || null

        const existing = existingByKey.get(sponsorKey)

        // Preserve manual edits: only fill contact fields if existing is empty.
        const nextContactPhone =
          existing?.contact_phone != null && String(existing.contact_phone).trim()
            ? existing.contact_phone
            : phone
        const nextContactWebmailUrl =
          existing?.contact_webmail_url != null && String(existing.contact_webmail_url).trim()
            ? existing.contact_webmail_url
            : webmailUrl

        rows.push({
          bill_id: selectedBill.bill_id,
          sponsor_key: sponsorKey,
          display_name: s.name,
          party: s.party || null,
          sponsor_role: s.role || null,
          contact_phone: nextContactPhone,
          contact_webmail_url: nextContactWebmailUrl,
          status: existing?.status || 'pending',
          notes: existing?.notes || null,
          updated_by_member_id: member?.member_id || null,
        })
      }
      if (!rows.length) {
        setRefreshMessage('No sponsor names parsed from LegiScan.')
        return
      }
      const { error } = await supabase.from('bill_outreach_targets').upsert(rows, {
        onConflict: 'bill_id,sponsor_key',
      })
      if (error) throw error

      const filledCount = rows.filter(
        (r) =>
          (r.contact_phone && String(r.contact_phone).trim()) ||
          (r.contact_webmail_url && String(r.contact_webmail_url).trim())
      ).length

      if (meta && meta.personLookupAttempted > 0) {
        setRefreshMessage(
          `Synced ${rows.length} sponsor(s). Contact lookup populated for ${meta.personLookupPopulated} / ${meta.personLookupAttempted} person(s) (failed: ${meta.personLookupFailed}). Auto-filled contact for ${filledCount} row(s).`
        )
      } else if (meta && meta.peopleIdCount === 0) {
        setRefreshMessage(
          `Synced ${rows.length} sponsor(s). LegiScan bill sponsors did not include a people_id, so contact auto-fill is not possible for this bill.`
        )
      } else {
        setRefreshMessage(
          `Synced ${rows.length} sponsor(s) from LegiScan. Auto-filled contact for ${filledCount} row(s).`
        )
      }
      await loadTargets()
    } catch (e) {
      setLoadError(e.message || 'Failed to sync sponsors.')
    } finally {
      setRefreshing(false)
    }
  }

  const patchTarget = async (targetId, payload) => {
    const body = {
      ...payload,
      updated_by_member_id: member?.member_id || null,
    }
    const { error } = await supabase.from('bill_outreach_targets').update(body).eq('target_id', targetId)
    if (error) {
      setLoadError(error.message)
      return
    }
    setTargets((prev) => prev.map((t) => (t.target_id === targetId ? { ...t, ...body } : t)))
  }

  if (!sortedBills.length) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-muted">
          <p className="mb-0">
            No approved bills with a LegiScan link. Add a LegiScan URL on an approved bill to track sponsor
            outreach here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <p className="text-muted small mb-3">
          Pull sponsors from LegiScan, then use the <strong>Webmail</strong> link and <strong>phone</strong> to
          contact each legislator. Refresh keeps your status and notes.
          Refresh adds new sponsors without changing existing rows&apos; status or notes.
        </p>

        <div className="row g-2 align-items-end flex-wrap mb-3">
          <div className="col-auto flex-grow-1" style={{ minWidth: '220px' }}>
            <label className="form-label small text-muted mb-1" htmlFor="outreach-bill-select">
              Bill
            </label>
            <select
              id="outreach-bill-select"
              className="form-select form-select-sm"
              value={selectedBillId ?? ''}
              onChange={(e) => setSelectedBillId(Number(e.target.value))}
            >
              {sortedBills.map((b) => (
                <option key={b.bill_id} value={b.bill_id}>
                  {(b.state || '?') + ' ' + (b.name || '')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-auto">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!selectedBill || refreshing}
              onClick={handleRefreshLegiscan}
            >
              {refreshing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Refreshing…
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />
                  Refresh from LegiScan
                </>
              )}
            </button>
          </div>
        </div>

        {selectedBill?.legiscan_link && (
          <p className="small mb-3">
            <a href={selectedBill.legiscan_link} target="_blank" rel="noopener noreferrer">
              Open LegiScan page
            </a>
          </p>
        )}

        {loadError && (
          <div className="alert alert-danger py-2 small" role="alert">
            {loadError}
          </div>
        )}
        {refreshMessage && !loadError && (
          <div className="alert alert-info py-2 small" role="status">
            {refreshMessage}
          </div>
        )}

        {loading ? (
          <div className="text-muted small py-4 text-center">
            <span className="spinner-border spinner-border-sm me-2" role="status" />
            Loading targets…
          </div>
        ) : targets.length === 0 ? (
          <p className="text-muted small mb-0">
            No outreach rows yet. Use <strong>Refresh from LegiScan</strong> to import sponsors.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Party</th>
                  <th scope="col">Role</th>
                  <th scope="col">Webmail</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.target_id}>
                    <td>{t.display_name}</td>
                    <td className="text-muted small">{t.party || '—'}</td>
                    <td className="text-muted small">{t.sponsor_role || '—'}</td>
                    <td style={{ minWidth: '160px' }}>
                      {(t.contact_webmail_url || '').trim() ? (
                        <a
                          href={t.contact_webmail_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="small"
                        >
                          Webmail
                        </a>
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td style={{ minWidth: '140px' }}>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        placeholder="Phone"
                        aria-label={`Phone for ${t.display_name}`}
                        defaultValue={t.contact_phone || ''}
                        key={`${t.target_id}-ph-${t.contact_phone ?? ''}`}
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          const prev = (t.contact_phone || '').trim()
                          if (next === prev) return
                          patchTarget(t.target_id, { contact_phone: next || null })
                        }}
                      />
                    </td>
                    <td style={{ minWidth: '140px' }}>
                      <select
                        className="form-select form-select-sm"
                        aria-label={`Status for ${t.display_name}`}
                        value={t.status}
                        onChange={(e) => patchTarget(t.target_id, { status: e.target.value })}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ minWidth: '200px' }}>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        defaultValue={t.notes || ''}
                        placeholder="Notes…"
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          const prev = (t.notes || '').trim()
                          if (next === prev) return
                          patchTarget(t.target_id, { notes: next || null })
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

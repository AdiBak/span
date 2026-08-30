import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { chamberTitleFromSponsorRole, legislatorContactSearchUrl } from '../lib/outreachEmail'
import {
  fetchLegiscanBillBySearch,
  fetchLegiscanPersonContactByName,
  fetchLegiscanSponsorsForSpanBill,
  isLegiscanBillNumberShape,
  legiscanSponsorStorageKey,
} from '../lib/legiscan'
import {
  billStateToOpenStatesJurisdiction,
  enrichCommitteeMembersWithPeopleDetails,
  extractCommitteeDetailRecord,
  extractCommitteesList,
  invokeOpenStatesProxy,
  membershipsFromCommittee,
  openStatesChamberLabel,
  outreachNameMatchKeys,
} from '../lib/openStates'
import {
  US_STATE_CODE_TO_NAME,
  canonicalUSStateName,
  usStateAbbreviation,
} from '../lib/usStateCanonical'

const OutreachContactModal = lazy(() => import('./OutreachContactModal'))

const OUTREACH_SOURCE_STATE_OPTIONS = Object.entries(US_STATE_CODE_TO_NAME)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name))

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Not contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
]

function isLegiscanTarget(t) {
  return !t.target_source || t.target_source === 'legiscan'
}

function isProspectTarget(t) {
  return t.target_source === 'openstates_committee' || t.target_source === 'openstates_bill'
}

/** First trimmed non-empty string, else null. */
function firstNonEmptyContact(...vals) {
  for (const v of vals) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return null
}

function OutreachTargetsTable({
  targets,
  patchTarget,
  onOpenContact,
  showProspectDelete,
  onDeleteProspect,
  billState,
}) {
  if (!targets.length) return null
  return (
    <div
      className="table-responsive border rounded"
      style={{ maxHeight: 'min(420px, 55vh)', overflow: 'auto' }}
    >
      <table className="table table-sm table-hover align-middle mb-0">
        <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Party</th>
            <th scope="col">Role</th>
            <th scope="col">Email / Webmail</th>
            <th scope="col">Phone</th>
            <th scope="col">Contact</th>
            {showProspectDelete && <th scope="col" className="text-nowrap"> </th>}
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
              <td style={{ minWidth: '180px' }}>
                {(t.contact_email || '').trim() ? (
                  <a href={`mailto:${t.contact_email}`} className="small">
                    {t.contact_email}
                  </a>
                ) : (t.contact_webmail_url || '').trim() ? (
                  <a
                    href={t.contact_webmail_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="small"
                  >
                    Webmail
                  </a>
                ) : billState ? (
                  <a
                    href={legislatorContactSearchUrl(t.display_name, billState)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="small"
                  >
                    Search for contact
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
              <td>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary text-nowrap"
                  onClick={() => onOpenContact(t)}
                >
                  Compose
                </button>
              </td>
              {showProspectDelete && (
                <td>
                  {isProspectTarget(t) && typeof onDeleteProspect === 'function' ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title="Remove this prospect row"
                      aria-label={`Remove prospect ${t.display_name}`}
                      onClick={() => onDeleteProspect(t)}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
              )}
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
  )
}

/**
 * Exec Bill Management → Outreach: LegiScan sponsors + Open States committee prospects.
 * @param {{ bills: object[], member: object | null }} props
 */
export default function BillOutreachPanel({ bills, member, onBillsChanged }) {
  const [selectedBillId, setSelectedBillId] = useState(null)
  const [targets, setTargets] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

  const [sourceState, setSourceState] = useState('United States')
  const [sourceBillNumber, setSourceBillNumber] = useState('')
  const [sourcePosition, setSourcePosition] = useState('Support')
  const [sourcing, setSourcing] = useState(false)
  const [sourceMessage, setSourceMessage] = useState('')
  const [sourceError, setSourceError] = useState('')
  const [pendingSelectBillId, setPendingSelectBillId] = useState(null)

  const [osModalOpen, setOsModalOpen] = useState(false)
  const [osChamber, setOsChamber] = useState('')
  const [osCommittees, setOsCommittees] = useState([])
  const [osPage, setOsPage] = useState(1)
  const [osCanLoadMore, setOsCanLoadMore] = useState(false)
  const [osListLoading, setOsListLoading] = useState(false)
  const [osListError, setOsListError] = useState('')
  const [osSearch, setOsSearch] = useState('')
  const [osPicks, setOsPicks] = useState([])
  const [osMembers, setOsMembers] = useState([])
  const [osMemberChamber, setOsMemberChamber] = useState('')
  /** Committee ids currently loading memberships. */
  const [osLoadingIds, setOsLoadingIds] = useState(() => new Set())
  const [osDetailError, setOsDetailError] = useState('')
  const [osImporting, setOsImporting] = useState(false)
  const [prospectLegiscanMatching, setProspectLegiscanMatching] = useState(false)
  const [contactTarget, setContactTarget] = useState(null)

  const sortedBills = useMemo(() => {
    return [...(bills || [])].sort((a, b) => {
      const sa = usStateAbbreviation(a.state || '').localeCompare(usStateAbbreviation(b.state || ''))
      if (sa !== 0) return sa
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [bills])

  useEffect(() => {
    if (!sortedBills.length) {
      setSelectedBillId(null)
      return
    }
    if (
      pendingSelectBillId != null &&
      sortedBills.some((b) => b.bill_id === pendingSelectBillId)
    ) {
      setSelectedBillId(pendingSelectBillId)
      setPendingSelectBillId(null)
      return
    }
    setSelectedBillId((prev) => {
      if (prev != null && sortedBills.some((b) => b.bill_id === prev)) return prev
      return sortedBills[0].bill_id
    })
  }, [sortedBills, pendingSelectBillId])

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
  const canLegiscanRefresh = Boolean(selectedBill && String(selectedBill.legiscan_link || '').trim())
  const openStatesJurisdiction = selectedBill ? billStateToOpenStatesJurisdiction(selectedBill.state) : null

  const legiscanTargets = useMemo(() => targets.filter(isLegiscanTarget), [targets])
  const prospectTargets = useMemo(() => targets.filter(isProspectTarget), [targets])

  const filteredOsCommittees = useMemo(() => {
    const q = osSearch.trim().toLowerCase()
    if (!q) return osCommittees
    return osCommittees.filter((c) => {
      const name = String(c.name || '').toLowerCase()
      return name.includes(q)
    })
  }, [osCommittees, osSearch])

  const filteredOsMembers = useMemo(() => {
    if (!osMemberChamber) return osMembers
    return osMembers.filter((m) => m.chamber === osMemberChamber)
  }, [osMembers, osMemberChamber])

  const uniqueFilteredMemberCount = useMemo(() => {
    const seen = new Set()
    for (const m of filteredOsMembers) {
      if (m.sponsorKey) seen.add(m.sponsorKey)
    }
    return seen.size
  }, [filteredOsMembers])

  const osPickIds = useMemo(() => new Set(osPicks.map((p) => p.id)), [osPicks])
  const osDetailLoading = osLoadingIds.size > 0

  const resetOsWizard = useCallback(() => {
    setOsChamber('')
    setOsCommittees([])
    setOsPage(1)
    setOsCanLoadMore(false)
    setOsListError('')
    setOsSearch('')
    setOsPicks([])
    setOsMembers([])
    setOsMemberChamber('')
    setOsLoadingIds(new Set())
    setOsDetailError('')
  }, [])

  const openOsModal = () => {
    resetOsWizard()
    setOsModalOpen(true)
  }

  const closeOsModal = () => {
    setOsModalOpen(false)
    resetOsWizard()
  }

  const loadCommitteesPage = async (pageNum, append) => {
    if (!openStatesJurisdiction) return
    setOsListLoading(true)
    setOsListError('')
    try {
      const res = await invokeOpenStatesProxy({
        op: 'committees_list',
        jurisdiction: openStatesJurisdiction,
        page: pageNum,
        per_page: 20,
        chamber: osChamber || undefined,
      })
      if (!res.ok) {
        setOsListError(res.error || 'Failed to load committees.')
        return
      }
      const perPage = 20
      const { results, pagination } = extractCommitteesList(res.data)
      const p = pagination && typeof pagination === 'object' ? pagination : {}
      const maxPage = Number(p.max_page)
      if (Number.isFinite(maxPage) && maxPage >= 1) {
        setOsCanLoadMore(pageNum < maxPage)
      } else {
        setOsCanLoadMore(results.length >= perPage)
      }
      setOsPage(pageNum)
      setOsCommittees((prev) => {
        const next = append ? [...prev, ...results] : [...results]
        const byId = new Map()
        for (const c of next) {
          if (c && c.id) byId.set(c.id, c)
        }
        return [...byId.values()]
      })
    } catch (e) {
      setOsListError(e.message || 'Failed to load committees.')
    } finally {
      setOsListLoading(false)
    }
  }

  const loadMoreCommittees = () => {
    if (!osCanLoadMore) return
    loadCommitteesPage(osPage + 1, true)
  }

  const fetchCommitteeMembers = async (c) => {
    const res = await invokeOpenStatesProxy({
      op: 'committee_detail',
      committee_id: c.id,
    })
    if (!res.ok) {
      throw new Error(res.error || 'Failed to load committee.')
    }
    const detail = extractCommitteeDetailRecord(res.data)
    let members = membershipsFromCommittee(detail, c.id).map((m) => ({
      ...m,
      committeeId: String(c.id),
      committeeName: c.name || c.id,
    }))
    const committeeChamber = String(detail?.chamber || c.chamber || '')
      .trim()
      .toLowerCase()
    const needPersonChamber =
      committeeChamber === 'legislature' ||
      !committeeChamber ||
      members.some((m) => !m.chamber)
    if (needPersonChamber && members.some((m) => m.personId)) {
      try {
        members = await enrichCommitteeMembersWithPeopleDetails(members)
      } catch (e) {
        console.warn('[outreach] enrich members for chamber failed', e)
      }
    }
    return members
  }

  const toggleCommittee = async (c) => {
    if (!c?.id) return
    if (osPickIds.has(c.id)) {
      setOsPicks((prev) => prev.filter((p) => p.id !== c.id))
      setOsMembers((prev) => prev.filter((m) => m.committeeId !== c.id))
      setOsDetailError('')
      return
    }
    setOsDetailError('')
    setOsLoadingIds((prev) => {
      const next = new Set(prev)
      next.add(c.id)
      return next
    })
    setOsPicks((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, c]))
    try {
      const members = await fetchCommitteeMembers(c)
      setOsMembers((prev) => [...prev.filter((m) => m.committeeId !== c.id), ...members])
    } catch (e) {
      setOsPicks((prev) => prev.filter((p) => p.id !== c.id))
      setOsDetailError(e.message || 'Failed to load committee.')
    } finally {
      setOsLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(c.id)
        return next
      })
    }
  }

  const handleFillProspectsFromLegiScanMatches = async () => {
    if (!selectedBillId || !legiscanTargets.length || !prospectTargets.length) return
    console.log('[outreach] LegiScan fill clicked', {
      billId: selectedBillId,
      state: selectedBill?.state ?? null,
      legiscanRows: legiscanTargets.length,
      prospectRows: prospectTargets.length,
    })
    setProspectLegiscanMatching(true)
    setRefreshMessage('')
    setLoadError('')
    try {
      /** @type {Map<string, (typeof targets)[0]>} */
      const byName = new Map()
      for (const t of legiscanTargets) {
        for (const k of outreachNameMatchKeys(t.display_name)) {
          if (k && !byName.has(k)) byName.set(k, t)
        }
      }
      /** @type {Record<string, unknown>} */
      const logSummary = {
        flow: 'fill_from_legiscan_matches',
        billId: selectedBillId,
        state: selectedBill?.state ?? null,
        prospectCount: prospectTargets.length,
        sponsorRowMatches: 0,
        statewideLookups: 0,
        sessionPeopleCount: null,
        statewideNameMatched: 0,
        statewideWithPeopleId: 0,
        statewideGetPersonContact: 0,
        statewideEmbedHadContact: 0,
        searchFallbackUsed: 0,
        searchBills: 0,
        searchCandidates: 0,
        searchSuccess: 0,
        rowsPatched: 0,
        noSourceContact: 0,
      }
      /** Rows that had no patch applied but are useful for debugging (no LegiScan contact or already filled). */
      const perRow = []
      /** @type {Record<string, number>} */
      const reasonCounts = {}

      let n = 0
      for (const p of prospectTargets) {
        const leg = outreachNameMatchKeys(p.display_name).map((k) => byName.get(k)).find(Boolean)
        let fallbackContact = null
        /** @type {Awaited<ReturnType<typeof fetchLegiscanPersonContactByName>> | null} */
        let byNameRes = null
        if (leg) {
          logSummary.sponsorRowMatches++
        } else if (selectedBill?.state) {
          logSummary.statewideLookups++
          byNameRes = await fetchLegiscanPersonContactByName(selectedBill.state, p.display_name)
          if (logSummary.sessionPeopleCount == null && byNameRes.meta?.sessionPeopleCount != null) {
            logSummary.sessionPeopleCount = byNameRes.meta.sessionPeopleCount
          }
          if (byNameRes.meta?.nameMatched) logSummary.statewideNameMatched++
          if (byNameRes.meta?.peopleId != null) logSummary.statewideWithPeopleId++
          if (byNameRes.meta?.getPersonReturnedContact) logSummary.statewideGetPersonContact++
          if (byNameRes.meta?.embedHadContact) logSummary.statewideEmbedHadContact++
          if (byNameRes.meta?.searchFallbackUsed) logSummary.searchFallbackUsed++
          if (byNameRes.meta?.searchedBills) logSummary.searchBills += Number(byNameRes.meta.searchedBills || 0)
          if (byNameRes.meta?.sponsorCandidates) {
            logSummary.searchCandidates += Number(byNameRes.meta.sponsorCandidates || 0)
          }
          if (byNameRes?.ok && byNameRes.meta?.reason === 'search_sponsor_inference') {
            logSummary.searchSuccess++
          }
          if (byNameRes.meta?.reason) {
            reasonCounts[byNameRes.meta.reason] = (reasonCounts[byNameRes.meta.reason] || 0) + 1
          }
          if (byNameRes?.ok) fallbackContact = byNameRes.contact
        }

        if (!leg && !fallbackContact) {
          if (!leg && byNameRes) {
            logSummary.noSourceContact++
            perRow.push({
              display_name: p.display_name,
              sponsor_match: false,
              meta: byNameRes.meta,
            })
          }
          continue
        }
        /** @type {Record<string, unknown>} */
        const patch = {}
        const sourceEmail = String(leg?.contact_email || fallbackContact?.email || '').trim()
        const sourceWebmail = String(leg?.contact_webmail_url || fallbackContact?.webmailUrl || '').trim()
        const sourcePhone = String(leg?.contact_phone || fallbackContact?.phone || '').trim()
        if (!(p.contact_email || '').trim() && sourceEmail) {
          patch.contact_email = sourceEmail
        }
        if (!(p.contact_webmail_url || '').trim() && sourceWebmail) {
          patch.contact_webmail_url = sourceWebmail
        }
        if (!(p.contact_phone || '').trim() && sourcePhone) {
          patch.contact_phone = sourcePhone
        }
        if (leg && !(p.greeting_title || '').trim()) {
          const gt = chamberTitleFromSponsorRole(leg.sponsor_role)
          if (gt) patch.greeting_title = gt
        }
        if (!Object.keys(patch).length) {
          if (leg || byNameRes) {
            perRow.push({
              display_name: p.display_name,
              sponsor_match: Boolean(leg),
              meta: byNameRes?.meta,
              note: 'matched_but_already_filled_or_no_new_fields',
            })
          }
          continue
        }
        await patchTarget(p.target_id, patch)
        n += 1
        logSummary.rowsPatched++
      }
      await loadTargets()

      console.log('[outreach] LegiScan fill — summary', logSummary)
      if (perRow.length) {
        console.warn('[outreach] LegiScan fill — rows with no new contact or diagnostics', perRow)
      }
      if (Object.keys(reasonCounts).length) {
        console.log('[outreach] LegiScan fill — statewide reason counts', reasonCounts)
      }

      const msgParts = [
        n
          ? `Updated ${n} prospect row(s).`
          : 'No prospect rows were updated.',
        `Sponsor name matches: ${logSummary.sponsorRowMatches}. Statewide lookups: ${logSummary.statewideLookups}.`,
        logSummary.sessionPeopleCount != null
          ? `Session roster size: ${logSummary.sessionPeopleCount}.`
          : '',
        `Statewide: name in roster ${logSummary.statewideNameMatched}, with people id ${logSummary.statewideWithPeopleId}, getPerson had contact ${logSummary.statewideGetPersonContact}, embed had contact ${logSummary.statewideEmbedHadContact}.`,
        logSummary.searchFallbackUsed
          ? `Search fallback: used ${logSummary.searchFallbackUsed}, searched bills ${logSummary.searchBills}, sponsor candidates ${logSummary.searchCandidates}, successful ${logSummary.searchSuccess}.`
          : '',
        Object.keys(reasonCounts).length
          ? `Reasons: ${Object.entries(reasonCounts)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ')}.`
          : '',
      ].filter(Boolean)
      setRefreshMessage(msgParts.join(' '))
    } catch (e) {
      console.error('[outreach] LegiScan fill failed', e)
      setLoadError(e.message || 'Could not match LegiScan contacts.')
    } finally {
      setProspectLegiscanMatching(false)
    }
  }

  const handleDeleteProspect = async (t) => {
    if (!t?.target_id) return
    if (!isProspectTarget(t)) return
    const ok = window.confirm(`Remove prospect “${t.display_name}” from this bill’s outreach list?`)
    if (!ok) return
    const prevScrollY = window.scrollY
    setLoadError('')
    try {
      const { error } = await supabase.from('bill_outreach_targets').delete().eq('target_id', t.target_id)
      if (error) throw error
      await loadTargets()
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: prevScrollY, behavior: 'auto' })
      })
    } catch (e) {
      setLoadError(e.message || 'Could not delete prospect.')
    }
  }

  const importCommitteeMembers = async () => {
    if (!selectedBill || !osPicks.length || !uniqueFilteredMemberCount) return
    setOsImporting(true)
    setLoadError('')
    try {
      const existingRes = await supabase
        .from('bill_outreach_targets')
        .select(
          'sponsor_key,status,notes,contact_phone,contact_email,contact_webmail_url,target_source,openstates_person_id,openstates_committee_id,greeting_title'
        )
        .eq('bill_id', selectedBill.bill_id)

      if (existingRes.error) throw existingRes.error

      let membersToImport = filteredOsMembers
      try {
        membersToImport = await enrichCommitteeMembersWithPeopleDetails(filteredOsMembers)
      } catch (e) {
        console.warn('[outreach] enrichCommitteeMembersWithPeopleDetails failed', e)
      }

      // Same legislator can sit on multiple selected committees — one outreach row per person.
      const dedupedBySponsor = []
      const seenSponsor = new Set()
      for (const m of membersToImport) {
        if (!m.sponsorKey || seenSponsor.has(m.sponsorKey)) continue
        seenSponsor.add(m.sponsorKey)
        dedupedBySponsor.push(m)
      }
      membersToImport = dedupedBySponsor

      const existingByKey = new Map((existingRes.data || []).map((r) => [r.sponsor_key, r]))
      const legiscanByName = new Map()
      for (const t of legiscanTargets) {
        for (const k of outreachNameMatchKeys(t.display_name)) {
          if (k && !legiscanByName.has(k)) legiscanByName.set(k, t)
        }
      }
      const rows = []
      /** @type {Record<string, unknown>} */
      const importLog = {
        flow: 'import_openstates_committee',
        billId: selectedBill.bill_id,
        state: selectedBill?.state ?? null,
        committeeCount: osPicks.length,
        memberCount: membersToImport.length,
        previewRows: filteredOsMembers.length,
        sponsorMatches: 0,
        statewideLookups: 0,
        sessionPeopleCount: null,
        statewideNameMatched: 0,
        statewideWithPeopleId: 0,
        statewideGetPersonContact: 0,
        statewideEmbedHadContact: 0,
      }
      const importDiagnostics = []
      for (const m of membersToImport) {
        const sponsorKey = m.sponsorKey
        if (!sponsorKey) continue
        const existing = existingByKey.get(sponsorKey)
        const leg = outreachNameMatchKeys(m.name).map((k) => legiscanByName.get(k)).find(Boolean)
        let fallbackContact = null
        /** @type {Awaited<ReturnType<typeof fetchLegiscanPersonContactByName>> | null} */
        let byNameRes = null
        if (leg) {
          importLog.sponsorMatches++
        } else if (selectedBill?.state) {
          importLog.statewideLookups++
          byNameRes = await fetchLegiscanPersonContactByName(selectedBill.state, m.name)
          if (importLog.sessionPeopleCount == null && byNameRes.meta?.sessionPeopleCount != null) {
            importLog.sessionPeopleCount = byNameRes.meta.sessionPeopleCount
          }
          if (byNameRes.meta?.nameMatched) importLog.statewideNameMatched++
          if (byNameRes.meta?.peopleId != null) importLog.statewideWithPeopleId++
          if (byNameRes.meta?.getPersonReturnedContact) importLog.statewideGetPersonContact++
          if (byNameRes.meta?.embedHadContact) importLog.statewideEmbedHadContact++
          if (byNameRes?.ok) fallbackContact = byNameRes.contact
        }
        const nextPhone = firstNonEmptyContact(existing?.contact_phone, leg?.contact_phone, fallbackContact?.phone)
        const nextEmail = firstNonEmptyContact(existing?.contact_email, leg?.contact_email, fallbackContact?.email)
        const nextWebmail = firstNonEmptyContact(
          existing?.contact_webmail_url,
          leg?.contact_webmail_url,
          fallbackContact?.webmailUrl
        )
        if (
          !nextPhone?.trim() &&
          !nextEmail?.trim() &&
          !nextWebmail?.trim() &&
          byNameRes?.meta
        ) {
          importDiagnostics.push({ name: m.name, meta: byNameRes.meta, sponsor_match: Boolean(leg) })
        }
        rows.push({
          bill_id: selectedBill.bill_id,
          sponsor_key: sponsorKey,
          display_name: m.name,
          party: m.party || null,
          sponsor_role: m.role || null,
          contact_phone: nextPhone,
          contact_email: nextEmail,
          contact_webmail_url: nextWebmail,
          status: existing?.status || 'pending',
          notes: existing?.notes || null,
          target_source: 'openstates_committee',
          openstates_person_id: m.personId || null,
          openstates_committee_id: m.committeeId || osPicks[0]?.id || null,
          updated_by_member_id: member?.member_id || null,
          greeting_title: m.legislativeGreetingTitle ?? existing?.greeting_title ?? null,
        })
      }
      if (!rows.length) {
        setOsDetailError('No members to import.')
        return
      }
      const { error } = await supabase.from('bill_outreach_targets').upsert(rows, {
        onConflict: 'bill_id,sponsor_key',
      })
      if (error) throw error
      console.log('[outreach] Open States committee import — LegiScan contact summary', importLog)
      if (importDiagnostics.length) {
        console.warn('[outreach] Open States committee import — rows with no contact after lookup', importDiagnostics)
      }
      closeOsModal()
      await loadTargets()
    } catch (e) {
      setLoadError(e.message || 'Import failed.')
    } finally {
      setOsImporting(false)
    }
  }

  const handleRefreshLegiscan = async () => {
    if (!selectedBill) return
    if (!canLegiscanRefresh) {
      setRefreshMessage('Add a LegiScan URL on this bill to refresh sponsors from LegiScan.')
      return
    }
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
        .select('sponsor_key,status,notes,contact_phone,contact_email,contact_webmail_url,greeting_title')
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

        const nextContactPhone =
          existing?.contact_phone != null && String(existing.contact_phone).trim()
            ? existing.contact_phone
            : phone
        const nextContactWebmailUrl =
          existing?.contact_webmail_url != null && String(existing.contact_webmail_url).trim()
            ? existing.contact_webmail_url
            : webmailUrl
        const nextContactEmail =
          existing?.contact_email != null && String(existing.contact_email).trim()
            ? existing.contact_email
            : (s.email || '').trim() || null

        rows.push({
          bill_id: selectedBill.bill_id,
          sponsor_key: sponsorKey,
          display_name: s.name,
          party: s.party || null,
          sponsor_role: s.role || null,
          contact_phone: nextContactPhone,
          contact_email: nextContactEmail,
          contact_webmail_url: nextContactWebmailUrl,
          status: existing?.status || 'pending',
          notes: existing?.notes || null,
          target_source: 'legiscan',
          openstates_person_id: null,
          openstates_committee_id: null,
          updated_by_member_id: member?.member_id || null,
          greeting_title: existing?.greeting_title ?? null,
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

  const openContactComposer = (t) => {
    setContactTarget(t)
  }

  const handleSourceBillFromLegiscan = async () => {
    setSourceError('')
    setSourceMessage('')
    const stateStored = canonicalUSStateName(sourceState) || String(sourceState || '').trim()
    const billRaw = String(sourceBillNumber || '').trim()
    const compactBill = billRaw.replace(/\s+/g, '')
    if (!stateStored) {
      setSourceError('Choose a state (use United States for federal bills like HR 2018).')
      return
    }
    if (!compactBill || !isLegiscanBillNumberShape(compactBill)) {
      setSourceError('Enter a bill number like HR2018, HB 970, or S.123.')
      return
    }

    setSourcing(true)
    try {
      const result = await fetchLegiscanBillBySearch(stateStored, compactBill)
      if (!result.ok) {
        setSourceError(result.message || 'Could not find that bill on LegiScan.')
        return
      }
      const detail = result.detail
      const billName = String(detail.billNumber || compactBill).trim()
      const legiscanUrl = String(detail.url || '').trim() || null
      const description =
        String(detail.title || '').trim() ||
        String(detail.description || '').trim() ||
        `${stateStored} ${billName}`
      const billDate =
        (detail.statusDate && String(detail.statusDate).slice(0, 10)) ||
        new Date().toISOString().slice(0, 10)

      const stateKey = (s) => (usStateAbbreviation(s) || '').toUpperCase()
      const nameKey = (n) => {
        let k = String(n || '').replace(/[\s._-]+/g, '').toUpperCase()
        if (stateKey(stateStored) === 'US' && /^HR\d/.test(k)) k = `HB${k.slice(2)}`
        return k
      }
      const existing = (bills || []).find((b) => {
        if (legiscanUrl && String(b.legiscan_link || '').trim() === legiscanUrl) return true
        return stateKey(b.state) === stateKey(stateStored) && nameKey(b.name) === nameKey(billName)
      })
      if (existing) {
        setPendingSelectBillId(existing.bill_id)
        setSourceMessage(
          `${usStateAbbreviation(existing.state) || ''} ${existing.name} is already in Outreach — selected below.`
        )
        setSourceBillNumber('')
        return
      }

      const { data: inserted, error: insertError } = await supabase
        .from('bills')
        .insert([
          {
            state: stateStored,
            name: billName,
            position: sourcePosition || 'Support',
            description,
            bill_date: billDate,
            legiscan_link: legiscanUrl,
            google_doc_link: null,
            bill_collaborators: member?.member_id ? [member.member_id] : null,
            status: 'outreach_only',
            hidden: true,
            submitted_by: member?.member_id || null,
            submitted_at: new Date().toISOString(),
          },
        ])
        .select('bill_id')
        .single()

      if (insertError) throw insertError

      setSourceMessage(
        `Added ${usStateAbbreviation(stateStored) || stateStored} ${billName} to Outreach. Click Refresh from LegiScan to load sponsors. This does not create a public proposal or change any assigned task.`
      )
      setSourceBillNumber('')
      if (inserted?.bill_id != null) {
        setPendingSelectBillId(inserted.bill_id)
      }
      if (typeof onBillsChanged === 'function') {
        await onBillsChanged()
      }
    } catch (e) {
      console.error('[outreach] source bill failed', e)
      setSourceError(e.message || 'Failed to add bill for outreach.')
    } finally {
      setSourcing(false)
    }
  }

  const sourceBillForm = (
    <div className="border rounded p-3 mb-3 bg-light">
      <div className="fw-semibold small mb-1">Add a bill to Outreach</div>
      <p className="text-muted small mb-2 mb-md-3">
        Search LegiScan by state and bill number to track sponsors here. For Congress, use <strong>United States</strong>{' '}
        and <strong>HR2018</strong> or <strong>HB2018</strong>. This only adds the bill to Outreach — it is not a SPAN
        proposal, will not show on the public Bills page, and does not change assigned tasks.
      </p>
      <div className="row g-2 align-items-end">
        <div className="col-md-4">
          <label className="form-label small text-muted mb-1" htmlFor="outreach-source-state">
            State / jurisdiction
          </label>
          <select
            id="outreach-source-state"
            className="form-select form-select-sm"
            value={sourceState}
            onChange={(e) => setSourceState(e.target.value)}
            disabled={sourcing}
          >
            {OUTREACH_SOURCE_STATE_OPTIONS.map(({ code, name }) => (
              <option key={code} value={name}>
                {name} ({code})
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small text-muted mb-1" htmlFor="outreach-source-bill">
            Bill number
          </label>
          <input
            id="outreach-source-bill"
            type="text"
            className="form-control form-control-sm"
            placeholder="HR2018"
            value={sourceBillNumber}
            onChange={(e) => setSourceBillNumber(e.target.value)}
            disabled={sourcing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSourceBillFromLegiscan()
              }
            }}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label small text-muted mb-1" htmlFor="outreach-source-position">
            Position
          </label>
          <select
            id="outreach-source-position"
            className="form-select form-select-sm"
            value={sourcePosition}
            onChange={(e) => setSourcePosition(e.target.value)}
            disabled={sourcing}
          >
            <option value="Support">Support</option>
            <option value="Oppose">Oppose</option>
            <option value="Support If Amended">Support If Amended</option>
            <option value="Propose">Propose</option>
          </select>
        </div>
        <div className="col-md-3">
          <button
            type="button"
            className="btn btn-sm btn-success w-100"
            disabled={sourcing}
            onClick={handleSourceBillFromLegiscan}
          >
            {sourcing ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" />
                Looking up…
              </>
            ) : (
              <>
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                Add from LegiScan
              </>
            )}
          </button>
        </div>
      </div>
      {sourceError && (
        <div className="alert alert-danger py-2 small mt-2 mb-0" role="alert">
          {sourceError}
        </div>
      )}
      {sourceMessage && !sourceError && (
        <div className="alert alert-success py-2 small mt-2 mb-0" role="status">
          {sourceMessage}
        </div>
      )}
    </div>
  )

  if (!sortedBills.length) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {sourceBillForm}
          <p className="text-muted mb-0 small">
            Nothing in Outreach yet. Add a bill above to track sponsors, or open a SPAN proposal that is already under
            review or approved.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        {sourceBillForm}
        <p className="text-muted small mb-3">
          <strong>On record</strong> = sponsors from LegiScan (<strong>Refresh from LegiScan</strong>).{' '}
          <strong>Prospects</strong> = committee members from Open States (<strong>Import from committee</strong>). Use{' '}
          <strong>Fill from LegiScan matches</strong> to copy contact info onto prospects when names match. Use{' '}
          <strong>Compose</strong> to draft outreach. Status and notes are saved on this bill.
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
                  {(usStateAbbreviation(b.state) || '?') +
                    ' · ' +
                    (b.name || '') +
                    (b.status === 'outreach_only' ? ' (Outreach only)' : '')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-auto d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={!selectedBill || !openStatesJurisdiction}
              onClick={openOsModal}
              title={
                !openStatesJurisdiction
                  ? 'Committee import needs a US state on the bill (not federal-only).'
                  : undefined
              }
            >
              <i className="bi bi-people me-1" aria-hidden="true" />
              Import from committee (Open States)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!selectedBill || refreshing || !canLegiscanRefresh}
              onClick={handleRefreshLegiscan}
              title={!canLegiscanRefresh ? 'Add a LegiScan URL on this bill first.' : undefined}
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
            No outreach rows yet. Use <strong>Import from committee (Open States)</strong> to add prospects, or{' '}
            <strong>Refresh from LegiScan</strong> when this bill has a LegiScan URL.
          </p>
        ) : (
          <div>
            <h6 className="text-muted small text-uppercase mb-2">On record (LegiScan)</h6>
            {legiscanTargets.length ? (
              <OutreachTargetsTable
                targets={legiscanTargets}
                patchTarget={patchTarget}
                onOpenContact={openContactComposer}
                billState={selectedBill?.state}
              />
            ) : (
              <p className="text-muted small mb-3">
                None yet — add a LegiScan link and refresh, or add prospects below.
              </p>
            )}

            <div className="d-flex flex-wrap align-items-center gap-2 mb-2 mt-4">
              <h6 className="text-muted small text-uppercase mb-0">Prospects (Open States)</h6>
              {prospectTargets.length > 0 && legiscanTargets.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={prospectLegiscanMatching}
                  onClick={handleFillProspectsFromLegiScanMatches}
                  title="Copy email, webmail, and phone from LegiScan rows when the normalized display name matches and the prospect field is empty."
                >
                  {prospectLegiscanMatching ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" />
                      Matching…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-link-45deg me-1" aria-hidden="true" />
                      Fill from LegiScan matches
                    </>
                  )}
                </button>
              )}
            </div>
            {prospectTargets.length ? (
              <OutreachTargetsTable
                targets={prospectTargets}
                patchTarget={patchTarget}
                onOpenContact={openContactComposer}
                showProspectDelete
                onDeleteProspect={handleDeleteProspect}
                billState={selectedBill?.state}
              />
            ) : (
              <p className="text-muted small mb-0">None yet — use Import from committee.</p>
            )}
          </div>
        )}
      </div>

      {contactTarget != null && (
        <Suspense fallback={null}>
          <OutreachContactModal
            open
            onClose={() => setContactTarget(null)}
            bill={selectedBill}
            target={contactTarget}
            member={member}
            onMarkContacted={async () => {
              if (contactTarget) {
                await patchTarget(contactTarget.target_id, { status: 'contacted' })
              }
            }}
          />
        </Suspense>
      )}

      {osModalOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            aria-hidden="true"
            onClick={closeOsModal}
            style={{ cursor: 'pointer' }}
          />
          <div
            className="modal fade show"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            style={{ display: 'block' }}
            onClick={closeOsModal}
          >
            <div
              className="modal-dialog modal-lg modal-dialog-scrollable"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Import from committee (Open States)</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeOsModal} />
                </div>
                <div className="modal-body">
                  {!openStatesJurisdiction ? (
                    <p className="text-muted small mb-0">
                      This bill needs a US state (not federal-only) to load committees.
                    </p>
                  ) : (
                    <>
                      <p className="small text-muted mb-2">
                        Jurisdiction: <code className="small">{openStatesJurisdiction}</code>
                      </p>
                      <div className="row g-2 align-items-end mb-3">
                        <div className="col-md-4">
                          <label className="form-label small text-muted mb-1" htmlFor="os-chamber">
                            Chamber filter
                          </label>
                          <select
                            id="os-chamber"
                            className="form-select form-select-sm"
                            value={osChamber}
                            onChange={(e) => setOsChamber(e.target.value)}
                          >
                            <option value="">All</option>
                            <option value="lower">Lower / House</option>
                            <option value="upper">Upper / Senate</option>
                            <option value="legislature">Legislature (unicameral)</option>
                          </select>
                        </div>
                        <div className="col-md-8">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary me-2"
                            disabled={osListLoading}
                            onClick={() => loadCommitteesPage(1, false)}
                          >
                            {osListLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" />
                                Loading…
                              </>
                            ) : (
                              'Load committees'
                            )}
                          </button>
                          {osCommittees.length > 0 && osCanLoadMore && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled={osListLoading}
                              onClick={loadMoreCommittees}
                            >
                              Load more
                            </button>
                          )}
                        </div>
                      </div>
                      {osListError && (
                        <div className="alert alert-danger py-2 small" role="alert">
                          {osListError}
                        </div>
                      )}
                      {osCommittees.length > 0 && (
                        <div className="mb-2">
                          <input
                            type="search"
                            className="form-control form-control-sm"
                            placeholder="Filter committees by name…"
                            value={osSearch}
                            onChange={(e) => setOsSearch(e.target.value)}
                            aria-label="Filter committees"
                          />
                          <p className="small text-muted mb-0 mt-1">
                            Select one or more committees to import. Click again to deselect.
                            {osPicks.length > 0 ? ` ${osPicks.length} selected.` : ''}
                          </p>
                        </div>
                      )}
                      <div className="border rounded mb-3" style={{ maxHeight: '220px', overflow: 'auto' }}>
                        {filteredOsCommittees.length === 0 && osCommittees.length > 0 ? (
                          <p className="text-muted small p-2 mb-0">No committees match this filter.</p>
                        ) : (
                          <ul className="list-group list-group-flush small mb-0">
                            {filteredOsCommittees.map((c) => {
                              const selected = osPickIds.has(c.id)
                              const loading = osLoadingIds.has(c.id)
                              return (
                                <li key={c.id} className="list-group-item py-2">
                                  <label className="d-flex align-items-center gap-2 mb-0 w-100" style={{ cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      className="form-check-input mt-0 flex-shrink-0"
                                      checked={selected}
                                      disabled={loading}
                                      onChange={() => toggleCommittee(c)}
                                      aria-label={`Select ${c.name || c.id}`}
                                    />
                                    <span className="flex-grow-1">
                                      {c.name || c.id}
                                      {openStatesChamberLabel(c.chamber) && (
                                        <span className="badge bg-light text-dark border ms-2">
                                          {openStatesChamberLabel(c.chamber)}
                                        </span>
                                      )}
                                      {loading && (
                                        <span className="spinner-border spinner-border-sm ms-2" role="status" />
                                      )}
                                    </span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>

                      {osPicks.length > 0 && (
                        <>
                          <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-2">
                            <h6 className="small text-muted mb-0">
                              Members — {osPicks.length} committee{osPicks.length === 1 ? '' : 's'}
                              {osPicks.length <= 3
                                ? ` (${osPicks.map((p) => p.name || p.id).join(', ')})`
                                : ''}
                            </h6>
                            {(osMembers.length > 0 || osDetailLoading) && (
                              <div style={{ minWidth: '160px' }}>
                                <label className="form-label small text-muted mb-1" htmlFor="os-member-chamber">
                                  Member chamber
                                </label>
                                <select
                                  id="os-member-chamber"
                                  className="form-select form-select-sm"
                                  value={osMemberChamber}
                                  onChange={(e) => setOsMemberChamber(e.target.value)}
                                >
                                  <option value="">All</option>
                                  <option value="lower">House</option>
                                  <option value="upper">Senate</option>
                                </select>
                              </div>
                            )}
                          </div>
                          {osDetailLoading && (
                            <p className="small text-muted">
                              <span className="spinner-border spinner-border-sm me-1" role="status" />
                              Loading members…
                            </p>
                          )}
                          {osDetailError && (
                            <div className="alert alert-warning py-2 small" role="alert">
                              {osDetailError}
                            </div>
                          )}
                          {!osDetailLoading && !osDetailError && osMembers.length === 0 && (
                            <p className="text-muted small">No memberships returned for the selected committees.</p>
                          )}
                          {osMembers.length > 0 && filteredOsMembers.length === 0 && (
                            <p className="text-muted small">No members match this chamber filter.</p>
                          )}
                          {filteredOsMembers.length > 0 && (
                            <div className="table-responsive border rounded mb-3" style={{ maxHeight: '200px' }}>
                              <table className="table table-sm mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>Name</th>
                                    <th>Committee</th>
                                    <th>Chamber</th>
                                    <th>Party</th>
                                    <th>Role</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredOsMembers.map((m) => (
                                    <tr key={`${m.committeeId || ''}:${m.sponsorKey}`}>
                                      <td>{m.name}</td>
                                      <td className="text-muted small">{m.committeeName || '—'}</td>
                                      <td className="text-muted small">
                                        {openStatesChamberLabel(m.chamber) || '—'}
                                      </td>
                                      <td className="text-muted small">{m.party || '—'}</td>
                                      <td className="text-muted small">{m.role || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={closeOsModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={
                      !openStatesJurisdiction ||
                      !osPicks.length ||
                      !uniqueFilteredMemberCount ||
                      osImporting ||
                      osDetailLoading
                    }
                    onClick={importCommitteeMembers}
                  >
                    {osImporting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" />
                        Importing…
                      </>
                    ) : (
                      `Import ${uniqueFilteredMemberCount} member(s)`
                    )}
                  </button>
                </div>
              </div>
            </div>
      </div>
        </>
      )}
    </div>
  )
}

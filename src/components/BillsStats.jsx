import React, { useEffect, useState } from 'react'
import { fetchPublicBills } from '../lib/publicData'

const FEDERAL_ALIASES = [
  'federal',
  'federal (us)',
  'united states',
  'united states of america',
  'usa',
  'u.s.',
  'u.s',
  'us',
  'national',
]

const normalizeStateValue = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

function isFederalBill(state) {
  if (!state) return false
  const normalized = normalizeStateValue(state)
  return FEDERAL_ALIASES.includes(normalized) || /federal/.test(normalized) || /united states/.test(normalized)
}

/**
 * Fetches public bill counts once for the homepage impact cards.
 * Renders nothing by itself when used as a provider-style hook consumer —
 * prefer `usePublicBillImpactStats` from the parent.
 */
export function usePublicBillImpactStats() {
  const [stats, setStats] = useState({ proposals: null, states: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const bills = await fetchPublicBills()
        if (cancelled) return
        if (!bills) {
          setStats({ proposals: 0, states: 0 })
          return
        }
        const stateBills = bills.filter((b) => b.state && !isFederalBill(b.state))
        const uniqueStates = new Set(stateBills.map((b) => b.state).filter(Boolean))
        setStats({
          proposals: bills.length || 0,
          states: uniqueStates.size || 0,
        })
      } catch (error) {
        console.error('Error updating bills stats:', error)
        if (!cancelled) setStats({ proposals: 0, states: 0 })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return stats
}

/** @deprecated Prefer usePublicBillImpactStats — kept for App page='bills-stats' entry */
function BillsStats() {
  const stats = usePublicBillImpactStats()
  if (stats.proposals == null) return null
  return (
    <span className="visually-hidden">
      {stats.proposals} proposals, {stats.states} states targeted
    </span>
  )
}

export default BillsStats

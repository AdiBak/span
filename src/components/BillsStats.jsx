import React, { useEffect } from 'react'
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
  'national'
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

function BillsStats() {
  useEffect(() => {
    updateStats()
  }, [])

  async function updateStats() {
    try {
      const bills = await fetchPublicBills()

      if (!bills) {
        console.error('Failed to load bills stats: empty result')
        return
      }

      const proposalsElem = document.getElementById('proposals')
      const statesElem = document.getElementById('statesTargeted')

      if (proposalsElem) {
        proposalsElem.textContent = bills?.length || 0
      }

      if (statesElem) {
        // Filter out federal bills and get unique states
        const stateBills = bills?.filter(b => b.state && !isFederalBill(b.state)) || []
        const uniqueStates = new Set(stateBills.map(b => b.state).filter(Boolean))
        statesElem.textContent = uniqueStates.size || 0
      }
    } catch (error) {
      console.error('Error updating bills stats:', error)
    }
  }

  return null // This component doesn't render anything, just updates stats
}

export default BillsStats


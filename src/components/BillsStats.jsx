import React, { useEffect } from 'react'
import { supabase } from '../lib/supabase'

function BillsStats() {
  useEffect(() => {
    updateStats()
  }, [])

  async function updateStats() {
    try {
      const { data: bills, error } = await supabase.from('bills').select('state')

      if (error) {
        console.error('Failed to load bills stats:', error)
        return
      }

      const proposalsElem = document.getElementById('proposals')
      const statesElem = document.getElementById('statesTargeted')

      if (proposalsElem) {
        proposalsElem.textContent = bills?.length || 0
      }

      if (statesElem) {
        const uniqueStates = new Set(bills?.map(b => b.state).filter(Boolean))
        statesElem.textContent = uniqueStates.size || 0
      }
    } catch (error) {
      console.error('Error updating bills stats:', error)
    }
  }

  return null // This component doesn't render anything, just updates stats
}

export default BillsStats


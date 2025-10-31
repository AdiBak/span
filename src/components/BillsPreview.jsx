import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BillCard from './BillCard'

function BillsPreview() {
  const [bills, setBills] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // Fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')

      if (billsError) throw billsError

      // Sort by date (newest first) and take first 4
      const processedBills = (billsData || [])
        .map(b => ({
          ...b,
          bill_date: new Date(b.bill_date)
        }))
        .sort((a, b) => b.bill_date - a.bill_date)
        .slice(0, 4) // Only show 4 for homepage preview

      // Check PDF existence
      const billsWithPDF = await Promise.all(
        processedBills.map(async (bill) => {
          const pdfPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${bill.state}/${bill.name}.pdf`
          const exists = await checkPDFExists(pdfPath)
          return { ...bill, pdfExists: exists }
        })
      )

      setBills(billsWithPDF)

      // Fetch members (needed for collaborator avatars)
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')

      if (membersError) throw membersError
      setMembers(membersData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error.message || 'Failed to load bills')
      setLoading(false)
    }
  }

  async function checkPDFExists(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch {
      return false
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
        <div className="spinner-border text-secondary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
        <p className="text-muted">Unable to load bills at this time.</p>
      </div>
    )
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-4" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
        <p className="text-muted">No recent bills to display.</p>
      </div>
    )
  }

  return (
    <div className="row mt-5 g-4" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
      {bills.map((bill, idx) => (
        <BillCard
          key={`${bill.state}-${bill.name}-${idx}`}
          bill={{
            ...bill,
            index: idx,
            bill_id: bill.bill_id || `${bill.state}-${bill.name}`
          }}
          members={members}
          onCollaboratorClick={() => {}} // No modal needed for preview
          onKeywordExtracted={() => {}} // No keyword extraction needed for preview
        />
      ))}
    </div>
  )
}

export default BillsPreview


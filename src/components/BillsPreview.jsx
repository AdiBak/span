import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import BillCard from './BillCard'
import CollaboratorModal from './CollaboratorModal'

function BillsPreview() {
  const [bills, setBills] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCollaborators, setSelectedCollaborators] = useState(null)

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
        .slice(0, 3) // Show 3 for homepage preview

      // Check PDF existence
      const billsWithPDF = await Promise.all(
        processedBills.map(async (bill) => {
          // Try both formats: sanitized (new) and original with spaces (old, URL-encoded)
          const sanitizedName = bill.name.replace(/[^a-zA-Z0-9]/g, '_')
          const sanitizedState = bill.state.replace(/[^a-zA-Z0-9]/g, '_')
          
          // New format: sanitized (underscores)
          const sanitizedPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${sanitizedState}/${sanitizedName}.pdf`
          const sanitizedExists = await checkPDFExists(sanitizedPath)
          
          if (sanitizedExists) {
            return { ...bill, pdfExists: true }
          }
          
          // Old format: original names with spaces (URL-encoded)
          const originalState = encodeURIComponent(bill.state)
          const originalName = encodeURIComponent(bill.name)
          const originalPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${originalState}/${originalName}.pdf`
          const originalExists = await checkPDFExists(originalPath)
          
          return { ...bill, pdfExists: originalExists }
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

  function handleCollaboratorClick(collaborators, billIndex) {
    const bill = bills[billIndex]
    if (bill) {
      setSelectedCollaborators({ collaborators, bill })
    }
  }

  function handleCloseCollaboratorModal() {
    setSelectedCollaborators(null)
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-4" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
        <p className="text-muted">No recent bills to display.</p>
      </div>
    )
  }

  return (
    <>
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
            onCollaboratorClick={handleCollaboratorClick}
            onKeywordExtracted={() => {}} // No keyword extraction needed for preview
          />
        ))}
      </div>
      {selectedCollaborators && (
        <CollaboratorModal
          collaborators={selectedCollaborators.collaborators}
          bill={selectedCollaborators.bill}
          members={members}
          onClose={handleCloseCollaboratorModal}
        />
      )}
    </>
  )
}

export default BillsPreview


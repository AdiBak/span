import React, { useEffect, useState } from 'react'
import { fetchPublicBills, fetchPublicDirectoryMembers } from '../lib/publicData'
import { enrichBillWithStoredPdf } from '../lib/proposalPdf'
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
      const billsData = await fetchPublicBills()

      // Sort by date (newest first) and take first 3
      const processedBills = (billsData || [])
        .map((b) => ({
          ...b,
          bill_date: new Date(b.bill_date),
        }))
        .sort((a, b) => b.bill_date - a.bill_date)
        .slice(0, 3)

      // Stored URL only — no Storage HEAD probes (egress)
      const billsWithPDF = processedBills.map((bill) => enrichBillWithStoredPdf(bill))

      setBills(billsWithPDF)

      const membersData = await fetchPublicDirectoryMembers({ requireRegistration: false })
      setMembers(membersData || [])

      setLoading(false)
    } catch (err) {
      console.error('Error fetching bills preview:', err)
      setError(err.message || 'Failed to load bills')
      setLoading(false)
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
              bill_id: bill.bill_id || `${bill.state}-${bill.name}`,
            }}
            members={members}
            onCollaboratorClick={handleCollaboratorClick}
            onKeywordExtracted={() => {}}
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

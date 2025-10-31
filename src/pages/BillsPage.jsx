import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import BillCard from '../components/BillCard'
import Pagination from '../components/Pagination'
import CollaboratorModal from '../components/CollaboratorModal'
import '../pages/BillsPage.css'

const ITEMS_PER_PAGE = 8
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function BillsPage() {
  const [bills, setBills] = useState([])
  const [members, setMembers] = useState([])
  const [filteredBills, setFilteredBills] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [currentFilter, setCurrentFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedCollaborators, setSelectedCollaborators] = useState(null)
  const [billKeywords, setBillKeywords] = useState({}) // Store extracted keywords per bill

  // Fetch bills and members on mount
  useEffect(() => {
    fetchData()
  }, [])

  // Filter bills when filter or search changes
  useEffect(() => {
    filterBills()
  }, [bills, currentFilter, searchQuery, billKeywords])

  async function fetchData() {
    try {
      // Fetch bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')

      if (billsError) throw billsError

      // Sort by date (newest first) and add bill_date as Date object
      const processedBills = (billsData || [])
        .map(b => ({
          ...b,
          bill_date: new Date(b.bill_date)
        }))
        .sort((a, b) => b.bill_date - a.bill_date)

      // Check PDF existence for each bill (concurrently)
      const billsWithPDF = await Promise.all(
        processedBills.map(async (bill) => {
          const pdfPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${bill.state}/${bill.name}.pdf`
          const exists = await checkPDFExists(pdfPath)
          return { ...bill, pdfExists: exists }
        })
      )

      setBills(billsWithPDF)

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')

      if (membersError) throw membersError
      setMembers(membersData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
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

  function filterBills() {
    let filtered = [...bills]

    // Apply position filter
    if (currentFilter !== 'All') {
      filtered = filtered.filter(b => b.position === currentFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(bill => {
        // Search in bill name, state, description
        const matchesBasic = 
          bill.name.toLowerCase().includes(queryLower) ||
          bill.state.toLowerCase().includes(queryLower) ||
          bill.description.toLowerCase().includes(queryLower)

        // Search in extracted keywords if available
        const keywords = billKeywords[bill.bill_id || `${bill.state}-${bill.name}`] || []
        const matchesKeywords = keywords.some(keyword => 
          keyword.toLowerCase().includes(queryLower)
        )

        return matchesBasic || matchesKeywords
      })
    }

    setFilteredBills(filtered)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleKeywordExtracted = React.useCallback((billId, keywords) => {
    setBillKeywords(prev => ({
      ...prev,
      [billId]: keywords
    }))
  }, [])

  function handleCollaboratorClick(collaborators, billIndex) {
    setSelectedCollaborators({ collaborators, billIndex })
  }

  function handleCloseCollaboratorModal() {
    setSelectedCollaborators(null)
  }

  // Get current page items
  const currentBills = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredBills.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredBills, currentPage])

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE)

  // Handle URL params for search (e.g., ?search=Texas)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const searchParam = params.get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [])

  // Initialize AOS animations early, before content renders
  useEffect(() => {
    // Initialize AOS immediately if available, or wait for it to load
    const initAOS = () => {
      if (window.AOS && typeof window.AOS.init === 'function') {
        window.AOS.init({
          duration: 1000,
          once: false,
          mirror: false
        })
        if (typeof window.AOS.refreshHard === 'function') {
          window.AOS.refreshHard()
        } else if (typeof window.AOS.refresh === 'function') {
          window.AOS.refresh()
        }
      }
    }
    
    if (window.AOS) {
      initAOS()
    } else {
      // Wait for AOS to load
      const checkAOS = setInterval(() => {
        if (window.AOS) {
          clearInterval(checkAOS)
          initAOS()
        }
      }, 50)
      return () => clearInterval(checkAOS)
    }
  }, [])
  
  // Refresh AOS when loading completes
  useEffect(() => {
    if (!loading && window.AOS && typeof window.AOS.refresh === 'function') {
      window.AOS.refresh()
    }
  }, [loading])

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-secondary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading bills…</p>
      </div>
    )
  }

  return (
    <div className="bills-page">
      {/* Hero Section (matching existing style) */}
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Bills</h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            Tracking our advocacy efforts across state and federal policy.
          </p>
        </div>
      </section>

      <main className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container py-5">
          {/* Filter and Search Section */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
                {/* Filter Buttons */}
                <div className="btn-group btn-filter-group flex-wrap" role="group">
                  {['All', 'Support', 'Support If Amended', 'Oppose', 'Oppose Unless Amended'].map(filter => (
                    <button
                      key={filter}
                      type="button"
                      className={`btn btn-outline-dark filter-btn ${currentFilter === filter ? 'active' : ''}`}
                      onClick={() => setCurrentFilter(filter)}
                      data-filter={filter}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                {/* Search Bar */}
                <div className="col-12 col-md-4 px-0">
                  <input
                    type="text"
                    id="billSearch"
                    className="form-control"
                    placeholder="Search bills..."
                    aria-label="Search bills"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          {filteredBills.length > 0 && (
            <p className="text-muted mb-3">
              {filteredBills.length} result{filteredBills.length !== 1 ? 's' : ''} found
            </p>
          )}

          {/* Bills Grid */}
          {currentBills.length === 0 ? (
            <div className="col-12 text-center">
              <p className="text-muted mt-5 fs-5">
                No results found. Try a different filter or search term.
              </p>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {currentBills.map((bill, idx) => (
                  <BillCard
                    key={`${bill.state}-${bill.name}-${idx}`}
                    bill={{
                      ...bill,
                      index: idx,
                      bill_id: bill.bill_id || `${bill.state}-${bill.name}`
                    }}
                    members={members}
                    onCollaboratorClick={handleCollaboratorClick}
                    onKeywordExtracted={handleKeywordExtracted}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                      setCurrentPage(page)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Collaborator Modal */}
      {selectedCollaborators && (
        <CollaboratorModal
          collaborators={selectedCollaborators.collaborators}
          bill={filteredBills[selectedCollaborators.billIndex]}
          members={members}
          onClose={handleCloseCollaboratorModal}
        />
      )}
    </div>
  )
}

export default BillsPage


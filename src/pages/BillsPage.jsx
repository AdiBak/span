import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { canonicalUSStateName } from '../lib/usStateCanonical'
import BillCard from '../components/BillCard'
import Pagination from '../components/Pagination'
import CollaboratorModal from '../components/CollaboratorModal'
import PublicBillRecommendationForm from '../components/PublicBillRecommendationForm'
import '../pages/BillsPage.css'

const ITEMS_PER_PAGE = 6
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
  const [currentUser, setCurrentUser] = useState(null) // Current logged-in user member data
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState(null)
  const [editBillForm, setEditBillForm] = useState({
    state: '',
    name: '',
    position: 'Support',
    description: '',
    billDate: '',
    legiscanLink: '',
    googleDocLink: '',
    hidden: false,
    collaborators: []
  })
  const [editBillPdfFile, setEditBillPdfFile] = useState(null)
  const [billError, setBillError] = useState('')
  const [billSuccess, setBillSuccess] = useState('')
  const [showPublicBillForm, setShowPublicBillForm] = useState(false)

  // Fetch bills and members on mount
  useEffect(() => {
    fetchData()
    loadCurrentUser()
  }, [])

  // Load current user to check if executive director
  const loadCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const email = session.user.email
    const { data: memberData } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (memberData) {
      setCurrentUser(memberData)
    }
  }

  // Filter bills when filter or search changes (but not when keywords are extracted)
  useEffect(() => {
    filterBills()
  }, [bills, currentFilter, searchQuery])

  // Update filtered bills when keywords change (without resetting page)
  // Only update if there's an active search query that might benefit from keywords
  useEffect(() => {
    // Only re-filter if there's a search query and keywords have been extracted
    // This prevents page reset when PDFs are opened
    if (searchQuery.trim() && Object.keys(billKeywords).length > 0) {
      // Re-filter without resetting page
      let filtered = [...bills]

      // Apply position filter
      if (currentFilter !== 'All') {
        filtered = filtered.filter(b => b.position === currentFilter)
      }

      // Apply search filter with updated keywords
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

        // Search in collaborators
        const collaborators = bill.bill_collaborators || []
        const matchesCollaborators = collaborators.some(collaborator => 
          collaborator.toLowerCase().includes(queryLower)
        )

        return matchesBasic || matchesKeywords || matchesCollaborators
      })

      setFilteredBills(filtered)
      // Don't reset page - keep current page
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billKeywords]) // Only depend on billKeywords to avoid unnecessary re-renders

  async function fetchData() {
    try {
      // Fetch only approved bills (or bills without status for backwards compatibility), excluding hidden
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .or('status.eq.approved,status.eq.modified,status.is.null')
        .eq('hidden', false)

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

        // Search in collaborators
        const collaborators = bill.bill_collaborators || []
        const matchesCollaborators = collaborators.some(collaborator => 
          collaborator.toLowerCase().includes(queryLower)
        )

        return matchesBasic || matchesKeywords || matchesCollaborators
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

  // Bill edit/delete handlers
  const handleEditBill = (bill) => {
    setSelectedBill(bill)
    setEditBillForm({
      state: bill.state || '',
      name: bill.name || '',
      position: bill.position || 'Support',
      description: bill.description || '',
      billDate: bill.bill_date ? new Date(bill.bill_date).toISOString().split('T')[0] : '',
      legiscanLink: bill.legiscan_link || '',
      googleDocLink: bill.google_doc_link || '',
      hidden: !!(bill.hidden),
      collaborators: bill.bill_collaborators || []
    })
    setEditBillPdfFile(null)
    setBillError('')
    setBillSuccess('')
    setShowEditModal(true)
  }

  const handleDeleteBill = (bill) => {
    setSelectedBill(bill)
    setShowDeleteModal(true)
  }

  const handleSaveEditBill = async () => {
    const { state, name, position, description, billDate, legiscanLink, googleDocLink, hidden, collaborators } = editBillForm
    setBillError('')
    setBillSuccess('')

    if (!state || !name || !description || !billDate) {
      setBillError('State, name, description, and bill date are required.')
      return
    }
    const hasNewPdf = !!editBillPdfFile
    const hadPdf = !!(selectedBill && selectedBill.pdfExists)
    const hasDocLink = !!(googleDocLink && googleDocLink.trim())
    if (!hasDocLink) {
      setBillError('Please provide a link to the proposal document (e.g. Google Doc).')
      return
    }
    if (!hasNewPdf && !hadPdf) {
      setBillError('Please upload a proposal PDF (or ensure one is already stored for this bill).')
      return
    }
    if (!collaborators || collaborators.length === 0) {
      setBillError('Please select at least one collaborator.')
      return
    }

    const stateStored = canonicalUSStateName(state) || state.trim()

    try {
      // 1. Upload new PDF if provided
      if (editBillPdfFile) {
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedState = stateStored.replace(/[^a-zA-Z0-9]/g, '_')
        const pdfPath = `${sanitizedState}/${sanitizedName}.pdf`
        
        const { error: uploadError } = await supabase.storage
          .from('proposals')
          .upload(pdfPath, editBillPdfFile, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          setBillError('Failed to upload PDF. ' + uploadError.message)
          return
        }
      }

      // 2. Update bill in database
      console.log('Attempting to update bill:', selectedBill.bill_id)
      console.log('Update data:', {
        state: stateStored,
        name: name.trim(),
        position: position,
        description: description.trim(),
        bill_date: billDate,
        legiscan_link: legiscanLink.trim() || null,
        bill_collaborators: collaborators.length > 0 ? collaborators : null
      })
      
      const { data, error: updateError } = await supabase
        .from('bills')
        .update({
          state: stateStored,
          name: name.trim(),
          position: position,
          description: description.trim(),
          bill_date: billDate,
          legiscan_link: legiscanLink.trim() || null,
          google_doc_link: googleDocLink.trim() || null,
          hidden: !!hidden,
          bill_collaborators: collaborators.length > 0 ? collaborators : null
        })
        .eq('bill_id', selectedBill.bill_id)
        .select()

      if (updateError) {
        console.error('Update error:', updateError)
        setBillError('Failed to update bill. ' + updateError.message)
        return
      }

      console.log('Bill updated successfully:', data)

      setBillSuccess(`Bill "${stateStored} ${name}" updated successfully!`)
      await fetchData() // Refresh bills
      
      setTimeout(() => {
        setShowEditModal(false)
        setBillSuccess('')
        setSelectedBill(null)
      }, 1500)
    } catch (err) {
      setBillError(err.message || 'Failed to update bill.')
    }
  }

  const handleConfirmDeleteBill = async () => {
    if (!selectedBill) {
      console.error('No bill selected for deletion')
      return
    }

    console.log('Attempting to delete bill:', selectedBill.bill_id, selectedBill.name)
    setBillError('') // Clear any previous errors

    try {
      // Try to delete PDF in both formats (sanitized and original with spaces)
      const sanitizedName = selectedBill.name.replace(/[^a-zA-Z0-9]/g, '_')
      const sanitizedState = selectedBill.state.replace(/[^a-zA-Z0-9]/g, '_')
      const sanitizedPath = `${sanitizedState}/${sanitizedName}.pdf`
      
      // Original format with spaces
      const originalPath = `${selectedBill.state}/${selectedBill.name}.pdf`
      
      console.log('Attempting to delete PDFs:', { sanitizedPath, originalPath })
      
      // Try to delete both (one will fail if it doesn't exist, but that's okay)
      const pathsToDelete = [sanitizedPath, originalPath]
      const { error: storageError } = await supabase.storage
        .from('proposals')
        .remove(pathsToDelete)
      
      // Don't fail if PDF doesn't exist - just log it
      if (storageError) {
        console.warn('PDF deletion warning (may not exist):', storageError)
      } else {
        console.log('PDF deletion successful (or files did not exist)')
      }

      // Delete bill from database
      console.log('Attempting to delete bill from database:', selectedBill.bill_id)
      const { data, error } = await supabase
        .from('bills')
        .delete()
        .eq('bill_id', selectedBill.bill_id)
        .select()

      if (error) {
        console.error('Database delete error:', error)
        throw error
      }

      console.log('Bill deleted successfully:', data)

      setShowDeleteModal(false)
      setSelectedBill(null)
      setBillError('')
      await fetchData() // Refresh bills
    } catch (err) {
      console.error('Delete error:', err)
      const errorMessage = err.message || 'Unknown error occurred'
      setBillError(`Failed to delete bill: ${errorMessage}`)
      // Keep modal open so user can see the error
    }
  }

  const handleEditBillCollaboratorToggle = (memberId) => {
    const member = members.find(m => m.member_id === memberId)
    if (!member) return

    const fullName = `${member.first_name} ${member.last_name}`
    const current = editBillForm.collaborators || []
    
    if (current.includes(fullName)) {
      setEditBillForm({
        ...editBillForm,
        collaborators: current.filter(name => name !== fullName)
      })
    } else {
      setEditBillForm({
        ...editBillForm,
        collaborators: [...current, fullName]
      })
    }
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

  // Initialize AOS animations after component mounts
  useEffect(() => {
    const initAOS = () => {
      if (window.AOS && typeof window.AOS.init === 'function') {
        window.AOS.init({
          duration: 1000,
          easing: 'ease-in-out',
          once: false,
          mirror: false,
          offset: 100,
          startEvent: 'DOMContentLoaded'
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
  
  // Refresh AOS when loading completes and ensure elements animate
  useEffect(() => {
    if (!loading) {
      const timeout = setTimeout(() => {
        if (window.AOS) {
          if (typeof window.AOS.refreshHard === 'function') {
            window.AOS.refreshHard()
          } else if (typeof window.AOS.refresh === 'function') {
            window.AOS.refresh()
          }
          const heroElements = document.querySelectorAll('.bills-page .subpage-hero [data-aos]')
          heroElements.forEach((el, index) => {
            if (el.classList.contains('aos-init') && !el.classList.contains('aos-animate')) {
              setTimeout(() => el.classList.add('aos-animate'), index * 50)
            }
          })
        }
      }, 120)
      return () => clearTimeout(timeout)
    }
  }, [loading])

  // Refresh AOS whenever the visible bills change to prevent hidden cards
  useEffect(() => {
    if (!loading && window.AOS) {
      const timeout = setTimeout(() => {
        if (typeof window.AOS.refreshHard === 'function') {
          window.AOS.refreshHard()
        } else if (typeof window.AOS.refresh === 'function') {
          window.AOS.refresh()
        }
        document.querySelectorAll('.bill-card-wrapper[data-aos]').forEach((el) => {
          if (el.classList.contains('aos-init') && !el.classList.contains('aos-animate')) {
            el.classList.add('aos-animate')
          }
        })
      }, 80)
      return () => clearTimeout(timeout)
    }
  }, [currentPage, filteredBills, loading])

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
          {/* Filter, search, and public suggestion toggle */}
          <div className="row mb-3">
            <div className="col-12">
              <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-3">
                {/* Filter Buttons - Desktop */}
                <div className="btn-group btn-filter-group d-none d-lg-flex flex-shrink-0" role="group">
                  {['All', 'Support', 'Support If Amended', 'Oppose', 'Propose'].map(filter => (
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
                {/* Filter Dropdown - Mobile / tablet */}
                <select
                  className="form-select d-lg-none filter-select"
                  value={currentFilter}
                  onChange={(e) => setCurrentFilter(e.target.value)}
                  aria-label="Filter bills by position"
                >
                  {['All', 'Support', 'Support If Amended', 'Oppose', 'Propose'].map(filter => (
                    <option key={filter} value={filter}>
                      {filter}
                    </option>
                  ))}
                </select>
                {/* Search + suggest (inline on large screens) */}
                <div className="d-flex flex-column flex-sm-row gap-2 flex-grow-1 align-items-stretch align-items-sm-center ms-lg-auto">
                  <input
                    type="text"
                    id="billSearch"
                    className="form-control flex-grow-1"
                    style={{ minWidth: 0, maxWidth: '100%' }}
                    placeholder="Search bills..."
                    aria-label="Search bills"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`btn flex-shrink-0 text-nowrap ${showPublicBillForm ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setShowPublicBillForm((v) => !v)}
                    aria-expanded={showPublicBillForm}
                    aria-controls="public-bill-suggestion-panel"
                    id="toggle-public-bill-form"
                  >
                    {showPublicBillForm ? 'Hide form' : 'Suggest a bill or issue'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showPublicBillForm && (
            <div id="public-bill-suggestion-panel" className="mb-4">
              <PublicBillRecommendationForm onClose={() => setShowPublicBillForm(false)} />
            </div>
          )}

          {/* Results Count */}
          {!loading && filteredBills.length > 0 && (
            <p className="text-muted mb-3">
              {filteredBills.length} result{filteredBills.length !== 1 ? 's' : ''} found
            </p>
          )}

          {/* Bills Grid */}
          {loading ? (
            <div className="bills-loading text-center py-5">
              <div className="spinner-border text-secondary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading bills...</span>
              </div>
              <p className="mt-2 text-muted">Loading bills…</p>
            </div>
          ) : currentBills.length === 0 ? (
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
                    currentUser={currentUser}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
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

      {/* Edit Bill Modal */}
      {showEditModal && selectedBill && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowEditModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Bill</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowEditModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">State <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editBillForm.state}
                      onChange={(e) => setEditBillForm({ ...editBillForm, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Name/Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editBillForm.name}
                      onChange={(e) => setEditBillForm({ ...editBillForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Position <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={editBillForm.position}
                      onChange={(e) => setEditBillForm({ ...editBillForm, position: e.target.value })}
                      required
                    >
                      <option value="Support">Support</option>
                      <option value="Oppose">Oppose</option>
                      <option value="Support If Amended">Support If Amended</option>
                      <option value="Propose">Propose</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={editBillForm.description}
                      onChange={(e) => setEditBillForm({ ...editBillForm, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={editBillForm.billDate}
                      onChange={(e) => setEditBillForm({ ...editBillForm, billDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">LegiScan Link</label>
                    <input
                      type="url"
                      className="form-control"
                      value={editBillForm.legiscanLink}
                      onChange={(e) => setEditBillForm({ ...editBillForm, legiscanLink: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Proposal link (Google Doc or similar) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://docs.google.com/..."
                      value={editBillForm.googleDocLink}
                      onChange={(e) => setEditBillForm({ ...editBillForm, googleDocLink: e.target.value })}
                    />
                    <small className="text-muted">Provide a link to the proposal doc so it can be edited.</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Proposal PDF <span className="text-danger">*</span>
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            setBillError('Please upload a PDF file.')
                            return
                          }
                          setEditBillPdfFile(file)
                        }
                      }}
                    />
                    <small className="text-muted">
                      A PDF must be on file—upload if missing, or upload a new file to replace the existing one.
                    </small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Collaborators <span className="text-danger">*</span></label>
                    <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {members.length === 0 ? (
                        <p className="text-muted small mb-0">Loading members...</p>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {members.map(m => {
                            const fullName = `${m.first_name} ${m.last_name}`
                            const isSelected = editBillForm.collaborators.includes(fullName)
                            return (
                              <button
                                key={m.member_id}
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleEditBillCollaboratorToggle(m.member_id)}
                              >
                                {fullName}
                                {isSelected && <i className="bi bi-check ms-1"></i>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <small className="text-muted">Select at least one collaborator</small>
                  </div>
                  {currentUser && (currentUser.bills === true || currentUser.bills === 'true') && (
                    <div className="mb-3 form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="editBillHiddenBillsPage"
                        checked={!!editBillForm.hidden}
                        onChange={(e) => setEditBillForm({ ...editBillForm, hidden: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="editBillHiddenBillsPage">
                        Hide from public site (approved but not shown on Bills page)
                      </label>
                    </div>
                  )}
                  {billError && <div className="text-danger mt-2">{billError}</div>}
                  {billSuccess && <div className="text-success mt-2">{billSuccess}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveEditBill}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Delete Bill Confirmation Modal */}
      {showDeleteModal && selectedBill && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowDeleteModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">Delete Bill</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete <strong>{selectedBill.state} {selectedBill.name}</strong>?</p>
                  <p className="text-muted small mb-0">This will also delete the associated PDF file. This action cannot be undone.</p>
                  {billError && <div className="text-danger mt-2">{billError}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDeleteBill}
                  >
                    Delete Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}
    </div>
  )
}

export default BillsPage


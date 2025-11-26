import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import CollaboratorAvatars from './CollaboratorAvatars'
import './BillCard.css'

// Lazy load PDFViewer since it's heavy (includes PDF.js)
const PDFViewer = lazy(() => import('./PDFViewer'))

function BillCard({ bill, members, onCollaboratorClick, onKeywordExtracted, currentUser, onEdit, onDelete }) {
  const [showPDF, setShowPDF] = useState(false)
  const [extractedKeywords, setExtractedKeywords] = useState([])
  const modalRef = useRef(null)
  const [portalReady, setPortalReady] = useState(false)

  const [pdfPath, setPdfPath] = useState(null)

  // Map state abbreviations/variations to full state names for SVG files
  const getStateFileName = (state) => {
    if (!state) return 'United States'
    
    const stateMap = {
      'AL': 'Alabama',
      'AK': 'Alaska',
      'AZ': 'Arizona',
      'AR': 'Arkansas',
      'CA': 'California',
      'CO': 'Colorado',
      'CT': 'Connecticut',
      'DE': 'Delaware',
      'DC': 'District of Columbia',
      'FL': 'Florida',
      'GA': 'Georgia',
      'HI': 'Hawaii',
      'ID': 'Idaho',
      'IL': 'Illinois',
      'IN': 'Indiana',
      'IA': 'Iowa',
      'KS': 'Kansas',
      'KY': 'Kentucky',
      'LA': 'Louisiana',
      'ME': 'Maine',
      'MD': 'Maryland',
      'MA': 'Massachusetts',
      'MI': 'Michigan',
      'MN': 'Minnesota',
      'MS': 'Mississippi',
      'MO': 'Missouri',
      'MT': 'Montana',
      'NE': 'Nebraska',
      'NV': 'Nevada',
      'NH': 'New Hampshire',
      'NJ': 'New Jersey',
      'NM': 'New Mexico',
      'NY': 'New York',
      'NC': 'North Carolina',
      'ND': 'North Dakota',
      'OH': 'Ohio',
      'OK': 'Oklahoma',
      'OR': 'Oregon',
      'PA': 'Pennsylvania',
      'RI': 'Rhode Island',
      'SC': 'South Carolina',
      'SD': 'South Dakota',
      'TN': 'Tennessee',
      'TX': 'Texas',
      'UT': 'Utah',
      'VT': 'Vermont',
      'VA': 'Virginia',
      'WA': 'Washington',
      'WV': 'West Virginia',
      'WI': 'Wisconsin',
      'WY': 'Wyoming',
      'US': 'United States'
    }
    
    // Check if it's already a full state name (case-insensitive)
    const stateUpper = state.toUpperCase()
    if (stateMap[stateUpper]) {
      return stateMap[stateUpper]
    }
    
    // Check if it matches a full state name (case-insensitive)
    const fullStateNames = Object.values(stateMap)
    const matched = fullStateNames.find(name => name.toLowerCase() === state.toLowerCase())
    if (matched) {
      return matched
    }
    
    // Return original if no match found
    return state
  }
  
  const stateFileName = getStateFileName(bill.state)
  
  // Determine correct PDF path when PDF viewer opens
  // Try both formats: sanitized (new uploads) and URL-encoded (old uploads)
  useEffect(() => {
    if (showPDF && !pdfPath) {
      const getPdfPath = async () => {
        // Try sanitized format first (new uploads)
        const sanitizedName = bill.name.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedState = bill.state.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${sanitizedState}/${sanitizedName}.pdf`
        
        // Check if sanitized exists
        try {
          const response = await fetch(sanitizedPath, { method: 'HEAD' })
          if (response.ok) {
            setPdfPath(sanitizedPath)
            return
          }
        } catch {}
        
        // Fall back to original format with URL encoding (old uploads)
        const originalState = encodeURIComponent(bill.state)
        const originalName = encodeURIComponent(bill.name)
        const originalPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${originalState}/${originalName}.pdf`
        setPdfPath(originalPath)
      }
      
      getPdfPath()
    } else if (!showPDF) {
      setPdfPath(null) // Reset when closing
    }
  }, [showPDF, pdfPath, bill.name, bill.state])

  // Create modal root element on mount, keep it for the component lifecycle
  useEffect(() => {
    if (!modalRef.current) {
      modalRef.current = document.createElement('div')
      document.body.appendChild(modalRef.current)
      setPortalReady(true)
    }
    return () => {
      if (modalRef.current && document.body.contains(modalRef.current)) {
        document.body.removeChild(modalRef.current)
        modalRef.current = null
        setPortalReady(false)
      }
    }
  }, []) // Only run on mount/unmount

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showPDF) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showPDF])

  const formatDate = (date) => {
    const d = new Date(date)
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  }

  const getPositionBadge = (position) => {
    const badgeClasses = {
      "Support": "bg-success",
      "Oppose": "bg-danger",
      "Support If Amended": "bg-warning text-dark",
      "Oppose Unless Amended": "bg-warning text-dark",
    }
    const cls = badgeClasses[position] || "bg-secondary"
    return cls
  }

  const handlePDFTextExtracted = (text) => {
    // Extract keywords from PDF text (simple keyword extraction)
    // Remove common words and extract meaningful terms
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ])

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.has(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1
        return acc
      }, {})

    // Get top 10 most frequent words as keywords
    const keywords = Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)

    setExtractedKeywords(keywords)
    
    // Notify parent component of extracted keywords
    if (bill.bill_id && onKeywordExtracted) {
      onKeywordExtracted(bill.bill_id, keywords)
    }
  }

  const aosDelay = Math.min((bill.index || 0) * 80, 320)

  return (
    <div
      className="bill-card-wrapper col-12 col-sm-6 col-lg-4 mb-4"
      data-aos="fade-up"
      data-aos-duration="700"
      data-aos-delay={aosDelay}
    >
      <div className="impact-card card h-100 shadow-sm position-relative overflow-hidden">
        <div className="card-body position-relative d-flex flex-column">
          <h5 className="card-title bill-card-title">
            <span>{bill.state} {bill.name}</span>
          </h5>
          <span className={`badge ${getPositionBadge(bill.position)} mb-2`}>
            {bill.position}
          </span>
          <p className="card-text bill-card-description">{bill.description}</p>
          <p className="text-muted small mb-3">{formatDate(bill.bill_date)}</p>

          {/* PDF and Collaborator Section */}
          {bill.pdfExists && (
            <div className="bill-card-actions">
              <button
                className="btn btn-outline-dark btn-sm"
                onClick={() => setShowPDF(!showPDF)}
                style={{ whiteSpace: 'nowrap' }}
              >
                <i className="bi bi-file-pdf"></i> {showPDF ? 'Hide' : 'View'}
              </button>
              {bill.bill_collaborators && bill.bill_collaborators.length > 0 && (
                <CollaboratorAvatars
                  collaborators={bill.bill_collaborators}
                  members={members}
                  billIndex={bill.index}
                  onCollaboratorClick={onCollaboratorClick}
                />
              )}
            </div>
          )}

          {/* Executive Director Actions */}
          {currentUser && (currentUser.is_executive_director === true || currentUser.is_executive_director === 'true') && (
            <div className="mt-3 pt-3 border-top d-flex gap-2">
              <button
                className="btn btn-outline-primary btn-sm flex-fill"
                onClick={() => onEdit && onEdit(bill)}
              >
                <i className="bi bi-pencil me-1"></i>Edit
              </button>
              <button
                className="btn btn-outline-danger btn-sm flex-fill"
                onClick={() => onDelete && onDelete(bill)}
              >
                <i className="bi bi-trash me-1"></i>Delete
              </button>
            </div>
          )}

          {/* PDF Viewer Modal - rendered via portal to prevent flashing */}
          {showPDF && portalReady && modalRef.current && createPortal(
            <>
              {/* Backdrop */}
              <div 
                className="modal-backdrop fade show bill-modal-backdrop"
                style={{ 
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1040,
                  backgroundColor: 'rgba(0,0,0,0.5)'
                }}
                onClick={() => setShowPDF(false)}
              />
              {/* Modal */}
              <div 
                className="modal fade show d-block bill-modal" 
                style={{ 
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1050,
                  display: 'block',
                  overflow: 'auto'
                }} 
                tabIndex="-1"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdfModalTitle"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowPDF(false)
                  }
                }}
              >
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h5 className="modal-title" id="pdfModalTitle">
                        {bill.state} {bill.name} - Proposal PDF
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setShowPDF(false)}
                        aria-label="Close"
                      ></button>
                    </div>
                    <div className="modal-body">
                      {pdfPath ? (
                        <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading PDF...</span></div></div>}>
                          <PDFViewer url={pdfPath} onTextExtracted={handlePDFTextExtracted} />
                        </Suspense>
                      ) : (
                        <div className="text-center p-5">
                          <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading PDF...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>,
            modalRef.current
          )}

          {/* State Flag Link */}
          <a
            href={bill.legiscan_link}
            target="_blank"
            rel="noopener"
            aria-label="View full bill on LegiScan"
            className="state-flag-link"
          >
            <img
              className="state-image"
              src={`/images/states/${stateFileName}.svg`}
              alt={`${bill.state} flag`}
              onError={(e) => {
                // Fallback to United States if state SVG not found
                e.target.src = '/images/states/United States.svg'
              }}
            />
          </a>
        </div>
      </div>
    </div>
  )
}

export default BillCard


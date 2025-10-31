import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import PDFViewer from './PDFViewer'
import CollaboratorAvatars from './CollaboratorAvatars'
import './BillCard.css'

function BillCard({ bill, members, onCollaboratorClick, onKeywordExtracted }) {
  const [showPDF, setShowPDF] = useState(false)
  const [extractedKeywords, setExtractedKeywords] = useState([])
  const modalRef = useRef(null)
  const [portalReady, setPortalReady] = useState(false)

  const pdfPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${bill.state}/${bill.name}.pdf`

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

  return (
    <div className="col-md-3 mb-4">
      <div className="impact-card card h-100 shadow-sm position-relative overflow-hidden">
        <div className="card-body position-relative">
          <h5 className="card-title bill-card-title">
            <span>{bill.state} {bill.name}</span>
          </h5>
          <span className={`badge ${getPositionBadge(bill.position)} mb-2`}>
            {bill.position}
          </span>
          <p className="card-text">{bill.description}</p>
          <p className="text-muted small mb-2">{formatDate(bill.bill_date)}</p>

          {/* PDF and Collaborator Section */}
          {bill.pdfExists && (
            <div className="d-flex justify-content-between align-items-center mb-2">
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

          {/* PDF Viewer Modal - rendered via portal to prevent flashing */}
          {showPDF && portalReady && modalRef.current && createPortal(
            <>
              {/* Backdrop */}
              <div 
                className="modal-backdrop fade show"
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
                className="modal fade show d-block" 
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
                      <PDFViewer url={pdfPath} onTextExtracted={handlePDFTextExtracted} />
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
              src={`/assets/images/states/${bill.state}.svg`}
              alt={`${bill.state} flag`}
            />
          </a>
        </div>
      </div>
    </div>
  )
}

export default BillCard


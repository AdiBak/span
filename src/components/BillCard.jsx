import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import CollaboratorAvatars from './CollaboratorAvatars'
import BillStatusTimeline from './BillStatusTimeline'
import { fetchBillStatus } from '../lib/legiscan'
import './BillCard.css'

// Lazy load PDFViewer since it's heavy (includes PDF.js)
const PDFViewer = lazy(() => import('./PDFViewer'))

function BillCard({ bill, members, onCollaboratorClick, onKeywordExtracted, currentUser, onEdit, onDelete }) {
  const [showPDF, setShowPDF] = useState(false)
  const [extractedKeywords, setExtractedKeywords] = useState([])
  const modalRef = useRef(null)
  const [portalReady, setPortalReady] = useState(false)
  const [pdfPath, setPdfPath] = useState(null)

  // Status info popover (small 'i' on public bill cards)
  const [showStatusPopover, setShowStatusPopover] = useState(false)
  const statusPopoverRef = useRef(null)
  const [legiscanInfo, setLegiscanInfo] = useState(null) // null | { status, lastAction, statusDate, timeline } | 'loading' | 'error'

  // Map state abbreviations/variations to full state names for SVG files
  const getStateFileName = (state) => {
    if (!state) return 'United States'
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
      'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
      'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
      'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
      'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
      'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
      'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
      'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming', 'US': 'United States'
    }

    const stateUpper = state.toUpperCase()
    if (stateMap[stateUpper]) {
      return stateMap[stateUpper]
    }

    const fullStateNames = Object.values(stateMap)
    const matched = fullStateNames.find(name => name.toLowerCase() === state.toLowerCase())
    if (matched) {
      return matched
    }
    return state
  }

  const stateFileName = getStateFileName(bill.state)

  useEffect(() => {
    if (showPDF && !pdfPath) {
      const getPdfPath = async () => {
        const sanitizedName = bill.name.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedState = bill.state.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${sanitizedState}/${sanitizedName}.pdf`

        try {
          const response = await fetch(sanitizedPath, { method: 'HEAD' })
          if (response.ok) {
            setPdfPath(sanitizedPath)
            return
          }
        } catch {}

        const originalState = encodeURIComponent(bill.state)
        const originalName = encodeURIComponent(bill.name)
        const originalPath = `https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/${originalState}/${originalName}.pdf`
        setPdfPath(originalPath)
      }
      getPdfPath()
    } else if (!showPDF) {
      setPdfPath(null)
    }
  }, [showPDF, pdfPath, bill.name, bill.state])

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
  }, [])

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

  useEffect(() => {
    if (!showStatusPopover) return
    if (!bill?.state || !bill?.name) {
      setLegiscanInfo(null)
      return
    }
    setLegiscanInfo('loading')
    fetchBillStatus(bill)
      .then((result) => {
        setLegiscanInfo(result === 'error' ? 'error' : result)
      })
      .catch(() => setLegiscanInfo('error'))
  }, [showStatusPopover, bill?.state, bill?.name, bill?.legiscan_link])

  useEffect(() => {
    if (!showStatusPopover) return
    const handleClick = (e) => {
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(e.target)) {
        setShowStatusPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showStatusPopover])

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
      "Propose": "bg-info",
    }
    const cls = badgeClasses[position] || "bg-secondary"
    return cls
  }

  const handlePDFTextExtracted = (text) => {
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

    const keywords = Object.entries(words)
      .sort((a, b) => b[5] - a[5])
      .slice(0, 10)
      .map(([word]) => word)

    setExtractedKeywords(keywords)

    if (bill.bill_id && onKeywordExtracted) {
      onKeywordExtracted(bill.bill_id, keywords)
    }
  }

  const aosDelay = Math.min((bill.index || 0) * 80, 320)

  return (
    <div
      className="bill-card-wrapper col-12 col-sm-6 col-lg-4"
      data-aos="fade-up"
      data-aos-duration="700"
      data-aos-delay={aosDelay}
      style={{ zIndex: showStatusPopover ? 100 : 1, position: 'relative' }}
    >
      {/* Added the overflow style here to override any stubborn CSS files */}
      <div className="impact-card card h-100 shadow-sm position-relative" style={{ overflow: 'visible' }}>
        <div className="card-body position-relative d-flex flex-column">
          <div ref={statusPopoverRef} className="bill-status-info-area">
            <h5 className="card-title bill-card-title d-flex align-items-center gap-1">
              <span className="text-truncate">{bill.state} {bill.name}</span>
              <button
                type="button"
                className="bill-status-info-btn flex-shrink-0"
                onClick={() => setShowStatusPopover(!showStatusPopover)}
                aria-label="More info on bill status"
                title="Bill status info"
              >
                <i className="bi bi-info-circle" aria-hidden="true"></i>
              </button>
            </h5>

            {showStatusPopover && (
              <div className="bill-status-popover-wrapper">
                <div className="bill-status-popover" style={{ width: 'max-content', maxWidth: '90vw', minWidth: '400px' }}>
                  <div className="small mb-2 fw-semibold">Bill status</div>
                  <p className="small mb-1"><strong>SPAN position:</strong> {bill.position}</p>
                  <p className="small mb-1"><strong>Bill date:</strong> {formatDate(bill.bill_date)}</p>

                  {bill.legiscan_link && (
                    <p className="small mb-2">
                      <a href={bill.legiscan_link} target="_blank" rel="noopener noreferrer">View on LegiScan</a>
                    </p>
                  )}
                  {bill.google_doc_link && (
                    <p className="small mb-2">
                      <a href={bill.google_doc_link} target="_blank" rel="noopener noreferrer">View proposal (Google Doc)</a>
                    </p>
                  )}

                  {legiscanInfo === 'loading' && (
                    <p className="small text-muted mb-0">Loading LegiScan status…</p>
                  )}

                  {legiscanInfo === 'error' && (
                    <p className="small text-muted mb-0">Status unavailable from LegiScan.</p>
                  )}

                  {legiscanInfo && typeof legiscanInfo === 'object' && (
                    <>
                      {legiscanInfo.timeline && legiscanInfo.timeline.length > 0 ? (
                        <BillStatusTimeline stages={legiscanInfo.timeline} />
                      ) : (
                        <>
                          {legiscanInfo.status && (
                            <p className="small mb-1"><strong>LegiScan status:</strong> {legiscanInfo.status}</p>
                          )}
                          {legiscanInfo.lastAction && (
                            <p className="small mb-1"><strong>Last action:</strong> {legiscanInfo.lastAction}</p>
                          )}
                          {legiscanInfo.statusDate && (
                            <p className="small mb-0 text-muted"><strong>Date:</strong> {legiscanInfo.statusDate}</p>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <span className={`badge ${getPositionBadge(bill.position)} mb-2`}>
            {bill.position}
          </span>
          <p className="card-text bill-card-description">{bill.description}</p>
          <p className="text-muted small mb-3">{formatDate(bill.bill_date)}</p>

          {/* PDF / Proposal link and Collaborator Section */}
          {(bill.pdfExists || bill.google_doc_link) && (
            <div className="bill-card-actions">
              {bill.pdfExists && (
                <button
                  className="btn btn-outline-dark btn-sm"
                  onClick={() => setShowPDF(!showPDF)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <i className="bi bi-file-pdf"></i> {showPDF ? 'Hide' : 'View'}
                </button>
              )}
              {bill.google_doc_link && (
                <a
                  href={bill.google_doc_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-secondary btn-sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <i className="bi bi-link-45deg"></i> Proposal (Google Doc)
                </a>
              )}

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

          {/* Bill Management Actions */}
          {currentUser && (currentUser.bills === true || currentUser.bills === 'true') && (
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

          {/* State Flag (link to LegiScan when URL is set) */}
          {bill.legiscan_link ? (
            <a
              href={bill.legiscan_link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View full bill on LegiScan"
              className="state-flag-link"
            >
              <img
                className="state-image"
                src={`/images/states/${stateFileName}.svg`}
                alt={`${bill.state} flag`}
                onError={(e) => {
                  e.target.src = '/images/states/United States.svg'
                }}
              />
            </a>
          ) : (
            <span className="state-flag-link">
              <img
                className="state-image"
                src={`/images/states/${stateFileName}.svg`}
                alt={`${bill.state} flag`}
                onError={(e) => {
                  e.target.src = '/images/states/United States.svg'
                }}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default BillCard
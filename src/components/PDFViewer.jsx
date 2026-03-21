import React, { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  // Use CDN URL for the worker - use the version from react-pdf's pdfjs instance
  // This ensures the worker version matches the API version
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.25

function PDFViewer({ url, onTextExtracted, embedded = false }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(embedded ? 1 : 1.25)
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef({})
  const skipUrlResetRef = useRef(true)

  useEffect(() => {
    if (skipUrlResetRef.current) {
      skipUrlResetRef.current = false
      return
    }
    setScale(embedded ? 1 : 1.25)
    setPageNumber(1)
    setNumPages(null)
    setLoading(true)
    setError(null)
  }, [url, embedded])

  // Extract text from visible page only (memory-efficient)
  useEffect(() => {
    if (numPages && pageNumber && url && onTextExtracted) {
      // Extract text only from the currently visible page
      // This prevents memory issues with large PDFs
      extractTextFromVisiblePage(url, pageNumber).then(text => {
        if (text) {
          // Only send keywords if we have meaningful text
          onTextExtracted(text)
        }
      }).catch(err => {
        console.warn('Text extraction failed for page', pageNumber, err)
        // Don't fail the viewer if extraction fails
      })
    }
  }, [pageNumber, numPages, url, onTextExtracted])

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages)
    setLoading(false)
  }

  function onDocumentLoadError(error) {
    setError(error.message)
    setLoading(false)
  }

  function goToPrevPage() {
    const newPage = Math.max(1, pageNumber - 1)
    setPageNumber(newPage)
    scrollToPage(newPage)
  }

  function goToNextPage() {
    const newPage = Math.min(numPages, pageNumber + 1)
    setPageNumber(newPage)
    scrollToPage(newPage)
  }

  function scrollToPage(pageNum) {
    const pageElement = pageRefs.current[pageNum]
    if (pageElement && scrollContainerRef.current) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Track which page is currently visible while scrolling
  useEffect(() => {
    if (!scrollContainerRef.current || !numPages) return

    const container = scrollContainerRef.current
    let scrollTimeout = null

    const handleScroll = () => {
      // Debounce scroll events for better performance
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop
        const containerHeight = container.clientHeight
        const viewportCenter = scrollTop + containerHeight / 2

        // Find the page closest to the viewport center
        let closestPage = 1
        let closestDistance = Infinity

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const pageElement = pageRefs.current[pageNum]
          if (!pageElement) continue

          // Get page position relative to container
          const pageTop = pageElement.offsetTop
          const pageHeight = pageElement.offsetHeight
          const pageCenter = pageTop + pageHeight / 2

          // Calculate distance from viewport center
          const distance = Math.abs(pageCenter - viewportCenter)
          
          if (distance < closestDistance) {
            closestDistance = distance
            closestPage = pageNum
          }
        }

        // Update page number if it changed
        setPageNumber(prevPage => {
          if (prevPage !== closestPage && closestPage >= 1 && closestPage <= numPages) {
            return closestPage
          }
          return prevPage
        })
      }, 100) // Debounce by 100ms
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) clearTimeout(scrollTimeout)
    }
  }, [numPages])

  // Extract text from only the visible page (memory-efficient)
  async function extractTextFromVisiblePage(pdfUrl, pageNum) {
    try {
      const loadingTask = pdfjs.getDocument({ 
        url: pdfUrl,
        disableAutoFetch: true,
        disableStream: true
      })
      const pdf = await loadingTask.promise

      // Only extract from the current page to avoid memory issues
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(' ')

      // Clean up resources
      page.cleanup?.()
      pdf.destroy?.()

      return pageText.trim()
    } catch (err) {
      console.error('Error extracting text from page:', err)
      return null
    }
  }

  const contentMaxHeight = embedded ? 'min(52vh, 520px)' : '80vh'

  function zoomOut() {
    setScale((s) => Math.max(ZOOM_MIN, Math.round((s - ZOOM_STEP) * 100) / 100))
  }

  function zoomIn() {
    setScale((s) => Math.min(ZOOM_MAX, Math.round((s + ZOOM_STEP) * 100) / 100))
  }

  function zoomReset() {
    setScale(1)
  }

  return (
    <div className="pdf-viewer-container">
      <div
        className="pdf-viewer-toolbar mb-2 py-1 px-2 mx-auto bg-light border rounded"
        style={{ maxWidth: embedded ? '100%' : '960px' }}
      >
        <div
          className="d-flex flex-nowrap align-items-center justify-content-center gap-1"
          style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <button
              type="button"
              className="btn btn-outline-dark btn-sm"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <i className="bi bi-chevron-left"></i> Previous
            </button>
            <span className="small text-nowrap px-1">
              Page {pageNumber} of {numPages || '…'}
            </span>
            <button
              type="button"
              className="btn btn-outline-dark btn-sm"
              onClick={goToNextPage}
              disabled={!numPages || pageNumber >= numPages}
            >
              Next <i className="bi bi-chevron-right"></i>
            </button>
          </div>
          <span className="text-muted user-select-none flex-shrink-0" aria-hidden="true" style={{ fontSize: '0.75rem' }}>
            |
          </span>
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            <span className="small text-muted d-none d-md-inline me-1"></span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={zoomOut}
              disabled={scale <= ZOOM_MIN}
              title="Zoom out"
            >
              <i className="bi bi-zoom-out"></i>
            </button>
            <span className="small text-nowrap px-0" style={{ minWidth: '2.75rem', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={zoomIn}
              disabled={scale >= ZOOM_MAX}
              title="Zoom in"
            >
              <i className="bi bi-zoom-in"></i>
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={zoomReset} title="Reset zoom">
              Reset
            </button>
          </div>
          <span className="text-muted user-select-none flex-shrink-0" aria-hidden="true" style={{ fontSize: '0.75rem' }}>
            |
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-dark btn-sm flex-shrink-0"
            download
            title="Download PDF"
            aria-label="Download PDF"
          >
            <i className="bi bi-download" aria-hidden="true"></i>
          </a>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading PDF...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          Error loading PDF: {error}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="pdf-viewer-wrapper"
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '0.375rem',
          overflow: 'auto',
          maxHeight: contentMaxHeight,
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          gap: '1rem',
        }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="text-center py-5">
              <div className="spinner-border text-secondary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          }
        >
          {numPages && Array.from(new Array(numPages), (el, index) => {
            const pageNum = index + 1
            return (
              <div
                key={`page_${pageNum}`}
                ref={(el) => {
                  if (el) pageRefs.current[pageNum] = el
                }}
                style={{
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="pdf-page"
                />
              </div>
            )
          })}
        </Document>
      </div>
    </div>
  )
}

export default PDFViewer


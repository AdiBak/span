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

function PDFViewer({ url, onTextExtracted }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef({})

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

  return (
    <div className="pdf-viewer-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button
            className="btn btn-outline-dark btn-sm me-2"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <i className="bi bi-chevron-left"></i> Previous
          </button>
          <span className="mx-2">
            Page {pageNumber} of {numPages || '...'}
          </span>
          <button
            className="btn btn-outline-dark btn-sm ms-2"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            Next <i className="bi bi-chevron-right"></i>
          </button>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-dark btn-sm"
        >
          <i className="bi bi-download"></i> Download PDF
        </a>
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
          maxHeight: '80vh',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem',
          gap: '1rem'
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
                  width={1200}
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


import React, { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'

// Set up PDF.js worker - use local file to avoid CDN/CORS issues
if (typeof window !== 'undefined') {
  // Use the worker file from public directory (copied from react-pdf's pdfjs-dist)
  // This ensures version match and avoids CDN issues
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
}

function PDFViewer({ url, onTextExtracted }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    setPageNumber(prev => Math.max(1, prev - 1))
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(numPages, prev + 1))
  }

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

      <div className="pdf-viewer-wrapper" style={{ 
        border: '1px solid #dee2e6', 
        borderRadius: '0.375rem',
        overflow: 'auto',
        maxHeight: '80vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '1rem'
      }}>
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
          <Page
            pageNumber={pageNumber}
            width={1200}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="pdf-page"
          />
        </Document>
      </div>
    </div>
  )
}

export default PDFViewer


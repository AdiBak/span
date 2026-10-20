import React, { lazy, Suspense } from 'react'

const PDFViewer = lazy(() => import('../../components/PDFViewer'))

export default function BillPdfPreviewModal({ bill, onClose, getBillPdfUrl }) {
  if (!bill) return null

  const pdfUrl = typeof getBillPdfUrl === 'function' ? getBillPdfUrl(bill) : null

  return (
    <>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} onClick={() => onClose()}>
        <div
          className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {bill.state} {bill.name} – Proposal PDF
              </h5>
              <div className="d-flex align-items-center gap-2">
                {pdfUrl && (
                  <a
                    className="btn btn-sm btn-outline-secondary"
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-box-arrow-up-right me-1"></i>Open in new tab
                  </a>
                )}
                <button type="button" className="btn-close" onClick={() => onClose()} aria-label="Close" />
              </div>
            </div>
            <div className="modal-body">
              <Suspense
                fallback={
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading PDF...</span>
                    </div>
                  </div>
                }
              >
                <PDFViewer url={pdfUrl} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} />
    </>
  )
}

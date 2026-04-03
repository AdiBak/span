import React, { lazy, Suspense } from 'react'

const PDFViewer = lazy(() => import('../../components/PDFViewer'))

export default function BillPdfPreviewModal({ bill, onClose, getBillPdfUrl }) {
  if (!bill) return null

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
              <button type="button" className="btn-close" onClick={() => onClose()} aria-label="Close" />
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
                <PDFViewer url={getBillPdfUrl(bill)} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1055 }} />
    </>
  )
}

import React, { Suspense, lazy } from 'react'
import { googleDocToPreviewEmbedUrl } from '../lib/googleDocsEmbed'

const PDFViewer = lazy(() => import('./PDFViewer'))

/**
 * Full SPAN proposal body for Research / Compare (metadata + proposal doc/PDF).
 * @param {'two-column' | 'stacked'} layout - stacked fits narrow compare panes
 */
export default function SpanResearchBillDetail({
  bill,
  submitterName,
  getBillPdfUrl,
  layout = 'two-column',
}) {
  const collaborators = Array.isArray(bill.bill_collaborators)
    ? bill.bill_collaborators
    : typeof bill.bill_collaborators === 'string'
      ? [bill.bill_collaborators]
      : []

  const pdfUrl = getBillPdfUrl(bill)
  const showPdf = !!(bill.pdfExists && pdfUrl)
  const embedUrl = googleDocToPreviewEmbedUrl(bill.google_doc_link || '')

  let proposalColumn
  if (showPdf) {
    proposalColumn = (
      <div className="mb-2">
        <strong>Proposal PDF</strong>
        {bill.google_doc_link && (
          <p className="small text-muted mt-1 mb-2">
            <a href={bill.google_doc_link} target="_blank" rel="noopener noreferrer">
              Open Google Doc instead
            </a>
          </p>
        )}
        <div className="border rounded mt-1 bg-secondary bg-opacity-10">
          <Suspense
            fallback={
              <div className="text-center py-5">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
              </div>
            }
          >
            <PDFViewer url={pdfUrl} embedded />
          </Suspense>
        </div>
      </div>
    )
  } else if (embedUrl) {
    proposalColumn = (
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <strong>Proposal (Google Doc)</strong>
          {bill.google_doc_link && (
            <a href={bill.google_doc_link} target="_blank" rel="noopener noreferrer" className="small">
              Open in new tab
            </a>
          )}
        </div>
        <div
          className="border rounded overflow-hidden bg-light"
          style={{ minHeight: '280px', height: 'min(40vh, 380px)' }}
        >
          <iframe
            title={`Google Doc ${bill.bill_id}`}
            src={embedUrl}
            className="w-100 h-100 border-0"
            style={{ minHeight: '280px', height: 'min(40vh, 380px)' }}
            allow="clipboard-read; clipboard-write"
          />
        </div>
        <p className="small text-muted mt-1 mb-0">
          If the embed is blank, the doc may be restricted — use &quot;Open in new tab&quot; (you must be signed into Google
          with access).
        </p>
      </div>
    )
  } else if (bill.google_doc_link) {
    proposalColumn = (
      <div className="mb-3">
        <strong>Proposal link</strong>
        <p className="mb-1">
          <a href={bill.google_doc_link} target="_blank" rel="noopener noreferrer">
            {bill.google_doc_link}
          </a>
        </p>
        <p className="small text-muted mb-0">
          This link is not a standard Google Doc URL we can embed here. No PDF found in storage.
        </p>
      </div>
    )
  } else {
    proposalColumn = <p className="text-muted small mb-0">No linked proposal document or PDF in storage for this row.</p>
  }

  const metaColumn = (
    <>
      <div className="mb-2">
        <strong>SPAN position</strong>
        <p className="mb-0 mt-1">{bill.position || '—'}</p>
      </div>
      {collaborators.length > 0 && (
        <div className="mb-2">
          <strong>Collaborators</strong>
          <p className="mb-0 mt-1">{collaborators.join(', ')}</p>
        </div>
      )}
      {submitterName?.(bill.submitted_by) && (
        <div className="mb-2">
          <strong>Submitted by</strong>
          <p className="mb-0 mt-1">{submitterName(bill.submitted_by)}</p>
        </div>
      )}
      <div className="mb-2">
        <strong>Description</strong>
        <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
          {bill.description || '—'}
        </p>
      </div>
      {bill.legiscan_link && (
        <div className="mb-2">
          <a
            href={bill.legiscan_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-secondary"
          >
            <i className="bi bi-box-arrow-up-right me-1"></i>
            Open LegiScan / legislature link
          </a>
        </div>
      )}
    </>
  )

  if (layout === 'stacked') {
    return (
      <div className="span-research-bill-detail">
        {metaColumn}
        {proposalColumn}
      </div>
    )
  }

  return (
    <div className="row g-3 span-research-bill-detail">
      <div className="col-lg-5">{metaColumn}</div>
      <div className="col-lg-7">{proposalColumn}</div>
    </div>
  )
}

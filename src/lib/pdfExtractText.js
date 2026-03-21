import { pdfjs } from 'react-pdf'

/**
 * Extract all text from a PDF URL (blob: or http(s):) using pdf.js.
 * Scanned PDFs may return little or no text.
 */
export async function extractFullPdfText(url) {
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  }
  const loadingTask = pdfjs.getDocument({ url, verbosity: 0 })
  const pdf = await loadingTask.promise
  try {
    const chunks = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const tc = await page.getTextContent()
      const pageText = tc.items.map((item) => (item && 'str' in item ? item.str : '')).join(' ')
      chunks.push(pageText.trim())
      page.cleanup?.()
    }
    return chunks.filter(Boolean).join('\n\n')
  } finally {
    pdf.destroy?.()
  }
}

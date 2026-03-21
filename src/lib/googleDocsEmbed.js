/**
 * Build an embeddable Google Docs / Sheets URL when possible.
 * Many sharing links can be converted to /preview for iframes.
 * @param {string} url
 * @returns {string|null} embed URL or null if not a known Google format
 */
export function googleDocToPreviewEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  try {
    const u = new URL(trimmed)
    if (!u.hostname.includes('docs.google.com')) return null
    const docMatch = u.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
    if (docMatch) {
      return `https://docs.google.com/document/d/${docMatch[1]}/preview?embedded=true`
    }
    const sheetMatch = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
    if (sheetMatch) {
      return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview?embedded=true&widget=true&headers=false`
    }
  } catch {
    return null
  }
  return null
}

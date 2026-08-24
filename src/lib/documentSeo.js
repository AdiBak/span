/**
 * Client-side document SEO helpers (SPA pages).
 * Updates title / description / canonical / Open Graph for crawlers that execute JS.
 */

const SITE = 'https://spanationwide.org'

function ensureMeta(attr, key, content) {
  if (content == null || content === '') return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function ensureLink(rel, href) {
  if (!href) return
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function ensureJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return SITE
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE}${path}`
}

/**
 * @param {{
 *   title?: string
 *   description?: string
 *   canonicalPath?: string
 *   image?: string
 *   type?: 'website' | 'article'
 *   jsonLdId?: string
 *   jsonLd?: object | null
 * }} opts
 */
export function setPageSeo(opts = {}) {
  const {
    title,
    description,
    canonicalPath,
    image,
    type = 'website',
    jsonLdId = 'span-page-jsonld',
    jsonLd = null,
  } = opts

  if (title) document.title = title
  if (description) {
    ensureMeta('name', 'description', description)
    ensureMeta('property', 'og:description', description)
    ensureMeta('name', 'twitter:description', description)
  }
  if (title) {
    ensureMeta('property', 'og:title', title)
    ensureMeta('name', 'twitter:title', title)
  }

  const canonical = canonicalPath ? absoluteUrl(canonicalPath) : null
  if (canonical) {
    ensureLink('canonical', canonical)
    ensureMeta('property', 'og:url', canonical)
  }

  ensureMeta('property', 'og:type', type)
  ensureMeta('property', 'og:site_name', 'SPAN')

  if (image) {
    const img = absoluteUrl(image)
    ensureMeta('property', 'og:image', img)
    ensureMeta('name', 'twitter:image', img)
  }

  if (jsonLd) {
    ensureJsonLd(jsonLdId, jsonLd)
  } else if (jsonLd === null && jsonLdId) {
    const existing = document.getElementById(jsonLdId)
    if (existing) existing.remove()
  }
}

/** Build a plain-text description from HTML content. */
export function descriptionFromHtml(html, maxLen = 160) {
  const text = stripHtml(html)
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1).trim()}…`
}

export { SITE as SEO_SITE_ORIGIN }

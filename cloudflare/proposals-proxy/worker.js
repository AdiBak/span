/**
 * Proxies https://spanationwide.org/proposals/* → Supabase public proposals bucket.
 *
 * Deploy (from this folder, with wrangler logged in):
 *   npx wrangler deploy
 *
 * Or paste into Cloudflare Dashboard → Workers → Create → edit code, then
 * Workers Routes: spanationwide.org/proposals/* and www.spanationwide.org/proposals/*
 */

const STORAGE_BASE =
  'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals'

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    // Expect /proposals/<state>/<file.pdf> (optional trailing query)
    const match = url.pathname.match(/^\/proposals\/(.+)$/)
    if (!match) {
      return new Response('Not Found', { status: 404 })
    }

    let path = match[1]
    try {
      path = decodeURIComponent(path)
    } catch {
      return new Response('Bad Request', { status: 400 })
    }

    // Block path traversal and empty segments
    if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      return new Response('Bad Request', { status: 400 })
    }

    const segments = path.split('/').filter(Boolean)
    if (segments.length < 1 || segments.length > 4) {
      return new Response('Bad Request', { status: 400 })
    }
    if (!segments[segments.length - 1].toLowerCase().endsWith('.pdf')) {
      return new Response('Not Found', { status: 404 })
    }

    const encodedPath = segments.map((s) => encodeURIComponent(s)).join('/')
    const originUrl = `${STORAGE_BASE}/${encodedPath}`

    const upstream = await fetch(originUrl, {
      method: request.method,
      headers: {
        // Forward range requests for PDF viewers
        ...(request.headers.get('Range') ? { Range: request.headers.get('Range') } : {}),
      },
    })

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(upstream.status === 404 ? 'Not Found' : 'Bad Gateway', {
        status: upstream.status === 404 ? 404 : 502,
      })
    }

    const headers = new Headers()
    const contentType = upstream.headers.get('Content-Type') || 'application/pdf'
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
    const contentLength = upstream.headers.get('Content-Length')
    if (contentLength) headers.set('Content-Length', contentLength)
    const contentRange = upstream.headers.get('Content-Range')
    if (contentRange) headers.set('Content-Range', contentRange)
    const acceptRanges = upstream.headers.get('Accept-Ranges')
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges)
    headers.set('Access-Control-Allow-Origin', '*')

    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers,
    })
  },
}

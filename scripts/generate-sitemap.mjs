/**
 * Regenerates sitemap.xml (repo root + assets/) from static pages + Medium archive
 * + public proposal PDF URLs (same-origin /proposals/… when Supabase env is set).
 * Run: node scripts/generate-sitemap.mjs
 * Also runs before `vite build`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SITE = 'https://spanationwide.org'
const STORAGE_PREFIX =
  'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/proposals/'
const today = new Date().toISOString().slice(0, 10)

/** Mirror of src/lib/proposalPdf.js toPublicProposalUrl (Node-safe, no Vite imports). */
function toPublicProposalUrl(urlOrPath) {
  const raw = String(urlOrPath || '').trim()
  if (!raw || raw.includes('..')) return null
  let path = raw
  if (path.startsWith(`${SITE}/proposals/`)) path = path.slice(`${SITE}/proposals/`.length)
  else if (path.startsWith(STORAGE_PREFIX)) path = path.slice(STORAGE_PREFIX.length)
  else if (path.startsWith('/proposals/')) path = path.slice('/proposals/'.length)
  else if (/^https?:\/\//i.test(path)) return null
  else return null
  path = path.split('?')[0].split('#')[0].replace(/^\/+/, '')
  if (!path || path.includes('..')) return null
  return `${SITE}/proposals/${path.split('/').map(encodeURIComponent).join('/')}`
}

// Public discovery pages only — directory (member emails/PII) is noindex + robots Disallow.
const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/bills.html', priority: '0.9', changefreq: 'weekly' },
  { path: '/policy-briefs.html', priority: '0.8', changefreq: 'weekly' },
  { path: '/our-story.html', priority: '0.9', changefreq: 'monthly' },
]

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

/** Pull approved public bills' proposal PDF URLs for crawl discovery. */
async function fetchPublicProposalPdfUrls() {
  const base = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
    .trim()
    .replace(/\/$/, '')
  const key = String(
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  ).trim()
  if (!base || !key) {
    console.warn('sitemap: no Supabase env — skipping proposal PDF URLs')
    return []
  }

  try {
    const res = await fetch(`${base}/rest/v1/rpc/get_public_bills`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: '{}',
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      console.warn('sitemap: get_public_bills failed', res.status, await res.text())
      return []
    }
    const bills = await res.json()
    if (!Array.isArray(bills)) return []

    const locs = new Set()
    for (const bill of bills) {
      const raw = String(bill?.proposal_pdf_url || '').trim()
      if (!raw) {
        // Fall back to canonical same-origin path when URL not stored yet
        const st = String(bill?.state || '')
          .trim()
          .replace(/[^a-zA-Z0-9]/g, '_')
        const nm = String(bill?.name || '')
          .trim()
          .replace(/[^a-zA-Z0-9]/g, '_')
        if (st && nm) locs.add(`${SITE}/proposals/${st}/${nm}.pdf`)
        continue
      }
      const publicUrl = toPublicProposalUrl(raw)
      if (publicUrl && publicUrl.startsWith(`${SITE}/proposals/`)) locs.add(publicUrl)
    }
    return Array.from(locs)
  } catch (err) {
    console.warn('sitemap: proposal PDF fetch error', err?.message || err)
    return []
  }
}

const archive = JSON.parse(readFileSync(join(root, 'src/data/mediumBlogArchive.json'), 'utf8'))

const blogUrls = (Array.isArray(archive) ? archive : []).map((item) => {
  const id = item.guid || item.link
  const pub = String(item.pubDate || '').slice(0, 10) || today
  return urlEntry({
    loc: `${SITE}/policy-brief.html?id=${encodeURIComponent(id)}`,
    lastmod: pub,
    changefreq: 'monthly',
    priority: '0.7',
  })
})

const staticUrls = staticPages.map((p) =>
  urlEntry({
    loc: `${SITE}${p.path === '/' ? '/' : p.path}`,
    lastmod: today,
    changefreq: p.changefreq,
    priority: p.priority,
  }),
)

const proposalPdfLocs = await fetchPublicProposalPdfUrls()
const proposalUrls = proposalPdfLocs.map((loc) =>
  urlEntry({
    loc,
    lastmod: today,
    changefreq: 'monthly',
    priority: '0.6',
  }),
)
console.log(`sitemap: ${proposalUrls.length} proposal PDF URL(s)`)

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...blogUrls, ...proposalUrls].join('\n')}
</urlset>
`

for (const out of [join(root, 'sitemap.xml'), join(root, 'assets', 'sitemap.xml')]) {
  writeFileSync(out, xml, 'utf8')
  console.log('Wrote', out)
}

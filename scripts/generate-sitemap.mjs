/**
 * Regenerates sitemap.xml (repo root + assets/) from static pages + Medium archive.
 * Run: node scripts/generate-sitemap.mjs
 * Also runs before `vite build`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SITE = 'https://spanationwide.org'
const today = new Date().toISOString().slice(0, 10)

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/bills.html', priority: '0.9', changefreq: 'weekly' },
  { path: '/blog.html', priority: '0.8', changefreq: 'weekly' },
  { path: '/directory.html', priority: '0.7', changefreq: 'weekly' },
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

const archive = JSON.parse(readFileSync(join(root, 'src/data/mediumBlogArchive.json'), 'utf8'))

const blogUrls = (Array.isArray(archive) ? archive : []).map((item) => {
  const id = item.guid || item.link
  const pub = String(item.pubDate || '').slice(0, 10) || today
  return urlEntry({
    loc: `${SITE}/blog-post.html?id=${encodeURIComponent(id)}`,
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

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...blogUrls].join('\n')}
</urlset>
`

for (const out of [join(root, 'sitemap.xml'), join(root, 'assets', 'sitemap.xml')]) {
  writeFileSync(out, xml, 'utf8')
  console.log('Wrote', out)
}

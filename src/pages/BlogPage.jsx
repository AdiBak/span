import React, { useEffect, useMemo, useState } from 'react'
import Pagination from '../components/Pagination'
import BlogCard from '../components/BlogCard'
import { supabase } from '../lib/supabase'
import '../pages/BlogPage.css'

const RSS_FEED_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fmedium.com%2Ffeed%2F%40spanationwide'
const ITEMS_PER_PAGE = 5
const FALLBACK_IMAGE = 'https://via.placeholder.com/600x338?text=No+Image'
const MEMBER_IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'
const DEFAULT_AUTHOR = {
  name: 'SPAN',
  link: '/index.html',
  avatar: '/assets/images/index/logo-icon-light.svg'
}

const decodeHtmlEntities = (str = '') => {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '-')
}

const normalizeName = (name = '') =>
  decodeHtmlEntities(name)
    .replace(/\u00a0/g, ' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getCandidateNames = (rawName = '') => {
  const cleaned = decodeHtmlEntities(rawName)
    .replace(/\(.*?\)/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return []
  const words = cleaned.split(' ').filter(Boolean)
  const candidates = new Set()
  candidates.add(cleaned)
  if (words.length >= 2) {
    candidates.add(`${words[0]} ${words[words.length - 1]}`)
  }
  if (words.length >= 1) {
    candidates.add(words[0])
  }
  return Array.from(candidates)
}

const buildMemberLookup = (members = []) => {
  return members.reduce((map, member) => {
    const namesToIndex = new Set()

    const first = member?.first_name?.trim()
    const last = member?.last_name?.trim()

    const fullName = [first, last].filter(Boolean).join(' ').trim()

    if (fullName) namesToIndex.add(fullName)
    if (first) namesToIndex.add(first)
    if (last) namesToIndex.add(last)

    namesToIndex.forEach((name) => {
      const normalized = normalizeName(name)
      if (normalized) {
        map.set(normalized, member)
      }
    })

    return map
  }, new Map())
}

const extractAuthorName = (item) => {
  const content = item.content || ''
  const match = content.match(/written\s+by\s*([^<\n\r]+)/i)
  if (match && match[1]) {
    return decodeHtmlEntities(
      match[1].replace(/[-–—].*$/, '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
    )
  }
  if (item.author) {
    return decodeHtmlEntities(item.author).replace(/\u00a0/g, ' ').trim()
  }
  return ''
}

const resolveMemberAvatar = (image) => {
  if (!image) return DEFAULT_AUTHOR.avatar
  if (/^https?:\/\//i.test(image)) return image
  return `${MEMBER_IMAGE_BASE_URL}/${image}`
}

const resolveAuthor = (item, memberLookup) => {
  if (!memberLookup || memberLookup.size === 0) {
    return { ...DEFAULT_AUTHOR }
  }

  const authorName = extractAuthorName(item)
  if (!authorName) {
    return { ...DEFAULT_AUTHOR }
  }

  const segments = authorName.split(/(?:,|&| and )/i).map((segment) => segment.trim()).filter(Boolean)

  for (const segment of segments) {
    const candidates = getCandidateNames(segment)
    for (const candidate of candidates) {
      const normalized = normalizeName(candidate)
      if (!normalized) continue

      const member = memberLookup.get(normalized)
      if (member) {
        const displayName =
          [member.first_name, member.last_name].filter(Boolean).join(' ').trim() || authorName

        const avatar = resolveMemberAvatar(member.image)
        return {
          name: displayName,
          link: `/directory.html?search=${encodeURIComponent(displayName)}`,
          avatar
        }
      }
    }
  }

  return { ...DEFAULT_AUTHOR }
}

function normalizePost(item, memberLookup) {
  const descriptionMatch = item.description?.match(/<img[^>]+src="([^"]+)"/)
  const image = descriptionMatch ? descriptionMatch[1] : FALLBACK_IMAGE

  const estDate = new Date(`${item.pubDate.replace(' ', 'T')}Z`)
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(estDate)

  const cleanContent = item.content
    ?.replace(/<figcaption>.*?<\/figcaption>/gs, '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim() || ''

  const excerpt = cleanContent.length > 150 ? `${cleanContent.slice(0, 150)}…` : cleanContent

  const author = resolveAuthor(item, memberLookup)

  return {
    id: item.guid || item.link,
    title: item.title,
    link: item.link,
    image,
    formattedDate,
    author,
    excerpt
  }
}

function BlogPage() {
  const [rawPosts, setRawPosts] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch(RSS_FEED_URL)
        if (!res.ok) throw new Error('Failed to fetch blog posts')
        const data = await res.json()
        const items = data.items || []

        let membersData = []
        try {
          const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('first_name,last_name,image')
            .eq('active', true)

          if (memberError) {
            console.warn('Failed to fetch members for blog authors:', memberError)
          } else {
            membersData = memberData || []
          }
        } catch (memberFetchError) {
          console.warn('Failed to fetch members for blog authors:', memberFetchError)
        }

        if (!isMounted) return
        setRawPosts(items)
        setMembers(membersData)
        setError(null)
        setCurrentPage(1)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to fetch RSS feed:', err)
        setError('Blog posts coming soon!')
        setRawPosts([])
        setMembers([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  const memberLookup = useMemo(() => buildMemberLookup(members), [members])

  const normalizedPosts = useMemo(
    () => rawPosts.map((item) => normalizePost(item, memberLookup)),
    [rawPosts, memberLookup]
  )

  useEffect(() => {
    if (window.AOS && typeof window.AOS.init === 'function') {
      window.AOS.init()
      if (typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard()
      }
    }
  }, [normalizedPosts])

  const featuredPost = normalizedPosts[0]
  const otherPosts = useMemo(() => normalizedPosts.slice(1), [normalizedPosts])

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return otherPosts.slice(start, start + ITEMS_PER_PAGE)
  }, [otherPosts, currentPage])

  const totalPages = Math.max(1, Math.ceil(otherPosts.length / ITEMS_PER_PAGE))

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPosts = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading blog posts…</span>
          </div>
        </div>
      )
    }

    if (error) {
      return <p className="text-center text-muted mt-4">{error}</p>
    }

    if (!featuredPost && paginatedPosts.length === 0) {
      return <p className="text-center text-muted mt-4">No blog posts available at this time.</p>
    }

    return (
      <>
        <div className="mt-5 row">
          {currentPage === 1 && featuredPost && (
            <BlogCard post={featuredPost} variant="featured" />
          )}
          {paginatedPosts.map((post) => (
            <BlogCard key={post.id} post={post} variant="default" />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <div className="blog-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Blog</h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            Latest insights about SPAN and healthcare.
          </p>
        </div>
      </section>

      <main className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container py-5">
          <h2 className="text-center display-5 fw-bold">Latest Posts</h2>
          {renderPosts()}
        </div>
      </main>
    </div>
  )
}

export default BlogPage


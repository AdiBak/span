import React, { useEffect, useMemo, useState } from 'react'
import Pagination from '../components/Pagination'
import BlogCard from '../components/BlogCard'
import '../pages/BlogPage.css'

const RSS_FEED_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fmedium.com%2Ffeed%2F%40spanationwide'
const ITEMS_PER_PAGE = 5
const FALLBACK_IMAGE = 'https://via.placeholder.com/600x338?text=No+Image'

const AUTHOR_MAP = {
  'ashita virani': {
    name: 'Ashita Virani',
    link: '/directory.html?search=Ashita+Virani',
    avatar: 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/ashita-virani.jpg'
  },
  'arnav goyal': {
    name: 'Arnav Goyal',
    link: '/directory.html?search=Arnav+Goyal',
    avatar: 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/arnav-goyal.jpg'
  }
}

const WRITING_TEAM = [
  {
    name: 'Arnav Goyal',
    role: 'Policy Analyst',
    bio: 'Arnav, a high school sophomore, is deeply passionate about public policy, geopolitics, and ethics. He explores these interests through journalism, podcasting, and advocacy work with organizations like SPAN to promote patient awareness and engagement.',
    image: 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/arnav-goyal.jpg'
  },
  {
    name: 'Ashita Virani',
    role: 'Editorial & Business Lead',
    bio: 'Ashita is a freshman at UT Austin’s McCombs School of Business who is driven by a deep interest in law, entrepreneurship, and public policy. She explores these areas through her startup Ashvish, advocacy with SPAN, and by writing her first book.',
    image: 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images/ashita-virani.jpg'
  }
]

function normalizePost(item) {
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

  const lowerContent = item.content?.toLowerCase() || ''
  const detectedAuthor = Object.entries(AUTHOR_MAP).find(([key]) => lowerContent.includes(key))

  let author = {
    name: 'SPAN',
    link: '/index.html'
  }

  if (detectedAuthor) {
    const [, authorData] = detectedAuthor
    author = authorData
  }

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
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let isMounted = true

    async function fetchPosts() {
      try {
        setLoading(true)
        const res = await fetch(RSS_FEED_URL)
        if (!res.ok) throw new Error('Failed to fetch blog posts')
        const data = await res.json()
        const items = data.items || []
        if (!isMounted) return
        setPosts(items.map(normalizePost))
        setError(null)
        setCurrentPage(1)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to fetch RSS feed:', err)
        setError('Blog posts coming soon!')
        setPosts([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchPosts()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (window.AOS && typeof window.AOS.init === 'function') {
      window.AOS.init()
      if (typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard()
      }
    }
  }, [posts])

  const featuredPost = posts[0]
  const otherPosts = useMemo(() => posts.slice(1), [posts])

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

      <section className="p-3 p-md-5 m-md-3 bg-light writing-team-section">
        <div className="container">
          <h2 className="text-center display-5 fw-bold">Writing Team</h2>
          <div className="mt-5 row justify-content-center">
            {WRITING_TEAM.map((member) => (
              <div className="col-md-4 mb-4" key={member.name}>
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-body text-center">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="rounded-circle mb-3"
                      style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                    />
                    <h5 className="card-title">{member.name}</h5>
                    <p className="card-text text-muted">{member.role}</p>
                    <p className="card-text">{member.bio}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default BlogPage


import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { memberNameLookupKeys, memberSiteDisplayName } from '../lib/memberDisplayName'
import '../pages/BlogPage.css'

const RSS_FEED_URL = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fmedium.com%2Ffeed%2F%40spanationwide'
const MEMBER_IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'

// Helper functions from BlogPage
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
    for (const name of memberNameLookupKeys(member)) {
      const normalized = normalizeName(name)
      if (normalized) {
        map.set(normalized, member)
      }
    }
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

const resolveAuthor = (item, memberLookup) => {
  if (!memberLookup || memberLookup.size === 0) {
    return { name: 'SPAN', link: '/index.html', avatar: '/images/index/logo-icon-light.svg' }
  }
  const authorName = extractAuthorName(item)
  if (!authorName) {
    return { name: 'SPAN', link: '/index.html', avatar: '/images/index/logo-icon-light.svg' }
  }
  const segments = authorName.split(/(?:,|&| and )/i).map((segment) => segment.trim()).filter(Boolean)
  for (const segment of segments) {
    const candidates = getCandidateNames(segment)
    for (const candidate of candidates) {
      const normalized = normalizeName(candidate)
      if (!normalized) continue
      const member = memberLookup.get(normalized)
      if (member) {
        const displayName = memberSiteDisplayName(member) || authorName
        const avatar = member.image
          ? (member.image.startsWith('http') ? member.image : `${MEMBER_IMAGE_BASE_URL}/${member.image}`)
          : '/images/index/logo-icon-light.svg'
        return {
          name: displayName,
          link: `/directory.html?search=${encodeURIComponent(displayName)}`,
          avatar
        }
      }
    }
  }
  return { name: 'SPAN', link: '/index.html', avatar: '/images/index/logo-icon-light.svg' }
}

// Clean and sanitize HTML content for safe display
const sanitizeContent = (html, featuredImageUrl = null) => {
  if (!html) return ''
  // Remove script tags and their content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Remove style tags that might have dangerous content
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  // Remove on* event handlers
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  
  // Remove the first image from content (since we display it separately as featured image)
  // This handles both standalone img tags and img tags wrapped in figure/div/p tags
  if (featuredImageUrl) {
    // Try to match the featured image URL in various formats
    const escapedUrl = featuredImageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match img tag with the featured image URL
    cleaned = cleaned.replace(new RegExp(`<img[^>]*src=["']${escapedUrl}["'][^>]*>`, 'i'), '')
    // Match figure/div/p tags containing the featured image
    cleaned = cleaned.replace(new RegExp(`<(figure|div|p)[^>]*>\\s*<img[^>]*src=["']${escapedUrl}["'][^>]*>\\s*</(figure|div|p)>`, 'i'), '')
  } else {
    // If no featured image URL, just remove the first image tag
    cleaned = cleaned.replace(/<img[^>]*>/i, '')
  }
  
  // Ensure all links open in new tab
  cleaned = cleaned.replace(/<a\s+([^>]*href=["'][^"']*["'][^>]*)>/gi, (match, attrs) => {
    if (!attrs.includes('target=')) {
      return `<a ${attrs} target="_blank" rel="noopener noreferrer">`
    }
    return match
  })
  return cleaned
}

function BlogPostPage({ postId }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [members, setMembers] = useState([])

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true)
        
        // Fetch members for author resolution
        const { data: membersData } = await supabase
          .from('members')
          .select('first_name,middle_name,last_name,preferred_name,image')
          .eq('active', true)
        setMembers(membersData || [])

        // Fetch RSS feed
        const res = await fetch(RSS_FEED_URL)
        if (!res.ok) throw new Error('Failed to fetch blog posts')
        const data = await res.json()
        const items = data.items || []

        // Find the post by ID (using guid or link)
        const foundPost = items.find(item => {
          const itemId = item.guid || item.link
          return itemId === postId || itemId.includes(postId) || postId.includes(itemId)
        })

        if (!foundPost) {
          setError('Post not found')
          setLoading(false)
          return
        }

        // Resolve author
        const memberLookup = buildMemberLookup(membersData || [])
        const author = resolveAuthor(foundPost, memberLookup)

        // Format date
        const estDate = new Date(`${foundPost.pubDate.replace(' ', 'T')}Z`)
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(estDate)

        // Get featured image
        const descriptionMatch = foundPost.description?.match(/<img[^>]+src="([^"]+)"/)
        const image = descriptionMatch ? descriptionMatch[1] : null

        // Sanitize and prepare content (remove featured image if it appears in content)
        const content = sanitizeContent(foundPost.content, image)

        setPost({
          title: foundPost.title,
          content,
          image,
          formattedDate,
          author,
          link: foundPost.link // Keep original link for "View on Medium" option
        })
        setError(null)
      } catch (err) {
        console.error('Error fetching post:', err)
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    if (postId) {
      fetchPost()
    }
  }, [postId])

  useEffect(() => {
    if (window.AOS && typeof window.AOS.init === 'function') {
      window.AOS.init()
    }
  }, [post])

  if (loading) {
    return (
      <div className="blog-page">
        <div className="text-center py-5">
          <div className="spinner-border text-secondary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading post…</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="blog-page">
        <div className="container py-5">
          <div className="text-center">
            <h2>Post Not Found</h2>
            <p className="text-muted">{error || 'The requested blog post could not be found.'}</p>
            <a href="/blog.html" className="btn btn-dark mt-3">
              Back to Blog
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="blog-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <a href="/blog.html" className="text-white text-decoration-none mb-3 d-inline-block">
            <i className="bi bi-arrow-left me-2"></i>Back to Blog
          </a>
          <h1 className="display-4 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">{post.title}</h1>
        </div>
      </section>

      <main className="p-3 p-md-5 m-md-3 bg-light">
        <div className="container py-5">
          <article className="blog-post-content">
            {/* Post Meta */}
            <div className="mb-4 pb-3 border-bottom">
              <div className="d-flex align-items-center flex-wrap gap-3 text-muted">
                <small>{post.formattedDate}</small>
                {post.author && (
                  <>
                    <span>·</span>
                    <div className="d-flex align-items-center">
                      {post.author.avatar && (
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          height="24"
                          width="24"
                          className="rounded-circle me-2"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                      {post.author.link ? (
                        <a href={post.author.link} className="text-muted text-decoration-none">
                          <small>{post.author.name}</small>
                        </a>
                      ) : (
                        <small>{post.author.name}</small>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Featured Image */}
            {post.image && (
              <div className="mb-4">
                <img
                  src={post.image}
                  alt={post.title}
                  className="img-fluid rounded"
                  style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Post Content */}
            <div
              className="blog-post-body"
              dangerouslySetInnerHTML={{ __html: post.content }}
              style={{
                lineHeight: '1.8',
                fontSize: '1.1rem'
              }}
            />

            {/* View on Medium Link */}
            <div className="mt-5 pt-4 border-top text-center">
              <a
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-dark"
              >
                <i className="bi bi-box-arrow-up-right me-2"></i>
                View on Medium
              </a>
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}

export default BlogPostPage

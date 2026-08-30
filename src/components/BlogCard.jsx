import React from 'react'

function AuthorInfo({ author }) {
  if (!author) return null

  const content = (
    <>
      {author.avatar && (
        <img
          src={author.avatar}
          alt={author.name}
          height="16"
          width="16"
          loading="lazy"
          decoding="async"
          style={{ borderRadius: '50%', marginRight: '6px', objectFit: 'cover' }}
        />
      )}
      {author.name}
    </>
  )

  if (author.link) {
    return (
      <a className="text-muted text-decoration-none" href={author.link}>
        {content}
      </a>
    )
  }

  return <span className="text-muted">{content}</span>
}

function BlogCard({ post, variant = 'default' }) {
  const wrapClass = `blog-card-wrap${variant === 'featured' ? ' blog-card-featured' : ''}`
  const cardClasses = `impact-card card h-100 shadow-sm news-card ${variant === 'featured' ? 'featured-news' : ''}`

  return (
    <div className={wrapClass}>
      <div className={cardClasses}>
        <img
          src={post.image}
          className="card-img-top"
          alt={post.title}
          style={{ objectFit: 'cover', aspectRatio: '16/9' }}
          loading="lazy"
          decoding="async"
          width="600"
          height="338"
        />
        <div className="card-body d-flex flex-column">
          <h3 className="h5 card-title">{post.title}</h3>
          <p className="card-text text-muted mb-2">
            <small>
              {post.formattedDate}
              {post.author && (
                <>
                  {' · '}
                  <AuthorInfo author={post.author} />
                </>
              )}
            </small>
          </p>
          <p className="card-text">{post.excerpt}</p>
          <a href={post.internalLink || post.link} className="btn btn-dark mt-auto">
            Read More
          </a>
        </div>
      </div>
    </div>
  )
}

export default BlogCard

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
  const columnClass = variant === 'featured' ? 'col-md-8 mb-4' : 'col-md-4 mb-4'
  const cardClasses = `impact-card card h-100 shadow-sm news-card ${variant === 'featured' ? 'featured-news' : ''}`

  return (
    <div className={columnClass}>
      <div className={cardClasses}>
        <img
          src={post.image}
          className="card-img-top"
          alt={post.title}
          style={{ objectFit: 'cover', aspectRatio: '16/9' }}
        />
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{post.title}</h5>
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
          <a href={post.link} target="_blank" rel="noopener noreferrer" className="btn btn-dark mt-auto">
            Read More
          </a>
        </div>
      </div>
    </div>
  )
}

export default BlogCard


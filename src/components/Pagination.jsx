import React from 'react'

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const maxDisplay = 10
  let pages = []

  if (totalPages <= maxDisplay) {
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Show first page
    pages.push(1)

    // Show ellipsis if needed
    if (currentPage > 4) {
      pages.push('ellipsis-start')
    }

    // Show pages around current
    const start = Math.max(2, currentPage - 2)
    const end = Math.min(totalPages - 1, currentPage + 2)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 3) {
      pages.push('ellipsis-end')
    }

    // Show last page
    pages.push(totalPages)
  }

  return (
    <nav>
      <ul className="pagination justify-content-center">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
        </li>

        {pages.map((page, idx) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <li key={idx} className="page-item disabled">
                <span className="page-link">…</span>
              </li>
            )
          }

          return (
            <li
              key={idx}
              className={`page-item ${page === currentPage ? 'active' : ''}`}
            >
              <button
                className="page-link"
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            </li>
          )
        })}

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination


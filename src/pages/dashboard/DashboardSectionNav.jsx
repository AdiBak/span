import React, { useState, useEffect } from 'react'
import { scrollToDashboardSection } from './dashboardSectionAnchors'

export default function DashboardSectionNav({ items }) {
  const [desktopOpen, setDesktopOpen] = useState(false)
  // Hide the corner nav while the main navbar is on screen; reveal it once scrolled past.
  const [navbarVisible, setNavbarVisible] = useState(true)

  useEffect(() => {
    const navbarEl = document.querySelector('.navbar')
    if (!navbarEl || typeof IntersectionObserver === 'undefined') {
      setNavbarVisible(false)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setNavbarVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(navbarEl)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (navbarVisible) setDesktopOpen(false)
  }, [navbarVisible])

  if (!items?.length) return null

  const handleJump = (id) => {
    scrollToDashboardSection(id)
    setDesktopOpen(false)
  }

  return (
    <>
      <div className="dashboard-section-nav-mobile d-lg-none mb-4">
        <label htmlFor="dashboard-section-jump-select" className="form-label small text-muted mb-1">
          Jump to section
        </label>
        <select
          id="dashboard-section-jump-select"
          className="form-select form-select-sm"
          defaultValue=""
          onChange={(e) => {
            const id = e.target.value
            if (id) {
              scrollToDashboardSection(id)
              e.target.value = ''
            }
          }}
        >
          <option value="" disabled>
            Choose a section…
          </option>
          {items.map((item) => (
            <option key={item.key} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <nav
        className={`dashboard-section-nav d-none d-lg-block${navbarVisible ? ' dashboard-section-nav--hidden' : ''}`}
        aria-label="Dashboard sections"
        aria-hidden={navbarVisible}
      >
        <button
          type="button"
          className="dashboard-section-nav-toggle btn btn-sm btn-outline-dark shadow-sm"
          onClick={() => setDesktopOpen((open) => !open)}
          aria-expanded={desktopOpen}
          tabIndex={navbarVisible ? -1 : 0}
        >
          <i className={`bi bi-${desktopOpen ? 'chevron-down' : 'list'} me-1`} aria-hidden="true" />
          Jump to…
        </button>
        {desktopOpen && (
          <ul className="dashboard-section-nav-list list-unstyled mb-0 shadow-sm">
            {items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className="dashboard-section-nav-link"
                  onClick={() => handleJump(item.id)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </>
  )
}

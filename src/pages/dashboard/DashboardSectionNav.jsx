import React, { useState, useEffect } from 'react'
import { scrollToDashboardSection } from './dashboardSectionAnchors'

export default function DashboardSectionNav({ items }) {
  const [desktopOpen, setDesktopOpen] = useState(false)
  // Pin just under the main navbar; measure it so there's no gap regardless of its height.
  const [navOffset, setNavOffset] = useState(0)

  useEffect(() => {
    const navbarEl = document.querySelector('.navbar')
    const update = () => setNavOffset(navbarEl ? navbarEl.getBoundingClientRect().height : 0)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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

      {/* Full-bleed, zero-height sticky wrapper: starts at the top-right of the
          white area (below the hero) and sticks under the navbar on scroll. */}
      <div className="dashboard-section-nav-sticky d-none d-lg-block" style={{ top: navOffset }}>
        <nav className="dashboard-section-nav" aria-label="Dashboard sections">
          <button
            type="button"
            className="dashboard-section-nav-toggle btn btn-sm btn-outline-dark shadow-sm"
            onClick={() => setDesktopOpen((open) => !open)}
            aria-expanded={desktopOpen}
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
      </div>
    </>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import './Navbar.css'

function Navbar() {
  const [session, setSession] = useState(null)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    let path = window.location.pathname
    if (path === '/') path = '/index.html'
    setCurrentPath(path)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const navLinks = useMemo(
    () => [
      { label: 'Home', href: '/index.html' },
      { label: 'Our Story', href: '/our-story.html' },
      { label: 'Bills', href: '/bills.html' },
      { label: 'Directory', href: '/directory.html' },
      { label: 'Blog', href: '/blog.html' },
    ],
    []
  )

  async function handleSignOut(event) {
    event.preventDefault()
    await supabase.auth.signOut()
    window.location.href = '/index.html'
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top" style={{ zIndex: 1030 }}>
      <div className="container">
        <a className="navbar-brand" href="/index.html">
          <img
            className="my-2"
            src="/assets/images/index/logo-wide-light.svg"
            height="30"
            alt="SPAN Logo"
          />
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav align-items-lg-center gap-lg-3">
            {navLinks.map(({ label, href }) => (
              <li className="nav-item" key={href}>
                <a className={`nav-link ${currentPath === href ? 'active' : ''}`} href={href}>
                  {label}
                </a>
              </li>
            ))}
            {session && session.user ? (
              <>
                <li className="nav-item">
                  <a
                    className={`nav-link ${currentPath === '/dashboard.html' ? 'active' : ''}`}
                    href="/dashboard.html"
                  >
                    Dashboard
                  </a>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#" role="button" onClick={handleSignOut}>
                    Sign Out
                  </a>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <a className={`nav-link ${currentPath === '/login.html' ? 'active' : ''}`} href="/login.html">
                  Login
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

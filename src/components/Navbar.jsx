import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import './Navbar.css'

function Navbar() {
  const [session, setSession] = useState(null)
  const [currentPath, setCurrentPath] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  async function handleSignOut(e) {
    if (e) e.preventDefault()
    await supabase.auth.signOut({ scope: 'local' })
    window.location.href = '/index.html'
  }

  const closeMobileMenu = () => setMobileMenuOpen(false)

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const navContent = (
    <>
      {navLinks.map(({ label, href }) => (
        <li className="nav-item" key={href}>
          <a className={`nav-link ${currentPath === href ? 'active' : ''}`} href={href} onClick={closeMobileMenu}>
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
              onClick={closeMobileMenu}
            >
              Dashboard
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="#" role="button" onClick={(e) => { handleSignOut(e); closeMobileMenu(); }}>
              Sign Out
            </a>
          </li>
        </>
      ) : (
        <li className="nav-item">
          <a className={`nav-link ${currentPath === '/login.html' ? 'active' : ''}`} href="/login.html" onClick={closeMobileMenu}>
            Login
          </a>
        </li>
      )}
    </>
  )

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top" style={{ zIndex: 1030 }}>
      <div className="container">
        <a className="navbar-brand" href="/index.html">
          <img
            className="my-2"
            src="/images/index/logo-wide-light.svg"
            height="30"
            alt="SPAN Logo"
          />
        </a>
        <button
          className="navbar-toggler d-lg-none"
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse d-none d-lg-block" id="navbarNav">
          <ul className="navbar-nav align-items-lg-center gap-lg-3">
            {navContent}
          </ul>
        </div>
      </div>

      {/* Mobile: side drawer */}
      <div className={`navbar-drawer-backdrop ${mobileMenuOpen ? 'navbar-drawer-backdrop--open' : ''}`} onClick={closeMobileMenu} aria-hidden="true" />
      <div className={`navbar-drawer ${mobileMenuOpen ? 'navbar-drawer--open' : ''}`}>
        <div className="navbar-drawer-header">
          <span className="navbar-drawer-title">Menu</span>
          <button type="button" className="navbar-drawer-close btn btn-link" onClick={closeMobileMenu} aria-label="Close menu">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <ul className="navbar-drawer-nav">
          {navContent}
        </ul>
      </div>
    </nav>
  )
}

export default Navbar

import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Navbar.css'

const IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'

function Navbar() {
  const [session, setSession] = useState(null)
  const [member, setMember] = useState(null)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    // Get current path
    let path = window.location.pathname
    if (path === '/') path = '/index.html'
    setCurrentPath(path)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch member data when session changes
  useEffect(() => {
    if (session?.user?.email) {
      supabase
        .from('members')
        .select('first_name, image')
        .eq('email', session.user.email)
        .maybeSingle()
        .then(({ data }) => {
          setMember(data)
        })
    } else {
      setMember(null)
    }
  }, [session])

  async function handleSignOut(e) {
    e.preventDefault()
    await supabase.auth.signOut()
    // Redirect to home after sign out
    window.location.href = '/index.html'
  }

  const firstName = member?.first_name || 'there'
  const imageUrl = member?.image

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
          <ul className="navbar-nav align-items-center" style={{ marginLeft: 'auto' }}>
            <li className="nav-item">
              <a
                className={`nav-link ${currentPath === '/index.html' ? 'active' : ''}`}
                href="/index.html"
              >
                Home
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentPath === '/our-story.html' ? 'active' : ''}`}
                href="/our-story.html"
              >
                Our Story
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentPath === '/bills.html' ? 'active' : ''}`}
                href="/bills.html"
              >
                Bills
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentPath === '/directory.html' ? 'active' : ''}`}
                href="/directory.html"
              >
                Directory
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link ${currentPath === '/blog.html' ? 'active' : ''}`}
                href="/blog.html"
              >
                Blog
              </a>
            </li>
            {session && session.user ? (
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle d-flex align-items-center"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                >
                  {imageUrl && (
                    <img
                      src={`${IMAGE_BASE_URL}/${imageUrl}`}
                      alt={firstName}
                      width="32"
                      height="32"
                      className="rounded-circle me-2"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                  Welcome, {firstName}!
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <a className="dropdown-item" href="/dashboard.html">
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <a className="dropdown-item" href="#" onClick={handleSignOut}>
                      Sign Out
                    </a>
                  </li>
                </ul>
              </li>
            ) : (
              <li className="nav-item">
                <a
                  className={`nav-link ${currentPath === '/login.html' ? 'active' : ''}`}
                  href="/login.html"
                >
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

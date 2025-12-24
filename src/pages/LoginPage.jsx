import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import jsQR from 'jsqr'
import './LoginPage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [showTechSupportModal, setShowTechSupportModal] = useState(false)
  const [qrError, setQrError] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')

    let loginEmail = email.trim()
    // Auto-append domain if missing
    if (!loginEmail.includes('@')) {
      loginEmail += '@spanationwide.org'
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password
      })
      if (error) throw error
      window.location.href = '/dashboard.html'
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    }
  }

  const handleQRLogin = useCallback(async (email, password) => {
    try {
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      setShowQRModal(false)
      window.location.href = '/dashboard.html'
    } catch (err) {
      setQrError('QR Login Failed: ' + err.message)
    }
  }, [])

  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        try {
          const qrData = JSON.parse(code.data)
          if (!qrData.email || !qrData.password) throw new Error('Invalid QR format')

          let loginEmail = qrData.email
          if (!loginEmail.includes('@')) loginEmail += '@spanationwide.org'

          handleQRLogin(loginEmail, qrData.password)
          return
        } catch (err) {
          setQrError('QR Login Failed: ' + err.message)
        }
      }
    }
    requestAnimationFrame(scanLoop)
  }, [handleQRLogin])

  const startQRScan = useCallback(async () => {
    setQrError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => console.error('Video play blocked:', err))
          scanLoop()
        }
      }
    } catch (err) {
      console.error('Camera error:', err)
      setQrError('Camera access required.')
    }
  }, [scanLoop])

  // Check if user is already authenticated (e.g., from invite link hash)
  useEffect(() => {
    // Check if there's a hash in the URL (from invite link callback)
    const hasHash = window.location.hash && window.location.hash.length > 0
    
    // Set up auth state listener to handle invite link callbacks
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed on login page:', event, session ? 'session exists' : 'no session')
      // If user gets authenticated (from hash or other means), redirect to dashboard
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        console.log('User authenticated, redirecting to dashboard...')
        window.location.href = '/dashboard.html'
      }
    })

    // Also check for existing session on mount
    const checkAuth = async () => {
      if (hasHash) {
        // Wait a moment for Supabase to process the hash
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // User is already authenticated, redirect to dashboard
        window.location.href = '/dashboard.html'
      }
    }
    
    checkAuth()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (showQRModal) {
      startQRScan()
    } else {
      // Stop stream when modal closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [showQRModal, startQRScan])

  return (
    <div className="login-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up" data-aos-duration="1000">Login</h1>
          <p className="lead" data-aos="fade-up" data-aos-duration="1000" data-aos-delay="200">
            Access your SPAN member dashboard.
          </p>
        </div>
      </section>

      <main className="position-relative overflow-hidden p-3 p-md-5 m-md-3 bg-light">
        <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
          <div className="card shadow-sm p-4" style={{ maxWidth: '400px', width: '100%' }} data-aos="fade">
            <form onSubmit={handleEmailLogin}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="text"
                  className="form-control"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-dark w-100 mb-3">Sign In</button>
              {error && <p className="text-danger mt-1 mb-0 text-center">{error}</p>}
            </form>

            <div className="d-flex align-items-center my-3">
              <hr className="flex-grow-1" />
              <span className="px-2 text-muted">OR</span>
              <hr className="flex-grow-1" />
            </div>

            <div className="d-grid">
              <button
                className="btn btn-outline-dark btn-lg"
                onClick={() => setShowQRModal(true)}
              >
                <i className="bi bi-qr-code-scan me-2"></i> Scan SPANCard
              </button>
              <p className="text-muted mt-2 text-center small">Use your SPANCard QR code to log in</p>
            </div>

            <div className="text-center mt-4 pt-3 border-top">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowTechSupportModal(true)}
                style={{ fontSize: '0.85rem' }}
              >
                <i className="bi bi-question-circle me-1"></i> Having technical issues?
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* QR Login Modal */}
      {showQRModal && (
        <>
          <div
            className="modal fade show"
            id="qrLoginModal"
            tabIndex="-1"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.id === 'qrLoginModal') {
                setShowQRModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Scan SPANCard</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowQRModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {qrError && <div className="text-danger mb-2">{qrError}</div>}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: 'auto', minHeight: '300px', background: 'black', objectFit: 'cover' }}
                  ></video>
                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Technical Support Modal */}
      {showTechSupportModal && (
        <>
          <div
            className="modal fade show"
            id="techSupportModal"
            tabIndex="-1"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.id === 'techSupportModal') {
                setShowTechSupportModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Technical Support</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowTechSupportModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-3">
                    If you're experiencing technical issues with logging in, please contact our tech lead for assistance.
                  </p>
                  <div className="d-grid">
                    <a
                      href="mailto:aditya.bakshi@spanationwide.org?subject=Login Technical Issue&body=Hi Aditya,%0D%0A%0D%0AI'm experiencing a technical issue with logging in. Here are the details:%0D%0A%0D%0A[Please describe your issue here]%0D%0A%0D%0AThank you!"
                      className="btn btn-dark"
                      onClick={() => setShowTechSupportModal(false)}
                    >
                      <i className="bi bi-envelope me-2"></i> Email Tech Lead
                    </a>
                  </div>
                  <p className="text-muted small mt-3 mb-0">
                    This will open your default email client to send a message to Aditya Bakshi, our tech lead.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}
    </div>
  )
}

export default LoginPage


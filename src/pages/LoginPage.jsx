import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import jsQR from 'jsqr'
import './LoginPage.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrError, setQrError] = useState('')
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetPasswordError, setResetPasswordError] = useState('')
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
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
      const msg = err.message || 'Login failed. Please try again.'
      const usingPersonal = loginEmail.includes('@') && !loginEmail.toLowerCase().endsWith('@spanationwide.org')
      setError(
        usingPersonal
          ? `${msg} Use your SPAN email (…@spanationwide.org), not your personal email — the temporary password only works with the SPAN address.`
          : msg
      )
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotPasswordError('')
    setForgotPasswordSuccess(false)
    setIsLoading(true)

    let recoveryEmail = forgotPasswordEmail.trim()
    // Auto-append domain if missing
    if (!recoveryEmail.includes('@')) {
      recoveryEmail += '@spanationwide.org'
    }

    try {
      // Deployed on Supabase as "hyper-endpoint" (legacy name); source lives in password-reset/
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/hyper-endpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: recoveryEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to send password reset email')
      }
      
      setForgotPasswordSuccess(true)
      setForgotPasswordEmail('')
    } catch (err) {
      console.error('Password reset failed:', err)
      setForgotPasswordError(err.message || 'Failed to send password reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetPasswordError('')
    setResetPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setResetPasswordError('Passwords do not match.')
      return
    }

    if (newPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters long.')
      return
    }

    setIsResettingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      setResetPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard.html'
      }, 2000)
    } catch (err) {
      setResetPasswordError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsResettingPassword(false)
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
  // Also detect password reset hash
  useEffect(() => {
    // Check if there's a hash in the URL (from invite link or password reset callback)
    const hasHash = window.location.hash && window.location.hash.length > 0
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const type = hashParams.get('type')
    
    // Set up auth state listener to handle invite link callbacks and password recovery
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed on login page:', event, session ? 'session exists' : 'no session')
      
      // If this is a password recovery, show the reset form after session is established
      if (type === 'recovery' && (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session))) {
        console.log('Password recovery detected, showing reset form')
        setShowResetPasswordForm(true)
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
      
      // If user gets authenticated (from hash or other means), redirect to dashboard
      // (but not if it's a password recovery)
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && type !== 'recovery') {
        console.log('User authenticated, redirecting to dashboard...')
        window.location.href = '/dashboard.html'
      }
    })

    // Also check for existing session on mount and process hash
    const checkAuth = async () => {
      if (hasHash) {
        // Wait a moment for Supabase to process the hash
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      
      // If it's a recovery type, check if we have a session (Supabase should have processed the hash)
      if (type === 'recovery') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Recovery session established, showing reset form')
          setShowResetPasswordForm(true)
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
        } else {
          console.error('Recovery hash detected but no session established')
          setResetPasswordError('Invalid or expired password reset link. Please request a new one.')
          setShowResetPasswordForm(true)
        }
        return
      }
      
      // For non-recovery flows, check if user is already authenticated
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
                <label htmlFor="email" className="form-label">SPAN email</label>
                <input
                  type="text"
                  className="form-control"
                  id="email"
                  placeholder="name@spanationwide.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <small className="text-muted">Use your SPAN address, not your personal email</small>
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
              <button type="submit" className="btn btn-dark w-100 mb-2">Sign In</button>
              {error && <p className="text-danger mt-1 mb-0 text-center">{error}</p>}
              <div className="text-center mt-2 mb-2">
                <button
                  type="button"
                  id="forgot-password-button"
                  className="btn btn-outline-primary"
                  onClick={(e) => {
                    e.preventDefault()
                    setShowForgotPasswordModal(true)
                  }}
                  style={{ fontSize: '0.9rem', width: '100%' }}
                >
                  Forgot Password?
                </button>
              </div>
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

      {/* Reset Password Modal (shown when user arrives from recovery link) */}
      {showResetPasswordForm && (
        <>
          <div
            className="modal fade show"
            id="resetPasswordModal"
            tabIndex="-1"
            style={{ display: 'block', zIndex: 1055 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reset Your Password</h5>
                </div>
                <div className="modal-body">
                  {resetPasswordSuccess ? (
                    <div className="text-center">
                      <div className="alert alert-success mb-3">
                        <i className="bi bi-check-circle me-2"></i>
                        Password reset successfully! Redirecting to dashboard...
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword}>
                      <p className="text-muted mb-3">
                        Please enter your new password below.
                      </p>
                      <div className="mb-3">
                        <label htmlFor="newPassword" className="form-label">New Password</label>
                        <input
                          type="password"
                          className="form-control"
                          id="newPassword"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          disabled={isResettingPassword}
                          minLength={6}
                        />
                        <small className="text-muted">Password must be at least 6 characters long</small>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <input
                          type="password"
                          className="form-control"
                          id="confirmPassword"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={isResettingPassword}
                          minLength={6}
                        />
                      </div>
                      {resetPasswordError && (
                        <div className="alert alert-danger mb-3">{resetPasswordError}</div>
                      )}
                      <div className="d-grid">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isResettingPassword}
                        >
                          {isResettingPassword ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Resetting...
                            </>
                          ) : (
                            'Reset Password'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <>
          <div
            className="modal fade show"
            id="forgotPasswordModal"
            tabIndex="-1"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.id === 'forgotPasswordModal') {
                setShowForgotPasswordModal(false)
                setForgotPasswordEmail('')
                setForgotPasswordError('')
                setForgotPasswordSuccess(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reset Password</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowForgotPasswordModal(false)
                      setForgotPasswordEmail('')
                      setForgotPasswordError('')
                      setForgotPasswordSuccess(false)
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {forgotPasswordSuccess ? (
                    <div className="text-center">
                      <div className="alert alert-success mb-3">
                        <i className="bi bi-check-circle me-2"></i>
                        Password reset email sent (usually to your personal inbox). Log in with your <strong>SPAN email</strong> (@spanationwide.org) and the temporary password from the email — not your personal email.
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setShowForgotPasswordModal(false)
                          setForgotPasswordEmail('')
                          setForgotPasswordError('')
                          setForgotPasswordSuccess(false)
                        }}
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword}>
                      <p className="text-muted mb-3">
                        Enter your SPAN or personal email. We'll email a temporary password; you must still log in with your SPAN address (@spanationwide.org).
                      </p>
                      <div className="mb-3">
                        <label htmlFor="forgotPasswordEmail" className="form-label">SPAN or personal email</label>
                        <input
                          type="text"
                          className="form-control"
                          id="forgotPasswordEmail"
                          placeholder="name@spanationwide.org or personal email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                        <small className="text-muted">You can enter just the username (e.g., "john.doe") or the full email</small>
                      </div>
                      {forgotPasswordError && (
                        <div className="alert alert-danger mb-3">{forgotPasswordError}</div>
                      )}
                      <div className="d-grid gap-2">
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Sending...
                            </>
                          ) : (
                            'Send Reset Link'
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setShowForgotPasswordModal(false)
                            setForgotPasswordEmail('')
                            setForgotPasswordError('')
                            setForgotPasswordSuccess(false)
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
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


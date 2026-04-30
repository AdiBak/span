import React, { useCallback, useEffect, useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'

/**
 * Require Cloudflare Turnstile before opening the user's mail client (mailto).
 * Configure VITE_TURNSTILE_SITE_KEY in env (Cloudflare dashboard → Turnstile).
 */
export default function DirectoryEmailGateModal({
  open,
  recipientName,
  recipientEmail,
  siteKey,
  onClose,
}) {
  const [token, setToken] = useState(null)

  useEffect(() => {
    if (!open) setToken(null)
  }, [open, recipientEmail])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const handleSuccess = useCallback((t) => {
    setToken(t)
  }, [])

  const handleExpire = useCallback(() => {
    setToken(null)
  }, [])

  const handleError = useCallback((err) => {
    if (import.meta.env.DEV) {
      console.warn('[Turnstile]', err)
    }
  }, [])

  const handleContinue = () => {
    if (!token || !recipientEmail) return
    window.location.href = `mailto:${recipientEmail.trim()}`
    onClose()
  }

  if (!open || !siteKey) return null

  return (
    <>
      <div className="modal-backdrop fade show" aria-hidden="true" onClick={onClose} />
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="directoryEmailGateTitle"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="directoryEmailGateTitle">
                Verify before email
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <p className="mb-3">
                Complete the check below to open your email app and message{' '}
                <strong>{recipientName || 'this member'}</strong>.
              </p>
              <div className="d-flex justify-content-center mb-3">
                <Turnstile
                  siteKey={siteKey}
                  onSuccess={handleSuccess}
                  onExpire={handleExpire}
                  onError={handleError}
                  options={{
                    action: 'directory_email',
                    theme: 'auto',
                    size: 'normal',
                  }}
                />
              </div>
              {!token && (
                <p className="small text-muted mb-0 text-center">Waiting for verification…</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-dark"
                onClick={handleContinue}
                disabled={!token}
              >
                <i className="bi bi-envelope me-1"></i>
                Open email app
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

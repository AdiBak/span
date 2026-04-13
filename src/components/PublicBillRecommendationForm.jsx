import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { US_STATE_CODE_TO_NAME, canonicalUSStateName } from '../lib/usStateCanonical'

const STATE_OPTIONS = Object.entries(US_STATE_CODE_TO_NAME)
  .filter(([code]) => code !== 'US')
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name))

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim())
}

/**
 * Anonymous bill / issue idea form for the public Bills page.
 * @param {{ onClose?: () => void }} props
 */
export default function PublicBillRecommendationForm({ onClose }) {
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [state, setState] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (honeypot.trim()) return

    const t = topic.trim()
    const d = description.trim()
    const n = name.trim()
    const em = email.trim()
    if (!t) {
      setError('Please enter a topic.')
      return
    }
    if (!d) {
      setError('Please describe your idea.')
      return
    }
    if (!n) {
      setError('Please enter your name.')
      return
    }
    if (!em || !isValidEmail(em)) {
      setError('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const stateStored = state ? canonicalUSStateName(state) || state.trim() : null
      const { error: insErr } = await supabase.from('public_bill_recommendations').insert({
        title: t,
        description: d,
        state: stateStored || null,
        submitter_name: n,
        submitter_email: em,
      })
      if (insErr) throw insErr
      setSuccess('Thank you! SPAN will review your suggestion.')
      setTopic('')
      setDescription('')
      setState('')
      setName('')
      setEmail('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mb-4" aria-labelledby="public-bill-idea-heading">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h2 id="public-bill-idea-heading" className="h4 mb-0">
              Suggest a bill or policy issue
            </h2>
            {typeof onClose === 'function' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary flex-shrink-0"
                onClick={onClose}
                aria-label="Close suggestion form"
              >
                Close
              </button>
            )}
          </div>
          <p className="text-muted mb-4">
            No account needed. Share a topic and your idea; optionally add a state. Include your name and email so we
            know you&apos;re a real person. Submissions are reviewed by the team (same place as internal ideas on the
            dashboard).
          </p>
          <form onSubmit={handleSubmit} noValidate>
            <input
              type="text"
              name="company"
              autoComplete="off"
              tabIndex={-1}
              className="position-absolute"
              style={{ left: '-9999px', opacity: 0, height: 0, width: 0 }}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden="true"
            />
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="pub-idea-topic" className="form-label">
                  Topic <span className="text-danger">*</span>
                </label>
                <input
                  id="pub-idea-topic"
                  type="text"
                  className="form-control"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Short label for the bill or issue"
                  maxLength={500}
                  required
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="pub-idea-state" className="form-label">
                  State (optional)
                </label>
                <select
                  id="pub-idea-state"
                  className="form-select"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  <option value="">— Not specified —</option>
                  {STATE_OPTIONS.map(({ code, name }) => (
                    <option key={code} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <label htmlFor="pub-idea-desc" className="form-label">
                  Your idea <span className="text-danger">*</span>
                </label>
                <textarea
                  id="pub-idea-desc"
                  className="form-control"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the bill or issue and what you’d like SPAN to consider."
                  maxLength={8000}
                  required
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="pub-idea-name" className="form-label">
                  Your name <span className="text-danger">*</span>
                </label>
                <input
                  id="pub-idea-name"
                  type="text"
                  className="form-control"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="pub-idea-email" className="form-label">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  id="pub-idea-email"
                  type="email"
                  className="form-control"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <div className="text-danger small mt-3">{error}</div>}
            {success && <div className="text-success small mt-3">{success}</div>}
            <button type="submit" className="btn btn-dark mt-4" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit suggestion'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

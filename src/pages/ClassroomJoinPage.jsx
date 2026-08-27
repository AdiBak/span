import React, { useEffect, useState } from 'react'
import { joinClassWithCode, registerAndJoinClass, validateJoinCode } from '../lib/classroom'
import { setPageSeo } from '../lib/documentSeo'
import './ClassroomJoinPage.css'

function ClassroomJoinPage() {
  const [joinCode, setJoinCode] = useState('')
  const [step, setStep] = useState('code')
  const [matchedClass, setMatchedClass] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  })

  useEffect(() => {
    setPageSeo({
      title: 'Join your class | SPAN Classroom',
      description: 'Create a classroom account with your teacher’s class code.',
      path: '/classroom/join.html',
    })
    const params = new URLSearchParams(window.location.search)
    const c = params.get('code')
    if (c) setJoinCode(c.toUpperCase())
  }, [])

  async function handleCodeSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const found = await validateJoinCode(joinCode)
      if (!found) {
        setError('Invalid or expired class code.')
        return
      }
      setMatchedClass(found)
      setStep('register')
    } catch (err) {
      setError(err.message || 'Could not validate code.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const {
        data: { session: existing },
      } = await supabase.auth.getSession()

      if (existing) {
        await joinClassWithCode({
          code: joinCode,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
        })
      } else {
        const result = await registerAndJoinClass({
          code: joinCode,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
        })

        if (!result.access_token || !result.refresh_token) {
          throw new Error('Account created but session was missing. Sign in under Classroom on the login page.')
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
        if (sessionError) throw sessionError
      }

      window.location.href = '/classroom/dashboard.html'
    } catch (err) {
      console.error(err)
      setError(err.message || 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="classroom-join-page">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="text-center mb-4">
              <h1 className="h3 mb-2">Join your SPAN class</h1>
              <p className="text-muted">Enter your teacher’s code, then create a classroom login with your school email.</p>
            </div>

            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                {step === 'code' ? (
                  <form onSubmit={handleCodeSubmit}>
                    <label className="form-label" htmlFor="join-code">
                      Class code
                    </label>
                    <input
                      id="join-code"
                      className="form-control form-control-lg text-uppercase mb-3"
                      placeholder="e.g. ABCD-EFGH"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                    />
                    {error && <div className="alert alert-danger py-2 small">{error}</div>}
                    <button type="submit" className="btn btn-dark w-100" disabled={submitting}>
                      {submitting ? 'Checking…' : 'Continue'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister}>
                    <div className="alert alert-light border small mb-3">
                      Joining <strong>{matchedClass?.class_name}</strong>
                      {matchedClass?.school_name && <> at {matchedClass.school_name}</>}
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2 align-baseline"
                        onClick={() => {
                          setStep('code')
                          setError('')
                        }}
                      >
                        Change code
                      </button>
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label">First name</label>
                        <input
                          className="form-control"
                          required
                          value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Last name</label>
                        <input
                          className="form-control"
                          required
                          value={form.lastName}
                          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">School email</label>
                        <input
                          type="email"
                          className="form-control"
                          required
                          placeholder="your school email"
                          autoComplete="username"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                        <small className="text-muted">Use your school email (not required to be .edu).</small>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Password</label>
                        <input
                          type="password"
                          className="form-control"
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    {error && <div className="alert alert-danger py-2 small mt-2">{error}</div>}
                    <button type="submit" className="btn btn-dark w-100 mt-3" disabled={submitting}>
                      {submitting ? 'Creating account…' : 'Create account & join'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <p className="text-center small text-muted mt-3 mb-0">
              Already have a classroom account? <a href="/login.html?mode=classroom">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ClassroomJoinPage

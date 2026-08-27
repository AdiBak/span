import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  CLASSROOM_FEATURE_LABELS,
  createClass,
  fetchAssignmentSubmissions,
  fetchClassAssignments,
  fetchClassRoster,
  fetchStudentEnrollments,
  fetchTeacherClasses,
  getClassroomSessionRole,
  insertAssignment,
  updateClassFeatures,
  upsertSubmission,
} from '../lib/classroom'
import './ClassroomDashboardPage.css'

function FeatureToggles({ features, onChange }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      {Object.entries(CLASSROOM_FEATURE_LABELS).map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={`btn btn-sm ${features?.[key] ? 'btn-dark' : 'btn-outline-secondary'}`}
          onClick={() => onChange({ ...features, [key]: !features?.[key] })}
        >
          {features?.[key] && <i className="bi bi-check-lg me-1" />}
          {label}
        </button>
      ))}
    </div>
  )
}

function TeacherDashboard({ profile }) {
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [roster, setRoster] = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newClassName, setNewClassName] = useState('')
  const [newClassTerm, setNewClassTerm] = useState('Fall 2026')
  const [showNewClass, setShowNewClass] = useState(false)
  const [showNewAssignment, setShowNewAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({ title: '', instructions: '', dueAt: '' })

  const selectedClass = classes.find((c) => c.class_id === selectedClassId) || classes[0]

  const loadClasses = useCallback(async () => {
    const rows = await fetchTeacherClasses()
    setClasses(rows)
    if (rows.length && !rows.some((c) => c.class_id === selectedClassId)) {
      setSelectedClassId(rows[0].class_id)
    }
  }, [selectedClassId])

  const loadClassDetail = useCallback(async (classId) => {
    if (!classId) return
    const [rosterRows, assignmentRows] = await Promise.all([
      fetchClassRoster(classId),
      fetchClassAssignments(classId),
    ])
    setRoster(rosterRows)
    setAssignments(assignmentRows)
    const subs = await fetchAssignmentSubmissions(assignmentRows.map((a) => a.assignment_id))
    setSubmissions(subs)
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        await loadClasses()
      } catch (err) {
        setError(err.message || 'Failed to load classes.')
      } finally {
        setLoading(false)
      }
    })()
  }, [loadClasses])

  useEffect(() => {
    if (selectedClass?.class_id) {
      loadClassDetail(selectedClass.class_id).catch((err) => setError(err.message))
    }
  }, [selectedClass?.class_id, loadClassDetail])

  async function handleCreateClass(e) {
    e.preventDefault()
    try {
      const row = await createClass(newClassName, newClassTerm)
      setShowNewClass(false)
      setNewClassName('')
      await loadClasses()
      setSelectedClassId(row.class_id)
    } catch (err) {
      setError(err.message || 'Could not create class.')
    }
  }

  async function handleCreateAssignment(e) {
    e.preventDefault()
    if (!selectedClass) return
    try {
      await insertAssignment({
        class_id: selectedClass.class_id,
        title: newAssignment.title.trim(),
        instructions: newAssignment.instructions.trim() || null,
        due_at: newAssignment.dueAt || null,
      })
      setShowNewAssignment(false)
      setNewAssignment({ title: '', instructions: '', dueAt: '' })
      await loadClassDetail(selectedClass.class_id)
    } catch (err) {
      setError(err.message || 'Could not create assignment.')
    }
  }

  async function handleFeatureChange(features) {
    if (!selectedClass) return
    try {
      await updateClassFeatures(selectedClass.class_id, features)
      await loadClasses()
    } catch (err) {
      setError(err.message || 'Could not update features.')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-secondary" role="status" />
      </div>
    )
  }

  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      <p className="text-muted">
        Signed in as <strong>{profile.first_name} {profile.last_name}</strong> ({profile.email})
      </p>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">My classes</h5>
              <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowNewClass(true)}>
                <i className="bi bi-plus-lg" />
              </button>
            </div>
            <div className="list-group list-group-flush classroom-scroll">
              {classes.length === 0 ? (
                <div className="p-3 text-muted small">Create your first class.</div>
              ) : (
                classes.map((c) => (
                  <button
                    key={c.class_id}
                    type="button"
                    className={`list-group-item list-group-item-action ${
                      selectedClass?.class_id === c.class_id ? 'active' : ''
                    }`}
                    onClick={() => setSelectedClassId(c.class_id)}
                  >
                    <div className="fw-semibold">{c.name}</div>
                    <div className={`small ${selectedClass?.class_id === c.class_id ? 'text-white-50' : 'text-muted'}`}>
                      {c.term}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {selectedClass ? (
            <>
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <div>
                      <h4 className="mb-1">{selectedClass.name}</h4>
                      <p className="text-muted mb-0">{selectedClass.term}</p>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">Join code</div>
                      <code className="fs-5">{selectedClass.join_code}</code>
                      <div className="small mt-1">
                        <a href={`/classroom/join.html?code=${encodeURIComponent(selectedClass.join_code)}`}>
                          Student join link
                        </a>
                      </div>
                    </div>
                  </div>
                  <hr />
                  <div className="small fw-semibold mb-2">Enabled features</div>
                  <FeatureToggles features={selectedClass.features} onChange={handleFeatureChange} />
                </div>
              </div>

              <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                  <h5 className="mb-0">Roster ({roster.length})</h5>
                </div>
                <div className="card-body p-0">
                  {roster.length === 0 ? (
                    <p className="text-muted p-3 mb-0">Share the join code with students.</p>
                  ) : (
                    <div className="table-responsive classroom-scroll">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roster.map((row) => {
                            const s = row.classroom_students
                            if (!s) return null
                            return (
                              <tr key={s.student_id}>
                                <td>
                                  {s.first_name} {s.last_name}
                                </td>
                                <td className="small">{s.email}</td>
                                <td className="small">{s.phone}</td>
                                <td className="small">{row.joined_at?.slice(0, 10)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="card shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Assignments</h5>
                  <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowNewAssignment(true)}>
                    New assignment
                  </button>
                </div>
                <div className="card-body classroom-scroll-tall">
                  {assignments.length === 0 ? (
                    <p className="text-muted mb-0">No assignments yet.</p>
                  ) : (
                    assignments.map((a) => {
                      const subs = submissions.filter((s) => s.assignment_id === a.assignment_id)
                      return (
                        <div key={a.assignment_id} className="border rounded p-3 mb-3">
                          <div className="d-flex justify-content-between">
                            <strong>{a.title}</strong>
                            {a.due_at && <span className="badge bg-light text-dark border">Due {a.due_at}</span>}
                          </div>
                          <p className="small text-muted mb-2 classroom-submission-body">{a.instructions}</p>
                          <div className="small mb-2">{subs.length} submission(s)</div>
                          {subs.map((sub) => (
                            <div key={sub.submission_id} className="bg-light rounded p-2 small mb-1">
                              <strong>
                                {sub.classroom_students?.first_name} {sub.classroom_students?.last_name}
                              </strong>
                              <div className="classroom-submission-body">{sub.body}</div>
                            </div>
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted">Create a class to get started.</p>
          )}
        </div>
      </div>

      {showNewClass && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleCreateClass}>
              <div className="modal-header">
                <h5 className="modal-title">New class</h5>
                <button type="button" className="btn-close" onClick={() => setShowNewClass(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">Class name</label>
                  <input
                    className="form-control"
                    required
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Term</label>
                  <input
                    className="form-control"
                    value={newClassTerm}
                    onChange={(e) => setNewClassTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowNewClass(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-dark">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewAssignment && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleCreateAssignment}>
              <div className="modal-header">
                <h5 className="modal-title">New assignment</h5>
                <button type="button" className="btn-close" onClick={() => setShowNewAssignment(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">Title</label>
                  <input
                    className="form-control"
                    required
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Instructions</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={newAssignment.instructions}
                    onChange={(e) => setNewAssignment({ ...newAssignment, instructions: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Due date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newAssignment.dueAt}
                    onChange={(e) => setNewAssignment({ ...newAssignment, dueAt: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowNewAssignment(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-dark">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function StudentDashboard({ profile }) {
  const [enrollments, setEnrollments] = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')

  const load = useCallback(async () => {
    const enrollRows = await fetchStudentEnrollments()
    setEnrollments(enrollRows)
    const classIds = enrollRows.map((e) => e.class_id)
    if (classIds.length === 0) {
      setAssignments([])
      setSubmissions([])
      return
    }
    if (!selectedClassId || !classIds.includes(selectedClassId)) {
      setSelectedClassId(enrollRows[0].class_id)
    }
    const activeId = selectedClassId && classIds.includes(selectedClassId) ? selectedClassId : enrollRows[0].class_id
    const assignmentRows = await fetchClassAssignments(activeId)
    setAssignments(assignmentRows)
    const subs = await fetchAssignmentSubmissions(assignmentRows.map((a) => a.assignment_id))
    setSubmissions(subs.filter((s) => s.student_id === profile.student_id))
  }, [profile.student_id, selectedClassId])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        await load()
      } catch (err) {
        setError(err.message || 'Failed to load.')
      } finally {
        setLoading(false)
      }
    })()
  }, [load])

  async function handleSubmit(assignmentId) {
    const body = (drafts[assignmentId] || '').trim()
    if (!body) return
    try {
      await upsertSubmission({
        assignment_id: assignmentId,
        student_id: profile.student_id,
        body,
        submitted_at: new Date().toISOString(),
      })
      setDrafts((prev) => ({ ...prev, [assignmentId]: '' }))
      await load()
    } catch (err) {
      setError(err.message || 'Submit failed.')
    }
  }

  const activeEnrollment = enrollments.find((e) => e.class_id === selectedClassId) || enrollments[0]
  const activeClass = activeEnrollment?.classroom_classes
  const features = activeClass?.features || {}

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-secondary" role="status" />
      </div>
    )
  }

  if (enrollments.length === 0) {
    return (
      <div className="alert alert-info">
        You are not enrolled in a class yet.{' '}
        <a href="/classroom/join.html">Join with a class code</a>.
      </div>
    )
  }

  return (
    <>
      {error && <div className="alert alert-danger">{error}</div>}
      <p className="text-muted">
        Signed in as <strong>{profile.first_name} {profile.last_name}</strong>
      </p>

      {enrollments.length > 1 && (
        <div className="mb-3">
          <label className="form-label small">Class</label>
          <select
            className="form-select form-select-sm"
            style={{ maxWidth: 360 }}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {enrollments.map((e) => (
              <option key={e.class_id} value={e.class_id}>
                {e.classroom_classes?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h4 className="mb-1">{activeClass?.name}</h4>
          <p className="text-muted mb-0">{activeClass?.term}</p>
        </div>
      </div>

      {features.assignments !== false && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">Assignments</h5>
          </div>
          <div className="card-body classroom-scroll-tall">
            {assignments.map((a) => {
              const existing = submissions.find((s) => s.assignment_id === a.assignment_id)
              return (
                <div key={a.assignment_id} className="border rounded p-3 mb-3">
                  <strong>{a.title}</strong>
                  {a.due_at && <span className="badge bg-light text-dark border ms-2">Due {a.due_at}</span>}
                  <p className="small text-muted mt-2 mb-2 classroom-submission-body">{a.instructions}</p>
                  {existing ? (
                    <div className="alert alert-success py-2 small mb-0">
                      Submitted {new Date(existing.submitted_at).toLocaleString()}
                      <div className="mt-1 classroom-submission-body">{existing.body}</div>
                    </div>
                  ) : (
                    <>
                      <textarea
                        className="form-control form-control-sm mb-2"
                        rows={3}
                        placeholder="Your response…"
                        value={drafts[a.assignment_id] || ''}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [a.assignment_id]: e.target.value }))}
                      />
                      <button type="button" className="btn btn-sm btn-dark" onClick={() => handleSubmit(a.assignment_id)}>
                        Submit
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="row g-3">
        {features.legiscan && (
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">LegiScan</h5>
                <p className="small text-muted">Bill search will use the same API as SPAN Bill Research (coming next).</p>
              </div>
            </div>
          </div>
        )}
        {features.policy_toolkit && (
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Policy toolkit</h5>
                <p className="small text-muted">Curated guides and templates (content coming next).</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function ClassroomDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [roleInfo, setRoleInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          window.location.href = '/login.html?mode=classroom&next=' + encodeURIComponent('/classroom/dashboard.html')
          return
        }
        const role = await getClassroomSessionRole()
        if (!role?.role) {
          setError('No classroom account linked to this login. Ask an exec to link your teacher record, or join as a student.')
          setLoading(false)
          return
        }
        setRoleInfo(role)
      } catch (err) {
        setError(err.message || 'Failed to load classroom session.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login.html?mode=classroom'
  }

  return (
    <main className="classroom-dashboard-page">
      <div className="container py-4 py-lg-5">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <div>
            <h1 className="h3 mb-1">SPAN Classroom</h1>
            <p className="text-muted mb-0">Teacher & student workspace</p>
          </div>
          <div className="d-flex gap-2">
            <a href="/dashboard.html" className="btn btn-sm btn-outline-secondary">
              Chapter dashboard
            </a>
            <button type="button" className="btn btn-sm btn-outline-dark" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-secondary" role="status" />
          </div>
        ) : error ? (
          <div className="alert alert-warning">{error}</div>
        ) : roleInfo.role === 'teacher' ? (
          <TeacherDashboard profile={roleInfo} />
        ) : (
          <StudentDashboard profile={roleInfo} />
        )}
      </div>
    </main>
  )
}

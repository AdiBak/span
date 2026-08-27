import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAllClasses,
  fetchSchools,
  fetchTeachers,
  insertSchool,
  insertTeacher,
  provisionTeacher,
} from '../../lib/classroom'
import './ClassroomSection.css'

export default function ClassroomSection({ sectionId, sectionOrder }) {
  const [schools, setSchools] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showAddSchool, setShowAddSchool] = useState(false)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [provisioningId, setProvisioningId] = useState(null)
  const [newSchool, setNewSchool] = useState({ name: '', city: '', state: '', contactEmail: '' })
  const [newTeacher, setNewTeacher] = useState({
    schoolId: '',
    firstName: '',
    lastName: '',
    email: '',
  })

  const tree = useMemo(() => {
    const teachersBySchool = new Map()
    for (const t of teachers) {
      const key = t.school_id
      if (!teachersBySchool.has(key)) teachersBySchool.set(key, [])
      teachersBySchool.get(key).push(t)
    }
    const classesByTeacher = new Map()
    for (const c of classes) {
      const key = c.teacher_id
      if (!classesByTeacher.has(key)) classesByTeacher.set(key, [])
      classesByTeacher.get(key).push(c)
    }
    return schools.map((school) => {
      const schoolTeachers = (teachersBySchool.get(school.school_id) || []).map((teacher) => ({
        ...teacher,
        classes: classesByTeacher.get(teacher.teacher_id) || [],
      }))
      return { ...school, teachers: schoolTeachers }
    })
  }, [schools, teachers, classes])

  const orphanClasses = useMemo(() => {
    const teacherIds = new Set(teachers.map((t) => t.teacher_id))
    const schoolIds = new Set(schools.map((s) => s.school_id))
    return classes.filter(
      (c) => !teacherIds.has(c.teacher_id) || !schoolIds.has(c.school_id),
    )
  }, [schools, teachers, classes])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schoolRows, teacherRows, classRows] = await Promise.all([
        fetchSchools(),
        fetchTeachers(),
        fetchAllClasses(),
      ])
      setSchools(schoolRows)
      setTeachers(teacherRows)
      setClasses(classRows)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load classroom data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (schools.length && !newTeacher.schoolId) {
      setNewTeacher((t) => ({ ...t, schoolId: schools[0].school_id }))
    }
  }, [schools, newTeacher.schoolId])

  function openAddTeacher(schoolId) {
    setNewTeacher((t) => ({
      ...t,
      schoolId: schoolId || t.schoolId || schools[0]?.school_id || '',
    }))
    setShowAddTeacher(true)
  }

  async function handleAddSchool(e) {
    e.preventDefault()
    setMessage('')
    try {
      await insertSchool({
        name: newSchool.name.trim(),
        city: newSchool.city.trim() || null,
        state: newSchool.state.trim() || null,
        contact_email: newSchool.contactEmail.trim() || null,
      })
      setShowAddSchool(false)
      setNewSchool({ name: '', city: '', state: '', contactEmail: '' })
      setMessage('School added.')
      await load()
    } catch (err) {
      setError(err.message || 'Could not add school.')
    }
  }

  function formatProvisionMessage(result, email) {
    if (result.emailed) {
      return result.created_new_user
        ? `Teacher added. Login created and emailed to ${email}.`
        : `Teacher linked to existing account; login email sent to ${email}.`
    }
    if (result.temp_password) {
      return `Teacher linked, but email failed. Share this temporary password for ${email}: ${result.temp_password}`
    }
    return `Teacher linked to ${email}. Email was not sent — ask them to use Classroom login with their existing password.`
  }

  async function handleAddTeacher(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    try {
      const teacher = await insertTeacher({
        school_id: newTeacher.schoolId,
        first_name: newTeacher.firstName.trim(),
        last_name: newTeacher.lastName.trim(),
        email: newTeacher.email.trim().toLowerCase(),
      })
      setShowAddTeacher(false)
      const email = newTeacher.email.trim().toLowerCase()
      setNewTeacher({ schoolId: schools[0]?.school_id || '', firstName: '', lastName: '', email: '' })

      setProvisioningId(teacher.teacher_id)
      try {
        const result = await provisionTeacher(teacher.teacher_id)
        setMessage(formatProvisionMessage(result, email))
      } catch (provErr) {
        console.error(provErr)
        setError(
          `Teacher saved, but login provisioning failed: ${provErr.message || 'unknown error'}. Use “Create login” on their row to retry.`,
        )
      } finally {
        setProvisioningId(null)
      }
      await load()
    } catch (err) {
      setError(err.message || 'Could not add teacher.')
    }
  }

  async function handleProvisionTeacher(teacher) {
    setMessage('')
    setError('')
    setProvisioningId(teacher.teacher_id)
    try {
      const result = await provisionTeacher(teacher.teacher_id)
      setMessage(formatProvisionMessage(result, teacher.email))
      await load()
    } catch (err) {
      setError(err.message || 'Provisioning failed.')
    } finally {
      setProvisioningId(null)
    }
  }

  return (
    <section id={sectionId} className="mt-5 dashboard-section-anchor classroom-exec-section" style={{ order: sectionOrder }}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h3 className="mb-1">Classroom</h3>
          <p className="text-muted mb-0">
            Schools → teachers → classes. Adding a teacher creates their login and emails Classroom
            credentials. Teachers manage classes at{' '}
            <a href="/classroom/dashboard.html">classroom/dashboard.html</a>; students join via{' '}
            <a href="/classroom/join.html">classroom/join.html</a>.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-dark" onClick={() => setShowAddSchool(true)}>
            <i className="bi bi-plus-circle me-1" />
            Add school
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => openAddTeacher()}
            disabled={schools.length === 0}
          >
            <i className="bi bi-person-plus me-1" />
            Add teacher
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}
      {message && <div className="alert alert-success py-2 text-break">{message}</div>}

      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-secondary" role="status" />
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Directory</h5>
            <span className="small text-muted">
              {schools.length} school{schools.length === 1 ? '' : 's'} · {teachers.length} teacher
              {teachers.length === 1 ? '' : 's'} · {classes.length} class
              {classes.length === 1 ? '' : 'es'}
            </span>
          </div>
          <div className="classroom-scroll classroom-exec-tree">
            {tree.length === 0 ? (
              <p className="text-muted p-3 mb-0">No schools yet. Add a school to get started.</p>
            ) : (
              tree.map((school) => (
                <div key={school.school_id} className="classroom-school-block">
                  <div className="classroom-school-head">
                    <div className="min-w-0">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <strong className="text-truncate">{school.name}</strong>
                        <span className={`badge ${school.active ? 'bg-success' : 'bg-secondary'}`}>
                          {school.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="small text-muted text-truncate">
                        {[school.city, school.state].filter(Boolean).join(', ') || 'No location'}
                        {school.contact_email ? ` · ${school.contact_email}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary flex-shrink-0"
                      onClick={() => openAddTeacher(school.school_id)}
                    >
                      Add teacher
                    </button>
                  </div>

                  {school.teachers.length === 0 ? (
                    <p className="classroom-empty-note mb-0">No teachers at this school yet.</p>
                  ) : (
                    school.teachers.map((teacher) => (
                      <div key={teacher.teacher_id} className="classroom-teacher-block">
                        <div className="classroom-teacher-head">
                          <div className="min-w-0">
                            <div className="d-flex flex-wrap align-items-center gap-2">
                              <span className="fw-semibold">
                                {teacher.first_name} {teacher.last_name}
                              </span>
                              {teacher.user_id ? (
                                <span className="badge bg-success">Linked</span>
                              ) : (
                                <span className="badge bg-warning text-dark">Unlinked</span>
                              )}
                            </div>
                            <div className="small text-muted text-truncate">{teacher.email}</div>
                          </div>
                          {!teacher.user_id && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-dark flex-shrink-0"
                              disabled={provisioningId === teacher.teacher_id}
                              onClick={() => handleProvisionTeacher(teacher)}
                            >
                              {provisioningId === teacher.teacher_id ? 'Creating…' : 'Create login'}
                            </button>
                          )}
                        </div>

                        {teacher.classes.length === 0 ? (
                          <p className="classroom-empty-note mb-0">No classes yet (teacher creates these).</p>
                        ) : (
                          <ul className="classroom-class-list">
                            {teacher.classes.map((c) => (
                              <li key={c.class_id} className="classroom-class-item">
                                <div className="min-w-0">
                                  <div className="fw-medium text-truncate">
                                    {c.name}
                                    {c.term ? <span className="text-muted fw-normal"> · {c.term}</span> : null}
                                  </div>
                                  <div className="small">
                                    Join code <code>{c.join_code}</code>
                                  </div>
                                </div>
                                <span className={`badge ${c.archived ? 'bg-secondary' : 'bg-success'} flex-shrink-0`}>
                                  {c.archived ? 'Archived' : 'Active'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))
            )}

            {orphanClasses.length > 0 && (
              <div className="classroom-school-block">
                <div className="classroom-school-head">
                  <strong>Unassigned classes</strong>
                </div>
                <ul className="classroom-class-list">
                  {orphanClasses.map((c) => (
                    <li key={c.class_id} className="classroom-class-item">
                      <div className="min-w-0">
                        <div className="fw-medium text-truncate">{c.name}</div>
                        <div className="small text-muted text-truncate">
                          {c.classroom_teachers
                            ? `${c.classroom_teachers.first_name} ${c.classroom_teachers.last_name}`
                            : 'Unknown teacher'}
                          {' · '}
                          <code>{c.join_code}</code>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddSchool && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable">
            <form className="modal-content" onSubmit={handleAddSchool}>
              <div className="modal-header">
                <h5 className="modal-title">Add school</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddSchool(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">School name</label>
                  <input
                    className="form-control"
                    required
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                  />
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label">City</label>
                    <input
                      className="form-control"
                      value={newSchool.city}
                      onChange={(e) => setNewSchool({ ...newSchool, city: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">State</label>
                    <input
                      className="form-control"
                      value={newSchool.state}
                      onChange={(e) => setNewSchool({ ...newSchool, state: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="form-label">Contact email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={newSchool.contactEmail}
                    onChange={(e) => setNewSchool({ ...newSchool, contactEmail: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddSchool(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-dark">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddTeacher && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-scrollable">
            <form className="modal-content" onSubmit={handleAddTeacher}>
              <div className="modal-header">
                <h5 className="modal-title">Add teacher</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddTeacher(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">School</label>
                  <select
                    className="form-select"
                    required
                    value={newTeacher.schoolId}
                    onChange={(e) => setNewTeacher({ ...newTeacher, schoolId: e.target.value })}
                  >
                    {schools.map((s) => (
                      <option key={s.school_id} value={s.school_id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label">First name</label>
                    <input
                      className="form-control"
                      required
                      value={newTeacher.firstName}
                      onChange={(e) => setNewTeacher({ ...newTeacher, firstName: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Last name</label>
                    <input
                      className="form-control"
                      required
                      value={newTeacher.lastName}
                      onChange={(e) => setNewTeacher({ ...newTeacher, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">School email</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    placeholder="their school email"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  />
                  <small className="text-muted">
                    We’ll create their Classroom login and email them credentials.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddTeacher(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-dark" disabled={!!provisioningId}>
                  {provisioningId ? 'Saving…' : 'Save & create login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

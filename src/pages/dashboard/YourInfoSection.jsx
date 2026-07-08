import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  MEMBER_GRADE_OPTIONS,
  resolveMemberGrade,
  splitMemberGradeForForm,
} from '../../lib/memberGrades'

const cardStyle = {
  backgroundColor: '#f8f9fa',
  padding: '1.5rem',
  borderRadius: '12px',
  border: '1px solid #e9ecef',
  height: '100%',
}

const iconBoxStyle = {
  width: '40px',
  height: '40px',
  backgroundColor: '#fff',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '1rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
}

const labelStyle = {
  fontSize: '0.7rem',
  color: '#6c757d',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginBottom: '0.5rem',
  fontWeight: '500',
}

const valueStyle = {
  fontSize: '1.1rem',
  color: '#212529',
  fontWeight: 'bold',
}

function CardEditButton({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      className="btn btn-link btn-sm p-0 text-muted"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{ lineHeight: 1 }}
    >
      <i className="bi bi-pencil" />
    </button>
  )
}

function InfoCard({ iconClass, label, editable, editLabel, onEdit, editing, disabled, children }) {
  return (
    <div className="col-md-6">
      <div style={cardStyle}>
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div style={iconBoxStyle}>
            <i className={iconClass} style={{ fontSize: '1.25rem', color: '#16213e' }} />
          </div>
          {editable && !editing && (
            <CardEditButton onClick={onEdit} disabled={disabled} label={editLabel} />
          )}
        </div>
        <div style={labelStyle}>{label}</div>
        {children}
      </div>
    </div>
  )
}

export default function YourInfoSection({
  sectionId,
  sectionOrder,
  effectiveMember,
  viewAsData,
  formatDate,
  formatPhone,
  onMemberInfoUpdated,
}) {
  /** @type {'school' | 'location' | null} */
  const [editingField, setEditingField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [schoolDraft, setSchoolDraft] = useState({ school: '', grade: '', gradeOther: '' })
  const [locationDraft, setLocationDraft] = useState({ city: '', state: '' })

  const canEdit = !viewAsData

  const openSchoolEdit = () => {
    const { grade, gradeOther } = splitMemberGradeForForm(effectiveMember?.grade)
    setSchoolDraft({
      school: effectiveMember?.school_name || '',
      grade,
      gradeOther,
    })
    setError('')
    setEditingField('school')
  }

  const openLocationEdit = () => {
    setLocationDraft({
      city: effectiveMember?.city || '',
      state: effectiveMember?.state || '',
    })
    setError('')
    setEditingField('location')
  }

  const cancelEdit = () => {
    setEditingField(null)
    setError('')
  }

  const handleSaveSchool = async () => {
    const school = schoolDraft.school.trim()
    const resolvedGrade = resolveMemberGrade(schoolDraft.grade, schoolDraft.gradeOther)

    if (!school) {
      setError('School is required.')
      return
    }
    if (schoolDraft.grade === 'Other' && !resolvedGrade) {
      setError('Please specify your grade.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: rpcError } = await supabase.rpc('update_own_member_info', {
        p_school_name: school,
        p_city: null,
        p_state: null,
        p_grade: resolvedGrade,
      })
      if (rpcError) throw rpcError

      onMemberInfoUpdated?.({
        school_name: data?.school_name ?? school,
        grade: data?.grade ?? resolvedGrade,
      })
      setEditingField(null)
      setSuccess('School updated.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Could not save school.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLocation = async () => {
    const city = locationDraft.city.trim()
    const state = locationDraft.state.trim().toUpperCase()

    if (!city || !state) {
      setError('City and state are required.')
      return
    }
    if (state.length !== 2) {
      setError('State must be a 2-letter abbreviation (e.g. OH, TX).')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data, error: rpcError } = await supabase.rpc('update_own_member_info', {
        p_school_name: null,
        p_city: city,
        p_state: state,
        p_grade: null,
      })
      if (rpcError) throw rpcError

      onMemberInfoUpdated?.({
        city: data?.city ?? city,
        state: data?.state ?? state,
      })
      setEditingField(null)
      setSuccess('Location updated.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Could not save location.')
    } finally {
      setSaving(false)
    }
  }

  const locationDisplay =
    effectiveMember?.city && effectiveMember?.state
      ? `${effectiveMember.city}, ${effectiveMember.state}`
      : '-'

  const schoolDisplay = effectiveMember?.school_name || '-'
  const gradeDisplay = effectiveMember?.grade?.trim() || null

  return (
    <section
      id={sectionId}
      className="mt-5 dashboard-section-anchor"
      style={{ backgroundColor: 'transparent', order: sectionOrder }}
    >
      <h3 className="mb-4">Your Info</h3>

      {success && !editingField && <div className="alert alert-success py-2">{success}</div>}
      {error && editingField && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div
          style={{
            backgroundColor: '#16213e',
            padding: '2rem',
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1', minWidth: '250px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <i className="bi bi-calendar-check" style={{ fontSize: '1.5rem', color: '#fff' }} />
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: '#b0b0b0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.5rem',
                fontWeight: '500',
              }}
            >
              Started
            </div>
            <div style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold' }}>
              {formatDate(effectiveMember.start_date)}
            </div>
          </div>

          <div style={{ flex: '1', minWidth: '250px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <i className="bi bi-envelope-fill" style={{ fontSize: '1.5rem', color: '#fff' }} />
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: '#b0b0b0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '0.5rem',
                fontWeight: '500',
              }}
            >
              Email
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                color: '#fff',
                fontWeight: 'bold',
                wordBreak: 'break-word',
              }}
            >
              {effectiveMember.email || '-'}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '2rem' }}>
          <div className="row g-3">
            <InfoCard iconClass="bi bi-calendar-event" label="Birthday">
              <div style={valueStyle}>{formatDate(effectiveMember.dob)}</div>
            </InfoCard>

            <InfoCard
              iconClass="bi bi-geo-alt-fill"
              label="Location"
              editable={canEdit}
              editLabel="Edit location"
              onEdit={openLocationEdit}
              editing={editingField === 'location'}
              disabled={saving || editingField === 'school'}
            >
              {editingField === 'location' ? (
                <div className="mt-1">
                  <div className="row g-2">
                    <div className="col-8">
                      <label className="form-label small mb-1" htmlFor="yourInfoCity">
                        City
                      </label>
                      <input
                        id="yourInfoCity"
                        type="text"
                        className="form-control form-control-sm"
                        value={locationDraft.city}
                        onChange={(e) => setLocationDraft((d) => ({ ...d, city: e.target.value }))}
                        disabled={saving}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small mb-1" htmlFor="yourInfoState">
                        State
                      </label>
                      <input
                        id="yourInfoState"
                        type="text"
                        className="form-control form-control-sm text-uppercase"
                        value={locationDraft.state}
                        onChange={(e) =>
                          setLocationDraft((d) => ({ ...d, state: e.target.value.toUpperCase().slice(0, 2) }))
                        }
                        maxLength={2}
                        disabled={saving}
                        placeholder="OH"
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-dark btn-sm"
                      onClick={handleSaveLocation}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={valueStyle}>{locationDisplay}</div>
              )}
            </InfoCard>

            <InfoCard
              iconClass="bi bi-building"
              label="School"
              editable={canEdit}
              editLabel="Edit school and grade"
              onEdit={openSchoolEdit}
              editing={editingField === 'school'}
              disabled={saving || editingField === 'location'}
            >
              {editingField === 'school' ? (
                <div className="mt-1">
                  <div className="mb-2">
                    <label className="form-label small mb-1" htmlFor="yourInfoSchool">
                      School
                    </label>
                    <input
                      id="yourInfoSchool"
                      type="text"
                      className="form-control form-control-sm"
                      value={schoolDraft.school}
                      onChange={(e) => setSchoolDraft((d) => ({ ...d, school: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small mb-1" htmlFor="yourInfoGrade">
                      Grade
                    </label>
                    <select
                      id="yourInfoGrade"
                      className="form-select form-select-sm"
                      value={schoolDraft.grade}
                      onChange={(e) => setSchoolDraft((d) => ({ ...d, grade: e.target.value }))}
                      disabled={saving}
                    >
                      <option value="">Not specified</option>
                      {MEMBER_GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  {schoolDraft.grade === 'Other' && (
                    <div className="mb-2">
                      <label className="form-label small mb-1" htmlFor="yourInfoGradeOther">
                        Grade (other)
                      </label>
                      <input
                        id="yourInfoGradeOther"
                        type="text"
                        className="form-control form-control-sm"
                        value={schoolDraft.gradeOther}
                        onChange={(e) => setSchoolDraft((d) => ({ ...d, gradeOther: e.target.value }))}
                        disabled={saving}
                        placeholder="e.g. 8th grade"
                      />
                    </div>
                  )}
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-dark btn-sm"
                      onClick={handleSaveSchool}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={valueStyle}>{schoolDisplay}</div>
                  {gradeDisplay && <div className="text-muted small mt-1">{gradeDisplay}</div>}
                </>
              )}
            </InfoCard>

            <InfoCard iconClass="bi bi-telephone-fill" label="Phone">
              <div style={valueStyle}>{formatPhone(effectiveMember.phone)}</div>
            </InfoCard>
          </div>
        </div>
      </div>
    </section>
  )
}

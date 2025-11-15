import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'
import './DashboardPage.css'

const IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'

function DashboardPage() {
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [volunteerEntries, setVolunteerEntries] = useState([])
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showVolunteerModal, setShowVolunteerModal] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [volunteerForm, setVolunteerForm] = useState({
    jobTitle: '',
    jobDesc: '',
    startTime: '',
    endTime: '',
    inputMode: 'datetime', // 'datetime' or 'hours'
    hours: '',
    workDate: ''
  })
  const [volunteerError, setVolunteerError] = useState('')
  const [qrPassword, setQrPassword] = useState('')
  const [qrPasswordError, setQrPasswordError] = useState('')
  const [verifiedPassword, setVerifiedPassword] = useState('')

  // Helper functions
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatPhone = (phone) => {
    if (!phone) return '-'
    const cleaned = ('' + phone).replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone
  }

  const formatDuration = (start, end, hours = null) => {
    if (hours !== null && hours !== undefined) {
      // Hours-only mode
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }
    // DateTime mode
    const ms = new Date(end) - new Date(start)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const formatDateLong = (d) => {
    return new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const shrinkText = (ctx, text, maxWidth, fontBase) => {
    let size = fontBase
    ctx.font = `${size}px ${ctx.fontFamily || 'sans-serif'}`
    while (ctx.measureText(text).width > maxWidth && size > 24) {
      size -= 2
      ctx.font = `${size}px ${ctx.fontFamily || 'sans-serif'}`
    }
    return size
  }

  // Load member data
  useEffect(() => {
    loadMemberData()
  }, [])

  const loadMemberData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login.html'
      return
    }

    const email = session.user.email
    const { data: memberData, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error || !memberData) {
      console.error(error)
      setLoading(false)
      return
    }

    setMember(memberData)
    setLoading(false)
    loadVolunteerEntries(memberData)
  }

  // Load volunteer entries
  const loadVolunteerEntries = async (memberData) => {
    if (!memberData) return

    const { data: entries, error } = await supabase
      .from('volunteers')
      .select(`*, members:member_id(first_name, last_name, image, email)`)
      .order('start_timestamp', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    // Filter entries - executive directors see all, others see only their own
    const filtered = entries.filter(e => 
      memberData.is_executive_director === true || e.member_id === memberData.member_id
    )

    setVolunteerEntries(filtered || [])
  }

  // Password change
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Passwords do not match.')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })
      if (error) throw error
      setPasswordMessage('Password updated successfully!')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setVerifiedPassword(passwordForm.newPassword)
    } catch (err) {
      setPasswordMessage(err.message || 'Failed to update password.')
    }
  }

  // SPANCard generation
  const handleDownloadSpanCard = () => {
    if (!member) return
    setQrPassword('')
    setQrPasswordError('')
    setShowPasswordModal(true)
  }

  const handleQrPasswordConfirm = async () => {
    const password = qrPassword.trim() || verifiedPassword
    if (!password) {
      setQrPasswordError('Password required.')
      return
    }

    setQrPasswordError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: member.email,
        password
      })
      if (error) {
        setQrPasswordError('Incorrect password.')
        return
      }
      setShowPasswordModal(false)
      setVerifiedPassword(password)
      const timestamp = new Date().toISOString()
      await generateSpanCard(password, timestamp)
    } catch (err) {
      setQrPasswordError('Error verifying password.')
    }
  }

  const generateSpanCard = async (password, timestamp) => {
    if (!member) return

    const canvas = document.createElement('canvas')
    canvas.width = 2160
    canvas.height = 1200
    const ctx = canvas.getContext('2d')
    ctx.fontFamily = window.getComputedStyle(document.body).fontFamily || 'sans-serif'

    const loadImage = (src) => new Promise(res => {
      if (!src) return res(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      img.onload = () => res(img)
      img.onerror = () => res(null)
    })

    const [bgImage, profileImage] = await Promise.all([
      loadImage('/assets/images/misc/SPANCard.jpg'),
      loadImage(member.image
        ? `${IMAGE_BASE_URL}/${member.image}`
        : null)
    ])

    // Background
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = '#16213e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Left half content area
    const leftW = canvas.width / 2
    const padding = 100

    // Profile circle
    if (profileImage) {
      const pSize = 250
      const pX = padding
      const pY = 250
      ctx.save()
      ctx.beginPath()
      ctx.arc(pX + pSize / 2, pY + pSize / 2, pSize / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(profileImage, pX, pY, pSize, pSize)
      ctx.restore()
    }

    // Text content
    const textX = padding
    let y = 600
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,0.3)'
    ctx.shadowBlur = 10

    const fullName = `${member.first_name} ${member.last_name}`
    const fontSize = shrinkText(ctx, fullName, leftW - 2 * padding, 100)
    ctx.font = `bold ${fontSize}px ${ctx.fontFamily}`
    ctx.fillText(fullName, textX, y)
    y += fontSize + 20

    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#fdf0d5'
    ctx.font = `600 72px ${ctx.fontFamily}`
    ctx.fillText(member.role || '', textX, y)
    y += 80

    ctx.fillStyle = '#fff'
    ctx.font = `500 56px ${ctx.fontFamily}`
    ctx.fillText(member.school_name || '', textX, y)
    y += 80

    ctx.font = `300 48px ${ctx.fontFamily}`
    if (member.city || member.state) {
      ctx.fillText(
        `${member.city || ''}${member.city && member.state ? ', ' : ''}${member.state || ''}`,
        textX, y
      )
    }
    y += 60
    if (member.phone) ctx.fillText(formatPhone(member.phone), textX, y)
    y += 60
    if (member.email) ctx.fillText(member.email, textX, y)
    y += 60
    if (member.start_date) ctx.fillText(`Member since ${formatDate(member.start_date)}`, textX, y)

    // QR Code on right half
    const qrSize = 600
    const qrX = leftW + (leftW - qrSize) / 2
    const qrY = (canvas.height - qrSize) / 2 + 75

    // Draw translucent rounded box
    const boxPadding = 40
    const boxX = qrX - boxPadding
    const boxY = qrY - boxPadding
    const boxW = qrSize + boxPadding * 2
    const boxH = qrSize + boxPadding * 2

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 4
    ctx.beginPath()
    const r = 24
    ctx.moveTo(boxX + r, boxY)
    ctx.lineTo(boxX + boxW - r, boxY)
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r)
    ctx.lineTo(boxX + boxW, boxY + boxH - r)
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH)
    ctx.lineTo(boxX + r, boxY + boxH)
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r)
    ctx.lineTo(boxX, boxY + r)
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    // Generate QR code
    const qrPayload = JSON.stringify({
      email: member.email,
      password,
      timestamp
    })

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: qrSize,
      color: { dark: '#000000', light: '#ffffff' },
      margin: 0
    })

    const qrImg = await loadImage(qrDataUrl)
    if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

    // Download image
    const link = document.createElement('a')
    link.download = `${member.first_name}_${member.last_name}_SPANCard.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Volunteer hours management
  const handleAddVolunteer = () => {
    setVolunteerForm({ 
      jobTitle: '', 
      jobDesc: '', 
      startTime: '', 
      endTime: '',
      inputMode: 'datetime',
      hours: '',
      workDate: ''
    })
    setVolunteerError('')
    setShowVolunteerModal(true)
  }

  const handleSaveVolunteer = async () => {
    const { jobTitle, jobDesc, startTime, endTime, inputMode, hours, workDate } = volunteerForm
    setVolunteerError('')

    if (!jobTitle || !jobDesc) {
      setVolunteerError('Job title and description are required.')
      return
    }

    let startTimeObj, endTimeObj

    if (inputMode === 'hours') {
      // Hours-only mode
      if (!hours || !workDate) {
        setVolunteerError('Hours and work date are required.')
        return
      }

      const hoursNum = parseFloat(hours)
      if (isNaN(hoursNum) || hoursNum <= 0) {
        setVolunteerError('Hours must be a positive number.')
        return
      }

      // Set start time to the work date at 00:00
      const workDateObj = new Date(workDate)
      workDateObj.setHours(0, 0, 0, 0)
      startTimeObj = workDateObj

      // Set end time to start time + hours
      endTimeObj = new Date(startTimeObj.getTime() + hoursNum * 3600000)
    } else {
      // DateTime mode
      if (!startTime || !endTime) {
        setVolunteerError('Start time and end time are required.')
        return
      }

      startTimeObj = new Date(startTime)
      endTimeObj = new Date(endTime)
      if (endTimeObj <= startTimeObj) {
        setVolunteerError('End time must be after start time.')
        return
      }
    }

    try {
      const { error } = await supabase.from('volunteers').insert([{
        volunteering_job_title: jobTitle,
        volunteering_job_desc: jobDesc,
        start_timestamp: startTimeObj.toISOString(),
        end_timestamp: endTimeObj.toISOString(),
        request_submit_timestamp: new Date().toISOString(),
        member_id: member.member_id,
        approved: 'waiting',
        supervisor_comment: ''
      }])

      if (error) throw error
      setShowVolunteerModal(false)
      await loadVolunteerEntries(member)
    } catch (err) {
      setVolunteerError(err.message || 'Failed to save entry.')
    }
  }

  const handleApproveEntry = async (entryId) => {
    await supabase.from('volunteers').update({ approved: 'approved' }).eq('id', entryId)
    await loadVolunteerEntries(member)
  }

  const handleDenyEntry = async (entryId) => {
    await supabase.from('volunteers').update({ approved: 'denied' }).eq('id', entryId)
    await loadVolunteerEntries(member)
  }

  const handleCommentEntry = async (entryId) => {
    setSelectedEntryId(entryId)
    const { data } = await supabase
      .from('volunteers')
      .select('supervisor_comment')
      .eq('id', entryId)
      .single()
    setCommentText(data?.supervisor_comment || '')
    setShowCommentModal(true)
  }

  const handleSaveComment = async () => {
    if (!selectedEntryId) return
    await supabase
      .from('volunteers')
      .update({ supervisor_comment: commentText.trim() })
      .eq('id', selectedEntryId)
    setShowCommentModal(false)
    setSelectedEntryId(null)
    setCommentText('')
    await loadVolunteerEntries(member)
  }

  const handleDeleteEntry = async () => {
    if (!selectedEntryId) return
    await supabase.from('volunteers').delete().eq('id', selectedEntryId)
    setShowDeleteModal(false)
    setSelectedEntryId(null)
    await loadVolunteerEntries(member)
  }

  if (loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger">Failed to load member data.</div>
      </div>
    )
  }

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  const infoFields = [
    { label: 'Full Name', value: fullName },
    { label: 'Role', value: member.role || '-' },
    { label: 'Start Date', value: formatDate(member.start_date) },
    { label: 'Date of Birth', value: formatDate(member.dob) },
    { label: 'School', value: member.school_name || '-' },
    { label: 'Location', value: member.city && member.state ? `${member.city}, ${member.state}` : '-' },
    { label: 'Email', value: member.email || '-' },
    { label: 'Phone', value: formatPhone(member.phone) },
  ]

  // Group volunteer entries by member_id
  const groupedEntries = {}
  volunteerEntries.forEach(entry => {
    if (!groupedEntries[entry.member_id]) {
      groupedEntries[entry.member_id] = []
    }
    groupedEntries[entry.member_id].push(entry)
  })

  return (
    <div className="dashboard-page">
      <section className="subpage-hero d-flex align-items-center text-white text-center position-relative">
        <div className="parallax-bg" aria-hidden="true"></div>
        <div className="container position-relative z-1">
          <h1 className="display-3 fw-bold mb-2" data-aos="fade-up">Dashboard</h1>
          <p className="lead" data-aos="fade-up" data-aos-delay="200">Manage your SPAN membership.</p>
        </div>
      </section>

      <div className="container my-5">
        {/* Profile Header */}
        <div className="text-center mb-5">
          {member.image && (
            <img
              src={`${IMAGE_BASE_URL}/${member.image}`}
              className="rounded-circle border border-dark border-3 mb-3"
              alt="Profile Image"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
            />
          )}
          <h2>{fullName}</h2>
          <p className="text-muted">{member.role || '-'}</p>
          <div className="mt-2">
            {member.linkedin && (
              <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-dark fs-4 me-2">
                <i className="bi bi-linkedin"></i>
              </a>
            )}
            {member.instagram && (
              <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="text-dark fs-4">
                <i className="bi bi-instagram"></i>
              </a>
            )}
          </div>
          <button className="btn btn-dark mt-3" onClick={handleDownloadSpanCard}>
            <i className="bi bi-person-vcard"></i> Download My SPANCard
          </button>
        </div>

        {/* Info Cards */}
        <h3>Your Info</h3>
        <div className="row">
          {infoFields.map((field, index) => (
            <div key={index} className="col-md-6 mb-3">
              <div className="card info-card impact-card h-100 shadow-sm">
                <div className="card-body">
                  <div className="field-label fw-semibold text-muted small">{field.label}</div>
                  <div className="card-text">{field.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Volunteer Hours Section */}
        <section className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3>Volunteer Hours</h3>
            <button className="btn btn-dark" onClick={handleAddVolunteer}>
              <i className="bi bi-plus-circle me-2"></i>Add Entry
            </button>
          </div>
          <div>
            {Object.entries(groupedEntries).map(([memberId, entries]) => {
              const firstEntry = entries[0]
              const isOwn = firstEntry.member_id === member.member_id
              const memberData = firstEntry.members || {}
              const memberName = isOwn ? 'You' : `${memberData.first_name || ''} ${memberData.last_name || ''}`.trim()
              const memberImage = memberData.image
                ? `${IMAGE_BASE_URL}/${memberData.image}`
                : `${IMAGE_BASE_URL}/default.jpg`

              return (
                <div key={memberId} className="accordion mb-3 shadow-sm border rounded">
                  <h2 className="accordion-header">
                    <button
                      className="accordion-button collapsed bg-light text-dark"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#collapseUser${memberId}`}
                      aria-expanded="false"
                    >
                      <div className="d-flex align-items-center gap-2">
                        <img src={memberImage} alt={memberName} className="rounded-circle" width="32" height="32" />
                        <span>{memberName}</span>
                        <span className="fw-bold ms-2 text-muted">
                          ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                        </span>
                      </div>
                    </button>
                  </h2>
                  <div id={`collapseUser${memberId}`} className="accordion-collapse collapse" data-bs-parent=".accordion">
                    <div className="accordion-body">
                      <div className="accordion">
                        {entries.map(entry => {
                          const start = new Date(entry.start_timestamp)
                          const end = new Date(entry.end_timestamp)
                          const duration = formatDuration(entry.start_timestamp, entry.end_timestamp)
                          const statusColor = entry.approved === 'approved' ? { bg: 'bg-success', color: 'white' } :
                            entry.approved === 'denied' ? { bg: 'bg-danger', color: 'white' } :
                              { bg: 'bg-warning', color: 'black' }

                          return (
                            <div key={entry.id} className="accordion-item mb-2 shadow-sm border rounded">
                              <h2 className="accordion-header">
                                <button
                                  className="accordion-button collapsed bg-white text-dark"
                                  type="button"
                                  data-bs-toggle="collapse"
                                  data-bs-target={`#collapse${entry.id}`}
                                  aria-expanded="false"
                                >
                                  <div className="d-flex w-100 justify-content-between align-items-center">
                                    <span><i className="bi bi-calendar-event me-2"></i>{formatDateLong(start)}</span>
                                    <span className={`badge ${statusColor.bg} text-capitalize`} style={{ color: statusColor.color }}>
                                      {entry.approved}
                                    </span>
                                    <span className="fw-bold ms-3">{duration}</span>
                                  </div>
                                </button>
                              </h2>
                              <div id={`collapse${entry.id}`} className="accordion-collapse collapse" data-bs-parent={`#collapseUser${memberId} .accordion`}>
                                <div className="accordion-body">
                                  <p><strong>{entry.volunteering_job_title}</strong> - {entry.volunteering_job_desc}</p>
                                  <p><i className="bi bi-clock me-1"></i>Start: {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  <p><i className="bi bi-clock-history me-1"></i>End: {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  <p><i className="bi bi-person-workspace me-1"></i>Supervisor Comment: {entry.supervisor_comment || '-'}</p>
                                  <p><i className="bi bi-upload me-1"></i>Submitted: {new Date(entry.request_submit_timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  <div className="mt-2 d-flex gap-2 flex-wrap">
                                    {member.is_executive_director === true && !isOwn && (
                                      <>
                                        <button
                                          className="btn btn-sm btn-outline-success"
                                          onClick={() => handleApproveEntry(entry.id)}
                                        >
                                          <i className="bi bi-check-circle me-1"></i>Approve
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-danger"
                                          onClick={() => handleDenyEntry(entry.id)}
                                        >
                                          <i className="bi bi-x-circle me-1"></i>Deny
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
                                          onClick={() => handleCommentEntry(entry.id)}
                                        >
                                          <i className="bi bi-chat-left-text me-1"></i>Add Comment
                                        </button>
                                      </>
                                    )}
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => {
                                        setSelectedEntryId(entry.id)
                                        setShowDeleteModal(true)
                                      }}
                                    >
                                      <i className="bi bi-trash me-1"></i>Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {volunteerEntries.length === 0 && (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-clock-history display-4 d-block mb-3"></i>
                <p>No volunteer entries found. Add your first entry to get started.</p>
              </div>
            )}
          </div>
        </section>

        {/* Password Change */}
        <section className="mt-5">
          <h3>Change Password</h3>
          <div className="card mt-3">
            <div className="card-body">
              <form onSubmit={handlePasswordChange}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="newPassword" className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-dark">Update Password</button>
                {passwordMessage && (
                  <div className={`mt-2 ${passwordMessage.includes('success') ? 'text-success' : 'text-danger'}`}>
                    {passwordMessage}
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      </div>

      {/* SPAN Card Password Modal */}
      {showPasswordModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowPasswordModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Password</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowPasswordModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Confirm your password to generate your SPANCard:</p>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Your password"
                    value={qrPassword}
                    onChange={(e) => setQrPassword(e.target.value)}
                  />
                  {qrPasswordError && <div className="text-danger mt-2">{qrPasswordError}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleQrPasswordConfirm}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Add Volunteer Entry Modal */}
      {showVolunteerModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowVolunteerModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Volunteer Entry</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowVolunteerModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Job Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={volunteerForm.jobTitle}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, jobTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Job Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={volunteerForm.jobDesc}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, jobDesc: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Input Method</label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="inputMode"
                        id="inputModeDatetime"
                        checked={volunteerForm.inputMode === 'datetime'}
                        onChange={() => setVolunteerForm({ ...volunteerForm, inputMode: 'datetime' })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="inputModeDatetime">
                        <i className="bi bi-calendar-range me-1"></i>Date & Time Range
                      </label>
                      <input
                        type="radio"
                        className="btn-check"
                        name="inputMode"
                        id="inputModeHours"
                        checked={volunteerForm.inputMode === 'hours'}
                        onChange={() => setVolunteerForm({ ...volunteerForm, inputMode: 'hours' })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="inputModeHours">
                        <i className="bi bi-clock me-1"></i>Hours Only
                      </label>
                    </div>
                  </div>
                  {volunteerForm.inputMode === 'datetime' ? (
                    <div className="mb-3 row">
                      <div className="col-md-6">
                        <label className="form-label">Start Time</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={volunteerForm.startTime}
                          onChange={(e) => setVolunteerForm({ ...volunteerForm, startTime: e.target.value })}
                          required={volunteerForm.inputMode === 'datetime'}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">End Time</label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={volunteerForm.endTime}
                          onChange={(e) => setVolunteerForm({ ...volunteerForm, endTime: e.target.value })}
                          required={volunteerForm.inputMode === 'datetime'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 row">
                      <div className="col-md-6">
                        <label className="form-label">Work Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={volunteerForm.workDate}
                          onChange={(e) => setVolunteerForm({ ...volunteerForm, workDate: e.target.value })}
                          required={volunteerForm.inputMode === 'hours'}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Hours</label>
                        <input
                          type="number"
                          className="form-control"
                          step="0.25"
                          min="0.25"
                          value={volunteerForm.hours}
                          onChange={(e) => setVolunteerForm({ ...volunteerForm, hours: e.target.value })}
                          placeholder="e.g., 2.5 for 2 hours 30 minutes"
                          required={volunteerForm.inputMode === 'hours'}
                        />
                        <small className="text-muted">Enter hours as a decimal (e.g., 2.5 = 2h 30m)</small>
                      </div>
                    </div>
                  )}
                  {volunteerError && <div className="text-danger mt-2">{volunteerError}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowVolunteerModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveVolunteer}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Supervisor Comment Modal */}
      {showCommentModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowCommentModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Supervisor Comment</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowCommentModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <textarea
                    className="form-control"
                    rows="3"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  ></textarea>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowCommentModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveComment}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowDeleteModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">Delete Entry</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  Are you sure you want to delete this volunteer entry? This cannot be undone.
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteEntry}
                  >
                    Delete
                  </button>
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

export default DashboardPage


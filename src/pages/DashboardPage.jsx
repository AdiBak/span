import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'
import RegistrationForm from '../components/RegistrationForm'
import './DashboardPage.css'

const IMAGE_BASE_URL = 'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/members-images'

function DashboardPage() {
  console.log('DashboardPage component rendering...')
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
  const [showBillModal, setShowBillModal] = useState(false)
  const [billForm, setBillForm] = useState({
    state: '',
    name: '',
    position: 'Support',
    description: '',
    billDate: '',
    legiscanLink: '',
    collaborators: []
  })
  const [billPdfFile, setBillPdfFile] = useState(null)
  const [billError, setBillError] = useState('')
  const [billSuccess, setBillSuccess] = useState('')
  const [allMembers, setAllMembers] = useState([])
  const [allBills, setAllBills] = useState([])
  const [showEditBillModal, setShowEditBillModal] = useState(false)
  const [showDeleteBillModal, setShowDeleteBillModal] = useState(false)
  const [selectedBillForEdit, setSelectedBillForEdit] = useState(null)
  const [selectedBillForDelete, setSelectedBillForDelete] = useState(null)
  const [editBillForm, setEditBillForm] = useState({
    state: '',
    name: '',
    position: 'Support',
    description: '',
    billDate: '',
    legiscanLink: '',
    collaborators: []
  })
  const [editBillPdfFile, setEditBillPdfFile] = useState(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showImportApplicationModal, setShowImportApplicationModal] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [allMembersForManagement, setAllMembersForManagement] = useState([])
  const [memberForm, setMemberForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    originalEmail: '',
    role: '',
    active: true,
    startDate: '',
    dob: '',
    schoolName: '',
    city: '',
    state: '',
    phone: '',
    linkedin: '',
    instagram: '',
    notes: '',
    bio: '',
    volunteer: false,
    applications: false,
    bills: false,
    registration: false
  })
  const [memberError, setMemberError] = useState('')
  const [memberSuccess, setMemberSuccess] = useState('')
  const [applications, setApplications] = useState([])
  const [applicationFilter, setApplicationFilter] = useState('pending') // 'all', 'pending', 'accepted', 'rejected'
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [applicationNotes, setApplicationNotes] = useState('')
  const [showDeleteApplicationModal, setShowDeleteApplicationModal] = useState(false)

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

  // Helper function to check if member has a specific permission
  const hasPermission = (permission) => {
    if (!member) {
      console.log(`hasPermission(${permission}): No member data`)
      return false
    }
    const hasPerm = member[permission] === true || member[permission] === 'true'
    return hasPerm
  }

  // Load member data
  useEffect(() => {
    loadMemberData()
    loadAllMembers()
  }, [])

  // Load additional data based on permissions after member is loaded
  useEffect(() => {
    if (member) {
      if (hasPermission('bills')) {
        loadAllBills()
      }
      if (hasPermission('applications')) {
        loadApplications()
      }
      if (hasPermission('registration')) {
        loadAllMembersForManagement()
      }
    }
  }, [member])

  // Load all members for collaborator selection
  const loadAllMembers = async () => {
    const { data: membersData, error } = await supabase
      .from('members')
      .select('member_id, first_name, last_name')
      .order('last_name', { ascending: true })

    if (error) {
      console.error('Error loading members:', error)
      return
    }

    setAllMembers(membersData || [])
  }

  // Load all members for management (registration permission required)
  const loadAllMembersForManagement = async () => {
    const { data: membersData, error } = await supabase
      .from('members')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) {
      console.error('Error loading members for management:', error)
      return
    }

    setAllMembersForManagement(membersData || [])
  }

  // Load all bills for management (executive directors only)
  const loadAllBills = async () => {
    const { data: billsData, error } = await supabase
      .from('bills')
      .select('*')
      .order('bill_date', { ascending: false })

    if (error) {
      console.error('Error loading bills:', error)
      return
    }

      setAllBills(billsData || [])
    }

  // Load all applications (executive directors only)
  const loadApplications = async () => {
    const { data: applicationsData, error } = await supabase
      .from('applications')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading applications:', error)
      return
    }

    setApplications(applicationsData || [])
  }

  const loadMemberData = async () => {
    try {
      console.log('Loading member data...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        setLoading(false)
        return
      }
      
      if (!session) {
        console.log('No session, redirecting to login')
        window.location.href = '/login.html'
        return
      }

      const email = session.user.email
      console.log('Fetching member data for email:', email)
      
      const { data: memberData, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .maybeSingle()

      if (error) {
        console.error('Error fetching member data:', error)
        setLoading(false)
        return
      }

      if (!memberData) {
        console.error('No member data found for email:', email)
        setLoading(false)
        return
      }

      console.log('Member data loaded:', {
        email: memberData.email,
        registration_complete: memberData.registration_complete,
        volunteer: memberData.volunteer,
        applications: memberData.applications,
        bills: memberData.bills,
        registration: memberData.registration
      })
      
      setMember(memberData)
      setLoading(false)
      loadVolunteerEntries(memberData)
    } catch (err) {
      console.error('Unexpected error in loadMemberData:', err)
      setLoading(false)
    }
  }

  // Load volunteer entries
  const loadVolunteerEntries = async (memberData) => {
    if (!memberData) return

    // Query volunteer entries
    const { data: entries, error } = await supabase
      .from('volunteers')
      .select('*')
      .order('start_timestamp', { ascending: false })

    if (error) {
      console.error('Error loading volunteer entries:', error)
      setVolunteerEntries([])
      return
    }
    
    // If we have entries, fetch member data separately
    if (entries && entries.length > 0) {
      const memberIds = [...new Set(entries.map(e => e.member_id))]
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('member_id, first_name, last_name, image, email')
        .in('member_id', memberIds)
      
      if (membersError) {
        console.error('Error fetching members:', membersError)
      }
      
      // Map members to entries
      const membersMap = {}
      if (membersData) {
        membersData.forEach(m => {
          membersMap[m.member_id] = m
        })
      }
      
      // Add member data to each entry
      entries.forEach(entry => {
        entry.members = membersMap[entry.member_id] || {}
      })
    }

    // Filter entries - members with volunteer permission see all, others see only their own
    const canManageVolunteers = memberData.volunteer === true || memberData.volunteer === 'true'
    const filtered = entries.filter(e => 
      canManageVolunteers || e.member_id === memberData.member_id
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
      loadImage('/images/misc/SPANCard.jpg'),
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

  // Bill upload management
  const handleAddBill = () => {
    setBillForm({
      state: '',
      name: '',
      position: 'Support',
      description: '',
      billDate: '',
      legiscanLink: '',
      collaborators: []
    })
    setBillPdfFile(null)
    setBillError('')
    setBillSuccess('')
    setShowBillModal(true)
  }

  const handleBillCollaboratorToggle = (memberId) => {
    const member = allMembers.find(m => m.member_id === memberId)
    if (!member) return

    const fullName = `${member.first_name} ${member.last_name}`
    const current = billForm.collaborators || []
    
    if (current.includes(fullName)) {
      setBillForm({
        ...billForm,
        collaborators: current.filter(name => name !== fullName)
      })
    } else {
      setBillForm({
        ...billForm,
        collaborators: [...current, fullName]
      })
    }
  }

  const handleSaveBill = async () => {
    const { state, name, position, description, billDate, legiscanLink, collaborators } = billForm
    setBillError('')
    setBillSuccess('')

    // Validation
    if (!state || !name || !description || !billDate) {
      setBillError('State, name, description, and bill date are required.')
      return
    }

    try {
      // 1. Upload PDF if provided
      let pdfUploaded = true
      if (billPdfFile) {
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedState = state.replace(/[^a-zA-Z0-9]/g, '_')
        const pdfPath = `${sanitizedState}/${sanitizedName}.pdf`
        
        const { error: uploadError } = await supabase.storage
          .from('proposals')
          .upload(pdfPath, billPdfFile, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          console.error('PDF upload error:', uploadError)
          setBillError('Failed to upload PDF. ' + uploadError.message)
          return
        }
        pdfUploaded = true
      }

      // 2. Insert bill to database
      const { data: billData, error: insertError } = await supabase
        .from('bills')
        .insert([{
          state: state.trim(),
          name: name.trim(),
          position: position,
          description: description.trim(),
          bill_date: billDate,
          legiscan_link: legiscanLink.trim() || null,
          bill_collaborators: collaborators.length > 0 ? collaborators : null
        }])
        .select()
        .single()

      if (insertError) {
        console.error('Bill insert error:', insertError)
        setBillError('Failed to save bill. ' + insertError.message)
        return
      }

      setBillSuccess(`Bill "${state} ${name}" uploaded successfully!`)
      setBillForm({
        state: '',
        name: '',
        position: 'Support',
        description: '',
        billDate: '',
        legiscanLink: '',
        collaborators: []
      })
      setBillPdfFile(null)
      await loadAllBills() // Refresh bills list
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setShowBillModal(false)
        setBillSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Error saving bill:', err)
      setBillError(err.message || 'Failed to save bill.')
    }
  }

  // Bill edit/delete handlers for dashboard
  const handleSaveEditBill = async () => {
    const { state, name, position, description, billDate, legiscanLink, collaborators } = editBillForm
    setBillError('')
    setBillSuccess('')

    if (!state || !name || !description || !billDate) {
      setBillError('State, name, description, and bill date are required.')
      return
    }

    try {
      // 1. Upload new PDF if provided
      if (editBillPdfFile) {
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_')
        const sanitizedState = state.replace(/[^a-zA-Z0-9]/g, '_')
        const pdfPath = `${sanitizedState}/${sanitizedName}.pdf`
        
        const { error: uploadError } = await supabase.storage
          .from('proposals')
          .upload(pdfPath, editBillPdfFile, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          setBillError('Failed to upload PDF. ' + uploadError.message)
          return
        }
      }

      // 2. Update bill in database
      console.log('Attempting to update bill:', selectedBillForEdit.bill_id)
      console.log('Update data:', {
        state: state.trim(),
        name: name.trim(),
        position: position,
        description: description.trim(),
        bill_date: billDate,
        legiscan_link: legiscanLink.trim() || null,
        bill_collaborators: collaborators.length > 0 ? collaborators : null
      })
      
      const { data, error: updateError } = await supabase
        .from('bills')
        .update({
          state: state.trim(),
          name: name.trim(),
          position: position,
          description: description.trim(),
          bill_date: billDate,
          legiscan_link: legiscanLink.trim() || null,
          bill_collaborators: collaborators.length > 0 ? collaborators : null
        })
        .eq('bill_id', selectedBillForEdit.bill_id)
        .select()

      if (updateError) {
        console.error('Update error:', updateError)
        setBillError('Failed to update bill. ' + updateError.message)
        return
      }

      console.log('Bill updated successfully:', data)

      setBillSuccess(`Bill "${state} ${name}" updated successfully!`)
      await loadAllBills()
      
      setTimeout(() => {
        setShowEditBillModal(false)
        setBillSuccess('')
        setSelectedBillForEdit(null)
      }, 1500)
    } catch (err) {
      setBillError(err.message || 'Failed to update bill.')
    }
  }

  const handleConfirmDeleteBill = async () => {
    if (!selectedBillForDelete) {
      console.error('No bill selected for deletion')
      return
    }

    console.log('Attempting to delete bill:', selectedBillForDelete.bill_id, selectedBillForDelete.name)
    setBillError('') // Clear any previous errors

    try {
      // Try to delete PDF in both formats (sanitized and original with spaces)
      const sanitizedName = selectedBillForDelete.name.replace(/[^a-zA-Z0-9]/g, '_')
      const sanitizedState = selectedBillForDelete.state.replace(/[^a-zA-Z0-9]/g, '_')
      const sanitizedPath = `${sanitizedState}/${sanitizedName}.pdf`
      
      // Original format with spaces
      const originalPath = `${selectedBillForDelete.state}/${selectedBillForDelete.name}.pdf`
      
      console.log('Attempting to delete PDFs:', { sanitizedPath, originalPath })
      
      // Try to delete both (one will fail if it doesn't exist, but that's okay)
      const pathsToDelete = [sanitizedPath, originalPath]
      const { error: storageError } = await supabase.storage
        .from('proposals')
        .remove(pathsToDelete)
      
      // Don't fail if PDF doesn't exist - just log it
      if (storageError) {
        console.warn('PDF deletion warning (may not exist):', storageError)
      } else {
        console.log('PDF deletion successful (or files did not exist)')
      }

      // Delete bill from database
      console.log('Attempting to delete bill from database:', selectedBillForDelete.bill_id)
      const { data, error } = await supabase
        .from('bills')
        .delete()
        .eq('bill_id', selectedBillForDelete.bill_id)
        .select()

      if (error) {
        console.error('Database delete error:', error)
        throw error
      }

      console.log('Bill deleted successfully:', data)

      setShowDeleteBillModal(false)
      setSelectedBillForDelete(null)
      setBillError('')
      await loadAllBills()
    } catch (err) {
      console.error('Delete error:', err)
      const errorMessage = err.message || 'Unknown error occurred'
      setBillError(`Failed to delete bill: ${errorMessage}`)
      // Keep modal open so user can see the error
    }
  }

  // Helper function to generate SPAN email from first and last name
  const generateSpanEmail = (firstName, lastName) => {
    if (!firstName || !lastName) return ''
    const first = firstName.toLowerCase().trim()
    const last = lastName.toLowerCase().trim()
    return `${first}.${last}@spanationwide.org`
  }

  // Member management handlers
  const handleAddMember = () => {
    setEditingMemberId(null)
    setMemberForm({
      firstName: '',
      lastName: '',
      email: '',
      originalEmail: '',
      role: '',
      active: true,
      startDate: '',
      dob: '',
      schoolName: '',
      city: '',
      state: '',
      phone: '',
      linkedin: '',
      instagram: '',
      notes: '',
      bio: '',
      volunteer: false,
      applications: false,
      bills: false,
      registration: false
    })
    setMemberError('')
    setMemberSuccess('')
    setShowMemberModal(true)
  }

  const handleImportFromApplication = (application) => {
    // Parse full_name into first and last name
    const nameParts = (application.full_name || '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    // Generate SPAN email
    const spanEmail = generateSpanEmail(firstName, lastName)
    
    // Prefill form with application data
    setMemberForm({
      firstName: firstName,
      lastName: lastName,
      email: spanEmail,
      originalEmail: application.email || '',
      role: '', // Leave role empty for admin to fill
      active: true,
      startDate: '',
      dob: '',
      schoolName: application.school || '',
      city: '',
      state: application.state || '',
      phone: application.phone_number || '',
      linkedin: '',
      instagram: '',
      notes: application.additional_info || '',
      bio: '',
      volunteer: false,
      applications: false,
      bills: false,
      registration: false
    })
    
    setShowImportApplicationModal(false)
    setMemberError('')
    setMemberSuccess('')
  }

  // Auto-update SPAN email when first/last name changes
  useEffect(() => {
    if (!editingMemberId && showMemberModal && memberForm.firstName && memberForm.lastName && !memberForm.email) {
      const generatedEmail = generateSpanEmail(memberForm.firstName, memberForm.lastName)
      if (generatedEmail) {
        setMemberForm(prev => ({ ...prev, email: generatedEmail }))
      }
    }
  }, [memberForm.firstName, memberForm.lastName, editingMemberId, showMemberModal])

  const handleEditMember = (memberToEdit) => {
    setEditingMemberId(memberToEdit.member_id)
    setMemberForm({
      firstName: memberToEdit.first_name || '',
      lastName: memberToEdit.last_name || '',
      email: memberToEdit.email || '',
      originalEmail: memberToEdit.original_email || '',
      role: memberToEdit.role || '',
      active: memberToEdit.active !== false,
      startDate: memberToEdit.start_date || '',
      dob: memberToEdit.dob || '',
      schoolName: memberToEdit.school_name || '',
      city: memberToEdit.city || '',
      state: memberToEdit.state || '',
      phone: memberToEdit.phone ? formatPhone(memberToEdit.phone.toString()) : '',
      linkedin: memberToEdit.linkedin || '',
      instagram: memberToEdit.instagram || '',
      notes: memberToEdit.notes || '',
      bio: memberToEdit.bio || '',
      volunteer: memberToEdit.volunteer === true || memberToEdit.volunteer === 'true',
      applications: memberToEdit.applications === true || memberToEdit.applications === 'true',
      bills: memberToEdit.bills === true || memberToEdit.bills === 'true',
      registration: memberToEdit.registration === true || memberToEdit.registration === 'true'
    })
    setMemberError('')
    setMemberSuccess('')
    setShowMemberModal(true)
  }

  const handleSaveMember = async () => {
    const { firstName, lastName, email, originalEmail, role, active, startDate, dob, schoolName, city, state, phone, linkedin, instagram, notes, bio, volunteer, applications, bills, registration } = memberForm
    setMemberError('')
    setMemberSuccess('')

    // Validation
    if (!firstName || !lastName || !email || !originalEmail || !role) {
      setMemberError('First name, last name, email, original email, and role are required.')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setMemberError('Please enter a valid SPAN email address.')
      return
    }
    if (!emailRegex.test(originalEmail)) {
      setMemberError('Please enter a valid personal email address.')
      return
    }

    try {
      if (editingMemberId) {
        // Update existing member
        const { data: memberDataResult, error: updateError } = await supabase.rpc('update_member', {
          p_member_id: editingMemberId,
          p_first_name: firstName.trim(),
          p_last_name: lastName.trim(),
          p_email: email.trim().toLowerCase(),
          p_original_email: originalEmail.trim().toLowerCase(),
          p_role: role.trim(),
          p_active: active,
          p_start_date: startDate || null,
          p_dob: dob || null,
          p_school_name: schoolName.trim() || null,
          p_city: city.trim() || null,
          p_state: state.trim() || null,
          p_phone: phone ? phone.replace(/\D/g, '') : null,
          p_linkedin: linkedin.trim() || null,
          p_instagram: instagram.trim() || null,
          p_notes: notes.trim() || null,
          p_bio: bio.trim() || null,
          p_volunteer: volunteer,
          p_applications: applications,
          p_bills: bills,
          p_registration: registration
        })

        if (updateError) {
          console.error('Member update error:', updateError)
          setMemberError('Failed to update member. ' + updateError.message)
          return
        }

        setMemberSuccess(`Member "${firstName} ${lastName}" updated successfully!`)
      } else {
        // Create new member
        const { data: memberDataResult, error: insertError } = await supabase.rpc('create_member', {
          p_first_name: firstName.trim(),
          p_last_name: lastName.trim(),
          p_email: email.trim().toLowerCase(),
          p_original_email: originalEmail.trim().toLowerCase(),
          p_role: role.trim(),
          p_active: active,
          p_start_date: startDate || null,
          p_dob: dob || null,
          p_school_name: schoolName.trim() || null,
          p_city: city.trim() || null,
          p_state: state.trim() || null,
          p_phone: phone ? phone.replace(/\D/g, '') : null,
          p_linkedin: linkedin.trim() || null,
          p_instagram: instagram.trim() || null,
          p_notes: notes.trim() || null,
          p_bio: bio.trim() || null,
          p_volunteer: volunteer,
          p_applications: applications,
          p_bills: bills,
          p_registration: registration
        })

        if (insertError) {
          console.error('Member insert error:', insertError)
          setMemberError('Failed to save member. ' + insertError.message)
          return
        }

        setMemberSuccess(`Member "${firstName} ${lastName}" added successfully! They will receive an email invitation to set up their account.`)
      }

      // Reset form
      setMemberForm({
        firstName: '',
        lastName: '',
        email: '',
        originalEmail: '',
        role: '',
        active: true,
        startDate: '',
        dob: '',
        schoolName: '',
        city: '',
        state: '',
        phone: '',
        linkedin: '',
        instagram: '',
        notes: '',
        bio: '',
        volunteer: false,
        applications: false,
        bills: false,
        registration: false
      })
      setEditingMemberId(null)
      
      // Refresh members lists
      await loadAllMembers()
      if (hasPermission('registration')) {
        await loadAllMembersForManagement()
      }
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowMemberModal(false)
        setMemberSuccess('')
      }, 3000)
    } catch (err) {
      console.error('Error saving member:', err)
      setMemberError(err.message || 'Failed to save member.')
    }
  }

  // Application management handlers
  const handleViewApplication = (application) => {
    setSelectedApplication(application)
    setApplicationNotes(application.notes || '')
    setShowApplicationModal(true)
  }

  const handleUpdateApplicationStatus = async (status) => {
    if (!selectedApplication) return

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: status,
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString(),
          notes: applicationNotes.trim() || null
        })
        .eq('application_id', selectedApplication.application_id)

      if (error) {
        console.error('Error updating application:', error)
        alert('Failed to update application status: ' + error.message)
        return
      }

      await loadApplications()
      setShowApplicationModal(false)
      setSelectedApplication(null)
      setApplicationNotes('')
    } catch (err) {
      console.error('Error updating application:', err)
      alert('Failed to update application status.')
    }
  }

  const handleDeleteApplication = async () => {
    if (!selectedApplication) return

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('application_id', selectedApplication.application_id)

      if (error) {
        console.error('Error deleting application:', error)
        alert('Failed to delete application: ' + error.message)
        return
      }

      // Close both modals and refresh the list
      setShowDeleteApplicationModal(false)
      setShowApplicationModal(false)
      setSelectedApplication(null)
      await loadApplications()
    } catch (err) {
      console.error('Error deleting application:', err)
      alert('Failed to delete application.')
    }
  }

  const filteredApplications = applicationFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === applicationFilter)

  const handleEditBillCollaboratorToggle = (memberId) => {
    const member = allMembers.find(m => m.member_id === memberId)
    if (!member) return

    const fullName = `${member.first_name} ${member.last_name}`
    const current = editBillForm.collaborators || []
    
    if (current.includes(fullName)) {
      setEditBillForm({
        ...editBillForm,
        collaborators: current.filter(name => name !== fullName)
      })
    } else {
      setEditBillForm({
        ...editBillForm,
        collaborators: [...current, fullName]
      })
    }
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

  // Handler to refresh member data after registration
  const handleRegistrationComplete = async () => {
    await loadMemberData()
  }

  if (!member) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger">Failed to load member data.</div>
      </div>
    )
  }

  // Show registration form if registration is not complete
  if (!member.registration_complete) {
    return (
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <RegistrationForm member={member} onComplete={handleRegistrationComplete} />
          </div>
        </div>
      </div>
    )
  }

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()

  // Helper function to get state file name for icons
  const getStateFileName = (state) => {
    if (!state) return 'United States'
    
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
      'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
      'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
      'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
      'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
      'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
      'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
      'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
      'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming', 'US': 'United States'
    }
    
    const stateUpper = state.toUpperCase()
    if (stateMap[stateUpper]) {
      return stateMap[stateUpper]
    }
    
    const fullStateNames = Object.values(stateMap)
    const matched = fullStateNames.find(name => name.toLowerCase() === state.toLowerCase())
    if (matched) {
      return matched
    }
    
    return state
  }

  // Group volunteer entries by member_id
  const groupedEntries = {}
  volunteerEntries.forEach(entry => {
    if (!groupedEntries[entry.member_id]) {
      groupedEntries[entry.member_id] = []
    }
    groupedEntries[entry.member_id].push(entry)
  })

  // Group bills by state
  const billsByState = {}
  allBills.forEach(bill => {
    const state = bill.state || 'Unknown'
    if (!billsByState[state]) {
      billsByState[state] = []
    }
    billsByState[state].push(bill)
  })
  
  // Sort states alphabetically
  const sortedStates = Object.keys(billsByState).sort((a, b) => {
    // Put "Unknown" at the end
    if (a === 'Unknown') return 1
    if (b === 'Unknown') return -1
    return a.localeCompare(b)
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

        {/* Your Info Section - Split Design */}
        <section className="mt-5" style={{ backgroundColor: 'transparent' }}>
          <h3 className="mb-4">Your Info</h3>
          <div className="card shadow-sm border-0" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            {/* Top Section - Dark Background */}
            <div style={{ 
              backgroundColor: '#16213e', 
              padding: '2rem',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap'
            }}>
              {/* Started Field */}
              <div style={{ flex: '1', minWidth: '250px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <i className="bi bi-calendar-check" style={{ fontSize: '1.5rem', color: '#fff' }}></i>
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#b0b0b0', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  Started
                </div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  color: '#fff', 
                  fontWeight: 'bold'
                }}>
                  {formatDate(member.start_date)}
                </div>
              </div>

              {/* Email Field */}
              <div style={{ flex: '1', minWidth: '250px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <i className="bi bi-envelope-fill" style={{ fontSize: '1.5rem', color: '#fff' }}></i>
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: '#b0b0b0', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  Email
                </div>
                <div style={{ 
                  fontSize: '1.25rem', 
                  color: '#fff', 
                  fontWeight: 'bold',
                  wordBreak: 'break-word'
                }}>
                  {member.email || '-'}
                </div>
              </div>
            </div>

            {/* Bottom Section - Light Background with Grid */}
            <div style={{ 
              backgroundColor: '#fff', 
              padding: '2rem'
            }}>
              <div className="row g-3">
                {/* Birthday */}
                <div className="col-md-6">
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '1.5rem', 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: '#fff', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <i className="bi bi-calendar-event" style={{ fontSize: '1.25rem', color: '#16213e' }}></i>
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: '#6c757d', 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      Birthday
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      color: '#212529', 
                      fontWeight: 'bold'
                    }}>
                      {formatDate(member.dob)}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="col-md-6">
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '1.5rem', 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: '#fff', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <i className="bi bi-geo-alt-fill" style={{ fontSize: '1.25rem', color: '#16213e' }}></i>
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: '#6c757d', 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      Location
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      color: '#212529', 
                      fontWeight: 'bold'
                    }}>
                      {member.city && member.state ? `${member.city}, ${member.state}` : '-'}
                    </div>
                  </div>
                </div>

                {/* School */}
                <div className="col-md-6">
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '1.5rem', 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: '#fff', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <i className="bi bi-building" style={{ fontSize: '1.25rem', color: '#16213e' }}></i>
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: '#6c757d', 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      School
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      color: '#212529', 
                      fontWeight: 'bold'
                    }}>
                      {member.school_name || '-'}
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="col-md-6">
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '1.5rem', 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: '#fff', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <i className="bi bi-telephone-fill" style={{ fontSize: '1.25rem', color: '#16213e' }}></i>
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: '#6c757d', 
                      textTransform: 'uppercase', 
                      letterSpacing: '1px',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      Phone
                    </div>
                    <div style={{ 
                      fontSize: '1.1rem', 
                      color: '#212529', 
                      fontWeight: 'bold'
                    }}>
                      {formatPhone(member.phone)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
                                    {hasPermission('volunteer') && !isOwn && (
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

        {/* Bill Upload Section - Bills Permission Required */}
        {(() => {
          const hasBills = hasPermission('bills')
          console.log('Rendering Bills section?', hasBills, 'member.bills =', member?.bills)
          return hasBills
        })() && (
          <section className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3>Bill Management</h3>
              <button className="btn btn-dark" onClick={handleAddBill}>
                <i className="bi bi-plus-circle me-2"></i>Upload New Bill
              </button>
            </div>
            
            {/* Bills List - Grouped by State */}
            {allBills.length > 0 ? (
              <div>
                {sortedStates.map(state => {
                  const stateBills = billsByState[state]
                  const stateFileName = getStateFileName(state)
                  
                  return (
                    <div key={state} className="accordion mb-3 shadow-sm border rounded">
                      <h2 className="accordion-header">
                        <button
                          className="accordion-button collapsed bg-light text-dark"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapseState${state.replace(/\s+/g, '')}`}
                          aria-expanded="false"
                        >
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={`/images/states/${stateFileName}.svg`}
                              alt={`${state} flag`}
                              style={{ width: '32px', height: 'auto' }}
                              onError={(e) => {
                                e.target.src = '/images/states/United States.svg'
                              }}
                            />
                            <span>{state}</span>
                            <span className="fw-bold ms-2 text-muted">
                              ({stateBills.length} {stateBills.length === 1 ? 'bill' : 'bills'})
                            </span>
                          </div>
                        </button>
                      </h2>
                      <div id={`collapseState${state.replace(/\s+/g, '')}`} className="accordion-collapse collapse">
                        <div className="accordion-body">
                          <div className="accordion" id={`stateAccordion${state.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`}>
                            {stateBills.map(bill => (
                              <div key={bill.bill_id} className="accordion-item mb-2 shadow-sm border rounded">
                                <h2 className="accordion-header">
                                  <button
                                    className="accordion-button collapsed bg-white text-dark"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target={`#collapseBill${bill.bill_id}`}
                                    aria-expanded="false"
                                  >
                                    <div className="d-flex w-100 justify-content-between align-items-center">
                                      <span className="fw-bold">{bill.name}</span>
                                      <span className={`badge me-3 ${
                                        bill.position === 'Support' ? 'bg-success' :
                                        bill.position === 'Oppose' ? 'bg-danger' :
                                        'bg-warning text-dark'
                                      }`}>
                                        {bill.position}
                                      </span>
                                      <span className="text-muted">{formatDate(bill.bill_date)}</span>
                                    </div>
                                  </button>
                                </h2>
                                <div id={`collapseBill${bill.bill_id}`} className="accordion-collapse collapse" data-bs-parent={`#stateAccordion${state.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`}>
                                  <div className="accordion-body">
                                    <div className="mb-3">
                                      <strong>Description:</strong>
                                      <p className="mt-1 mb-0">{bill.description || '-'}</p>
                                    </div>
                                    {bill.legiscan_link && (
                                      <div className="mb-3">
                                        <strong>LegiScan Link:</strong>
                                        <p className="mt-1 mb-0">
                                          <a href={bill.legiscan_link} target="_blank" rel="noopener noreferrer" className="text-primary">
                                            {bill.legiscan_link}
                                          </a>
                                        </p>
                                      </div>
                                    )}
                                    {bill.bill_collaborators && bill.bill_collaborators.length > 0 && (
                                      <div className="mb-3">
                                        <strong>Collaborators:</strong>
                                        <p className="mt-1 mb-0">
                                          {bill.bill_collaborators.join(', ')}
                                        </p>
                                      </div>
                                    )}
                                    <div className="mt-3 d-flex gap-2 flex-wrap">
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => {
                                          setSelectedBillForEdit(bill)
                                          setEditBillForm({
                                            state: bill.state || '',
                                            name: bill.name || '',
                                            position: bill.position || 'Support',
                                            description: bill.description || '',
                                            billDate: bill.bill_date ? new Date(bill.bill_date).toISOString().split('T')[0] : '',
                                            legiscanLink: bill.legiscan_link || '',
                                            collaborators: bill.bill_collaborators || []
                                          })
                                          setEditBillPdfFile(null)
                                          setBillError('')
                                          setBillSuccess('')
                                          setShowEditBillModal(true)
                                        }}
                                      >
                                        <i className="bi bi-pencil me-1"></i>Edit
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => {
                                          setSelectedBillForDelete(bill)
                                          setShowDeleteBillModal(true)
                                        }}
                                      >
                                        <i className="bi bi-trash me-1"></i>Delete
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
                <p>No bills found. Upload your first bill to get started.</p>
              </div>
            )}
          </section>
        )}

        {/* Member Management Section - Registration Permission Required */}
        {(() => {
          const hasReg = hasPermission('registration')
          console.log('Rendering Member Management section?', hasReg, 'member.registration =', member?.registration)
          return hasReg
        })() && (
          <section className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3>Member Management</h3>
              <button className="btn btn-dark" onClick={handleAddMember}>
                <i className="bi bi-person-plus me-2"></i>Add New Member
              </button>
            </div>
            
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              When you add a new member, they will automatically receive an email invitation to set up their account.
            </div>

            {/* Active and Inactive Members in 2 columns */}
            <div className="row g-4">
              {/* Active Members */}
              <div className="col-lg-6">
                <div className="mb-4">
                  <h4 className="mb-3">Active Members</h4>
                  {allMembersForManagement.filter(m => m.active !== false).length > 0 ? (
                    <div className="table-responsive member-table-container">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Phone</th>
                            <th>Permissions</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allMembersForManagement.filter(m => m.active !== false).map(memberItem => (
                            <tr key={memberItem.member_id}>
                              <td>{memberItem.first_name} {memberItem.last_name}</td>
                              <td>
                                <a href={`mailto:${memberItem.email}`}>{memberItem.email}</a>
                              </td>
                              <td>{memberItem.role || '-'}</td>
                              <td>
                                {memberItem.phone ? (
                                  <a href={`tel:${memberItem.phone}`}>{formatPhone(memberItem.phone.toString())}</a>
                                ) : '-'}
                              </td>
                              <td>
                                <div className="d-flex gap-1 flex-wrap">
                                  {memberItem.volunteer && <span className="badge bg-primary">Volunteer</span>}
                                  {memberItem.applications && <span className="badge bg-success">Applications</span>}
                                  {memberItem.bills && <span className="badge bg-info">Bills</span>}
                                  {memberItem.registration && <span className="badge bg-warning text-dark">Registration</span>}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleEditMember(memberItem)}
                                    title="Edit"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <a
                                    href={`mailto:${memberItem.email}`}
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Email"
                                  >
                                    <i className="bi bi-envelope"></i>
                                  </a>
                                  {memberItem.phone && (
                                    <a
                                      href={`sms:${memberItem.phone}`}
                                      className="btn btn-sm btn-outline-secondary"
                                      title="Text"
                                    >
                                      <i className="bi bi-chat-dots"></i>
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted">No active members found.</p>
                  )}
                </div>
              </div>

              {/* Inactive Members */}
              <div className="col-lg-6">
                <div className="mb-4">
                  <h4 className="mb-3">Inactive Members</h4>
                  {allMembersForManagement.filter(m => m.active === false).length > 0 ? (
                    <div className="table-responsive member-table-container">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Phone</th>
                            <th>Permissions</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allMembersForManagement.filter(m => m.active === false).map(memberItem => (
                            <tr key={memberItem.member_id} className="opacity-75">
                              <td>{memberItem.first_name} {memberItem.last_name}</td>
                              <td>
                                <a href={`mailto:${memberItem.email}`}>{memberItem.email}</a>
                              </td>
                              <td>{memberItem.role || '-'}</td>
                              <td>
                                {memberItem.phone ? (
                                  <a href={`tel:${memberItem.phone}`}>{formatPhone(memberItem.phone.toString())}</a>
                                ) : '-'}
                              </td>
                              <td>
                                <div className="d-flex gap-1 flex-wrap">
                                  {memberItem.volunteer && <span className="badge bg-primary">Volunteer</span>}
                                  {memberItem.applications && <span className="badge bg-success">Applications</span>}
                                  {memberItem.bills && <span className="badge bg-info">Bills</span>}
                                  {memberItem.registration && <span className="badge bg-warning text-dark">Registration</span>}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleEditMember(memberItem)}
                                    title="Edit"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <a
                                    href={`mailto:${memberItem.email}`}
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Email"
                                  >
                                    <i className="bi bi-envelope"></i>
                                  </a>
                                  {memberItem.phone && (
                                    <a
                                      href={`sms:${memberItem.phone}`}
                                      className="btn btn-sm btn-outline-secondary"
                                      title="Text"
                                    >
                                      <i className="bi bi-chat-dots"></i>
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted">No inactive members found.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Applications Section - Applications Permission Required */}
        {(() => {
          const hasApps = hasPermission('applications')
          console.log('Rendering Applications section?', hasApps, 'member.applications =', member?.applications)
          return hasApps
        })() && (
          <section className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3>New Member Applications</h3>
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setApplicationFilter('all')}
                >
                  All ({applications.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => setApplicationFilter('pending')}
                >
                  Pending ({applications.filter(a => a.status === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'accepted' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setApplicationFilter('accepted')}
                >
                  Accepted ({applications.filter(a => a.status === 'accepted').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setApplicationFilter('rejected')}
                >
                  Rejected ({applications.filter(a => a.status === 'rejected').length})
                </button>
              </div>
            </div>

            {filteredApplications.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Grade</th>
                      <th>School</th>
                      <th>State</th>
                      <th>Hours/Week</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => (
                      <tr key={app.application_id}>
                        <td>{app.full_name}</td>
                        <td>
                          <a href={`mailto:${app.email}`}>{app.email}</a>
                        </td>
                        <td>{app.grade}</td>
                        <td>{app.school}</td>
                        <td>{app.state}</td>
                        <td>{app.hours_per_week}</td>
                        <td>{formatDateLong(app.submitted_at)}</td>
                        <td>
                          <span className={`badge ${
                            app.status === 'pending' ? 'bg-warning text-dark' :
                            app.status === 'accepted' ? 'bg-success' :
                            'bg-danger'
                          }`}>
                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleViewApplication(app)}
                          >
                            <i className="bi bi-eye me-1"></i>View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
                <p>No {applicationFilter === 'all' ? '' : applicationFilter} applications found.</p>
              </div>
            )}
          </section>
        )}

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

      {/* Bill Upload Modal */}
      {showBillModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowBillModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Upload New Bill</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowBillModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">State <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., California, Texas"
                      value={billForm.state}
                      onChange={(e) => setBillForm({ ...billForm, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Name/Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., HB 1234, AB 567"
                      value={billForm.name}
                      onChange={(e) => setBillForm({ ...billForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Position <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={billForm.position}
                      onChange={(e) => setBillForm({ ...billForm, position: e.target.value })}
                      required
                    >
                      <option value="Support">Support</option>
                      <option value="Oppose">Oppose</option>
                      <option value="Support If Amended">Support If Amended</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Describe the bill and SPAN's position..."
                      value={billForm.description}
                      onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={billForm.billDate}
                      onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">LegiScan Link</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://legiscan.com/..."
                      value={billForm.legiscanLink}
                      onChange={(e) => setBillForm({ ...billForm, legiscanLink: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Proposal PDF</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            setBillError('Please upload a PDF file.')
                            return
                          }
                          setBillPdfFile(file)
                        }
                      }}
                    />
                    <small className="text-muted">Optional: Upload the proposal PDF. Will be stored as {billForm.state}/{billForm.name || 'bill'}.pdf</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Collaborators</label>
                    <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {allMembers.length === 0 ? (
                        <p className="text-muted small mb-0">Loading members...</p>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {allMembers.map(m => {
                            const fullName = `${m.first_name} ${m.last_name}`
                            const isSelected = billForm.collaborators.includes(fullName)
                            return (
                              <button
                                key={m.member_id}
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleBillCollaboratorToggle(m.member_id)}
                              >
                                {fullName}
                                {isSelected && <i className="bi bi-check ms-1"></i>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <small className="text-muted">Select members who worked on this bill</small>
                  </div>
                  {billError && <div className="text-danger mt-2">{billError}</div>}
                  {billSuccess && <div className="text-success mt-2">{billSuccess}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowBillModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveBill}
                  >
                    Upload Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Edit Bill Modal - Dashboard */}
      {showEditBillModal && selectedBillForEdit && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowEditBillModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Bill</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowEditBillModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">State <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editBillForm.state}
                      onChange={(e) => setEditBillForm({ ...editBillForm, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Name/Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editBillForm.name}
                      onChange={(e) => setEditBillForm({ ...editBillForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Position <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={editBillForm.position}
                      onChange={(e) => setEditBillForm({ ...editBillForm, position: e.target.value })}
                      required
                    >
                      <option value="Support">Support</option>
                      <option value="Oppose">Oppose</option>
                      <option value="Support If Amended">Support If Amended</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={editBillForm.description}
                      onChange={(e) => setEditBillForm({ ...editBillForm, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Bill Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={editBillForm.billDate}
                      onChange={(e) => setEditBillForm({ ...editBillForm, billDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">LegiScan Link</label>
                    <input
                      type="url"
                      className="form-control"
                      value={editBillForm.legiscanLink}
                      onChange={(e) => setEditBillForm({ ...editBillForm, legiscanLink: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Proposal PDF (New)</label>
                    <input
                      type="file"
                      className="form-control"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.type !== 'application/pdf') {
                            setBillError('Please upload a PDF file.')
                            return
                          }
                          setEditBillPdfFile(file)
                        }
                      }}
                    />
                    <small className="text-muted">Optional: Upload a new PDF to replace the existing one</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Collaborators</label>
                    <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {allMembers.length === 0 ? (
                        <p className="text-muted small mb-0">Loading members...</p>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {allMembers.map(m => {
                            const fullName = `${m.first_name} ${m.last_name}`
                            const isSelected = editBillForm.collaborators.includes(fullName)
                            return (
                              <button
                                key={m.member_id}
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => handleEditBillCollaboratorToggle(m.member_id)}
                              >
                                {fullName}
                                {isSelected && <i className="bi bi-check ms-1"></i>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <small className="text-muted">Select members who worked on this bill</small>
                  </div>
                  {billError && <div className="text-danger mt-2">{billError}</div>}
                  {billSuccess && <div className="text-success mt-2">{billSuccess}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowEditBillModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveEditBill}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Delete Bill Confirmation Modal - Dashboard */}
      {showDeleteBillModal && selectedBillForDelete && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowDeleteBillModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">Delete Bill</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteBillModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete <strong>{selectedBillForDelete.state} {selectedBillForDelete.name}</strong>?</p>
                  <p className="text-muted small mb-0">This will also delete the associated PDF file. This action cannot be undone.</p>
                  {billError && <div className="text-danger mt-2">{billError}</div>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowDeleteBillModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDeleteBill}
                  >
                    Delete Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowMemberModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '800px' }}>
              <div className="modal-content">
                <div className="modal-header d-flex justify-content-between align-items-center w-100">
                  <h5 className="modal-title mb-0">{editingMemberId ? 'Edit Member' : 'Add New Member'}</h5>
                  <div className="d-flex gap-2 align-items-center">
                    {!editingMemberId && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowImportApplicationModal(true)}
                      >
                        <i className="bi bi-download me-1"></i>Import from Application
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowMemberModal(false)
                        setEditingMemberId(null)
                      }}
                    ></button>
                  </div>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {memberError && <div className="alert alert-danger">{memberError}</div>}
                  {memberSuccess && <div className="alert alert-success">{memberSuccess}</div>}
                  
                  <div className="row g-3">
                    {/* Required Fields */}
                    <div className="col-md-6">
                      <label className="form-label">First Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.firstName}
                        onChange={(e) => setMemberForm({ ...memberForm, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.lastName}
                        onChange={(e) => setMemberForm({ ...memberForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email (SPAN Email) <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className="form-control"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                        placeholder="firstname.lastname@spanationwide.org"
                        required
                      />
                      <small className="text-muted">Auto-generated from name, or enter manually</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Original Email (Personal Email) <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className="form-control"
                        value={memberForm.originalEmail}
                        onChange={(e) => setMemberForm({ ...memberForm, originalEmail: e.target.value })}
                        placeholder="personal@example.com"
                        required
                      />
                      <small className="text-muted">Where to forward SPAN emails</small>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.role}
                        onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                        placeholder="e.g., Content Writer, Advocate, Analyst, etc."
                        required
                      />
                      <small className="text-muted">This is the official role shown in the directory</small>
                    </div>
                    
                    {/* Dates */}
                    <div className="col-md-6">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={memberForm.startDate}
                        onChange={(e) => setMemberForm({ ...memberForm, startDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-control"
                        value={memberForm.dob}
                        onChange={(e) => setMemberForm({ ...memberForm, dob: e.target.value })}
                      />
                    </div>
                    
                    {/* Location */}
                    <div className="col-md-6">
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.city}
                        onChange={(e) => setMemberForm({ ...memberForm, city: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.state}
                        onChange={(e) => setMemberForm({ ...memberForm, state: e.target.value })}
                      />
                    </div>
                    
                    {/* School */}
                    <div className="col-md-12">
                      <label className="form-label">School Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.schoolName}
                        onChange={(e) => setMemberForm({ ...memberForm, schoolName: e.target.value })}
                      />
                    </div>
                    
                    {/* Contact */}
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={memberForm.phone}
                        onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">LinkedIn</label>
                      <input
                        type="url"
                        className="form-control"
                        value={memberForm.linkedin}
                        onChange={(e) => setMemberForm({ ...memberForm, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Instagram</label>
                      <input
                        type="text"
                        className="form-control"
                        value={memberForm.instagram}
                        onChange={(e) => setMemberForm({ ...memberForm, instagram: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                    
                    {/* Bio and Notes */}
                    <div className="col-md-12">
                      <label className="form-label">Bio</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={memberForm.bio}
                        onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
                        placeholder="Brief biography..."
                      />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={memberForm.notes}
                        onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
                        placeholder="Internal notes..."
                      />
                    </div>
                    
                    {/* Permissions */}
                    <div className="col-md-12">
                      <label className="form-label fw-bold">Permissions</label>
                      <small className="text-muted d-block mb-2">Select which dashboard functions this member can access</small>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={memberForm.volunteer}
                              onChange={(e) => setMemberForm({ ...memberForm, volunteer: e.target.checked })}
                              id="memberVolunteer"
                            />
                            <label className="form-check-label" htmlFor="memberVolunteer">
                              Volunteer Hours Management
                            </label>
                            <small className="text-muted d-block">Can approve/manage volunteer hours</small>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={memberForm.applications}
                              onChange={(e) => setMemberForm({ ...memberForm, applications: e.target.checked })}
                              id="memberApplications"
                            />
                            <label className="form-check-label" htmlFor="memberApplications">
                              Application Review
                            </label>
                            <small className="text-muted d-block">Can review new member applications</small>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={memberForm.bills}
                              onChange={(e) => setMemberForm({ ...memberForm, bills: e.target.checked })}
                              id="memberBills"
                            />
                            <label className="form-check-label" htmlFor="memberBills">
                              Bill Management
                            </label>
                            <small className="text-muted d-block">Can add/edit/delete bills</small>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={memberForm.registration}
                              onChange={(e) => setMemberForm({ ...memberForm, registration: e.target.checked })}
                              id="memberRegistration"
                            />
                            <label className="form-check-label" htmlFor="memberRegistration">
                              Member Management
                            </label>
                            <small className="text-muted d-block">Can add/edit members and manage roles</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowMemberModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveMember}
                  >
                    {editingMemberId ? 'Update Member' : 'Add Member'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Application View Modal */}
      {showApplicationModal && selectedApplication && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowApplicationModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: '800px' }}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Application: {selectedApplication.full_name}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowApplicationModal(false)}
                  ></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <strong>Email:</strong>
                      <p><a href={`mailto:${selectedApplication.email}`}>{selectedApplication.email}</a></p>
                    </div>
                    <div className="col-md-6">
                      <strong>Phone:</strong>
                      <p><a href={`tel:${selectedApplication.phone_number}`}>{selectedApplication.phone_number}</a></p>
                    </div>
                    <div className="col-md-6">
                      <strong>Age:</strong>
                      <p>{selectedApplication.age || 'Not provided'}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Grade:</strong>
                      <p>{selectedApplication.grade}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>School:</strong>
                      <p>{selectedApplication.school}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>State:</strong>
                      <p>{selectedApplication.state}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Hours per Week:</strong>
                      <p>{selectedApplication.hours_per_week}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>How they heard about SPAN:</strong>
                      <p>{selectedApplication.referral_source}</p>
                    </div>
                    <div className="col-12">
                      <strong>Additional Info:</strong>
                      <p>{selectedApplication.additional_info || 'None provided'}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Submitted:</strong>
                      <p>{formatDateLong(selectedApplication.submitted_at)}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Status:</strong>
                      <p>
                        <span className={`badge ${
                          selectedApplication.status === 'pending' ? 'bg-warning text-dark' :
                          selectedApplication.status === 'accepted' ? 'bg-success' :
                          'bg-danger'
                        }`}>
                          {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label"><strong>Notes:</strong></label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={applicationNotes}
                      onChange={(e) => setApplicationNotes(e.target.value)}
                      placeholder="Add notes about this application..."
                    />
                  </div>

                  {selectedApplication.status === 'pending' && (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      Review this application and either accept or reject it. You can add notes for your records.
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowApplicationModal(false)}
                  >
                    Close
                  </button>
                  {selectedApplication.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={() => {
                          if (window.confirm(`Accept ${selectedApplication.full_name}'s application? This will remove it from the pending list.`)) {
                            handleUpdateApplicationStatus('accepted')
                          }
                        }}
                      >
                        <i className="bi bi-check-circle me-1"></i>Accept
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          if (window.confirm(`Reject ${selectedApplication.full_name}'s application? This will remove it from the pending list.`)) {
                            handleUpdateApplicationStatus('rejected')
                          }
                        }}
                      >
                        <i className="bi bi-x-circle me-1"></i>Reject
                      </button>
                    </>
                  )}
                  {selectedApplication.status !== 'pending' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => {
                          if (window.confirm(`Reset ${selectedApplication.full_name}'s application to pending?`)) {
                            handleUpdateApplicationStatus('pending')
                          }
                        }}
                      >
                        Reset to Pending
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => {
                          setShowDeleteApplicationModal(true)
                        }}
                      >
                        <i className="bi bi-trash me-1"></i>Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Import Application Modal */}
      {showImportApplicationModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1065 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowImportApplicationModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Import from Application</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowImportApplicationModal(false)}
                  ></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <p className="text-muted mb-3">Select an application to import data into the member form:</p>
                  {applications.filter(app => app.status === 'pending' || app.status === 'accepted').length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>School</th>
                            <th>State</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.filter(app => app.status === 'pending' || app.status === 'accepted').map(app => (
                            <tr key={app.application_id}>
                              <td>{app.full_name}</td>
                              <td>{app.email}</td>
                              <td>{app.school || '-'}</td>
                              <td>{app.state || '-'}</td>
                              <td>{formatDateLong(app.submitted_at)}</td>
                              <td>
                                <span className={`badge ${
                                  app.status === 'pending' ? 'bg-warning text-dark' :
                                  app.status === 'accepted' ? 'bg-success' :
                                  'bg-danger'
                                }`}>
                                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleImportFromApplication(app)}
                                >
                                  <i className="bi bi-download me-1"></i>Import
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted text-center py-4">No pending or accepted applications found.</p>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowImportApplicationModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        </>
      )}

      {/* Delete Application Confirmation Modal */}
      {showDeleteApplicationModal && selectedApplication && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1060 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowDeleteApplicationModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">Delete Application</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteApplicationModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to permanently delete the application from <strong>{selectedApplication.full_name}</strong>?</p>
                  <p className="text-muted small mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowDeleteApplicationModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      handleDeleteApplication()
                    }}
                  >
                    Delete Application
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
        </>
      )}
    </div>
  )
}

export default DashboardPage


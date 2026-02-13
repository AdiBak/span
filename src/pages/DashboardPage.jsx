import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'
import RegistrationForm from '../components/RegistrationForm'
import { generateVolunteerPDF } from '../lib/generateVolunteerPDF'
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
  const [mySubmittedBills, setMySubmittedBills] = useState([])
  const [billFilter, setBillFilter] = useState('all') // 'all', 'under_review', 'approved', 'modified', 'rejected'
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
  const emailManuallyEdited = useRef(false)
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
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false)
  const [sendRejectionEmail, setSendRejectionEmail] = useState(true)
  const [rejectionEmailSending, setRejectionEmailSending] = useState(false)
  const [hrReports, setHrReports] = useState([])
  const [hrReportFilter, setHrReportFilter] = useState('all') // 'all', 'pending', 'reviewed', 'resolved', 'dismissed'
  const [showHrReportModal, setShowHrReportModal] = useState(false)
  const [hrReportForm, setHrReportForm] = useState({
    nature: '',
    regardingMemberId: '',
    regardingName: '',
    dateOccurred: '',
    details: ''
  })
  const [hrReportError, setHrReportError] = useState('')
  const [hrReportSuccess, setHrReportSuccess] = useState('')
  const [selectedHrReport, setSelectedHrReport] = useState(null)
  const [showHrReportViewModal, setShowHrReportViewModal] = useState(false)
  const [myRequests, setMyRequests] = useState([])
  const [allMemberRequests, setAllMemberRequests] = useState([])
  const [memberRequestFilter, setMemberRequestFilter] = useState('pending') // 'all' | 'pending' | 'approved' | 'declined'
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({
    type: 'leave',
    reason: '',
    leaveStart: '',
    leaveEnd: '',
    projectName: '',
    requestedByDate: ''
  })
  const [requestError, setRequestError] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null)
  const [showRequestReviewModal, setShowRequestReviewModal] = useState(false)
  const [requestReviewNotes, setRequestReviewNotes] = useState('')
  const [requestReviewAction, setRequestReviewAction] = useState(null) // 'approve' | 'decline'
  const [viewAsData, setViewAsData] = useState(null)
  const [viewAsLoading, setViewAsLoading] = useState(false)
  const [viewAsError, setViewAsError] = useState(null)
  const [partners, setPartners] = useState([])
  const [showPartnerModal, setShowPartnerModal] = useState(false)
  const [editingPartnerId, setEditingPartnerId] = useState(null)
  const [partnerForm, setPartnerForm] = useState({
    partnerName: '',
    websiteUrl: '',
    displayOrder: 999,
    active: true
  })
  const [partnerLogoFile, setPartnerLogoFile] = useState(null)
  const [partnerError, setPartnerError] = useState('')
  const [partnerSuccess, setPartnerSuccess] = useState('')
  const [schools, setSchools] = useState([])
  const [showSchoolModal, setShowSchoolModal] = useState(false)
  const [editingSchoolId, setEditingSchoolId] = useState(null)
  const [schoolForm, setSchoolForm] = useState({
    schoolName: '',
    displayOrder: 999,
    active: true
  })
  const [schoolLogoFile, setSchoolLogoFile] = useState(null)
  const [schoolError, setSchoolError] = useState('')
  const [schoolSuccess, setSchoolSuccess] = useState('')
  const [draggedSchoolId, setDraggedSchoolId] = useState(null)
  const [draggedPartnerId, setDraggedPartnerId] = useState(null)
  const [profilePicLoading, setProfilePicLoading] = useState(false)
  const [profilePicError, setProfilePicError] = useState('')
  const [profilePicSuccess, setProfilePicSuccess] = useState('')
  const [profilePicVersion, setProfilePicVersion] = useState(0) // cache-buster so browser shows new image after update
  const profilePicInputRef = useRef(null)
  const [memberPhotoTarget, setMemberPhotoTarget] = useState(null)
  const [memberPhotoLoading, setMemberPhotoLoading] = useState(false)
  const [memberPhotoError, setMemberPhotoError] = useState('')
  const [memberPhotoSuccess, setMemberPhotoSuccess] = useState('')
  const execMemberPhotoInputRef = useRef(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationPdfUrl, setVerificationPdfUrl] = useState(null)
  const [verificationPdfBase64, setVerificationPdfBase64] = useState(null)
  const [verificationMember, setVerificationMember] = useState(null)
  const [verificationEntryCount, setVerificationEntryCount] = useState(0)
  const [verificationSending, setVerificationSending] = useState(false)
  const [verificationGenerating, setVerificationGenerating] = useState(false)

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

  // Helper function to check if member has a specific permission (uses viewed member when in view-as mode)
  const hasPermission = (permission) => {
    const m = viewAsData?.member ?? member
    if (!m) return false
    return m[permission] === true || m[permission] === 'true'
  }

  // Load member data
  useEffect(() => {
    // Check if there's a hash in the URL (from invite link)
    const hasHash = window.location.hash && window.location.hash.length > 0
    
    // Set up auth state listener to handle invite link callbacks
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session ? 'session exists' : 'no session')
      // Handle various auth events that might occur from invite links
      // SIGNED_IN: User signs in (including from invite link)
      // TOKEN_REFRESHED: Session token refreshed (might happen on page load with hash)
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        console.log('Session established, loading member data...')
        loadMemberData(false) // Don't skip redirect now that we have a session
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to login...')
        window.location.href = '/login.html'
      }
    })

    // Initial load - skip redirect if hash is present (wait for auth state change)
    loadMemberData(hasHash)
    loadAllMembers()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load additional data based on permissions after member is loaded
  useEffect(() => {
    if (member) {
      // Load bills based on permissions
      const isExec = hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration')
      if (isExec) {
        // Execs see all bills
        loadAllBills()
      } else if (hasPermission('bills')) {
        // Members with bills permission see only their submitted bills
        loadMySubmittedBills()
      }
      if (hasPermission('applications')) {
        loadApplications()
      }
      if (hasPermission('registration')) {
        loadAllMembersForManagement()
        loadHrReports()
        loadAllMemberRequests()
        loadPartners()
        loadSchools()
      }
      loadMyRequests()
    }
  }, [member])

  // View-as mode: when URL has ?viewAs=member_id and current user is exec, fetch that member's dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const viewAsId = params.get('viewAs')
    if (!viewAsId || !member) {
      if (!viewAsId) {
        setViewAsData(null)
        setViewAsError(null)
      }
      return
    }
    const isExec = (member.volunteer === true || member.volunteer === 'true') &&
      (member.applications === true || member.applications === 'true') &&
      (member.bills === true || member.bills === 'true') &&
      (member.registration === true || member.registration === 'true')
    if (!isExec) {
      setViewAsError('Only executive directors can view another member\'s dashboard.')
      setViewAsData(null)
      return
    }
    setViewAsError(null)
    setViewAsLoading(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const url = `${supabaseUrl}/functions/v1/view-member-dashboard?member_id=${encodeURIComponent(viewAsId)}`
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.access_token) {
        setViewAsError('Please sign in again.')
        setViewAsLoading(false)
        return
      }
      fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((res) => {
          if (res.status === 403) {
            setViewAsError('You don\'t have permission to view this dashboard.')
            return null
          }
          if (res.status === 404) {
            setViewAsError('Member not found.')
            return null
          }
          if (!res.ok) throw new Error('Failed to load dashboard')
          return res.json()
        })
        .then((data) => {
          setViewAsData(data || null)
        })
        .catch(() => setViewAsError('Could not load dashboard.'))
        .finally(() => setViewAsLoading(false))
    })
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


  // Load bills submitted by current user
  const loadMySubmittedBills = async () => {
    if (!member?.member_id) return

    const { data: billsData, error } = await supabase
      .from('bills')
      .select('*')
      .eq('submitted_by', member.member_id)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error loading my submitted bills:', error)
      return
    }

    setMySubmittedBills(billsData || [])
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

  // Load all partners
  const loadPartners = async () => {
    const { data: partnersData, error } = await supabase
      .from('partners')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading partners:', error)
      return
    }

    setPartners(partnersData || [])
  }

  // Load all schools
  const loadSchools = async () => {
    const { data: schoolsData, error } = await supabase
      .from('schools')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error loading schools:', error)
      return
    }

    setSchools(schoolsData || [])
  }

  // Load HR reports (executive directors only, filtered to exclude reports about themselves)
  const loadHrReports = async () => {
    if (!member) return
    
    const { data: reportsData, error } = await supabase
      .from('hr_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading HR reports:', error)
      return
    }
    
    // Fetch member details for submitted_by and regarding_member_id
    if (reportsData && reportsData.length > 0) {
      const memberIds = new Set()
      reportsData.forEach(report => {
        if (report.submitted_by) memberIds.add(report.submitted_by)
        if (report.regarding_member_id) memberIds.add(report.regarding_member_id)
      })
      
      if (memberIds.size > 0) {
        const { data: membersData } = await supabase
          .from('members')
          .select('member_id, first_name, last_name, email')
          .in('member_id', Array.from(memberIds))
        
        const membersMap = {}
        if (membersData) {
          membersData.forEach(m => {
            membersMap[m.member_id] = m
          })
        }
        
        // Attach member data to reports
        reportsData.forEach(report => {
          report.submitted_by_member = membersMap[report.submitted_by]
          report.regarding_member = membersMap[report.regarding_member_id]
        })
      }
    }

    // Filter out reports about the current member (if they're an exec director)
    const filtered = (reportsData || []).filter(report => {
      // If the report is about the current member, exclude it
      if (report.regarding_member_id === member.member_id) {
        return false
      }
      return true
    })

    setHrReports(filtered)
  }

  // Load current member's leave/extension requests
  const loadMyRequests = async () => {
    if (!member?.member_id) return
    const { data, error } = await supabase
      .from('member_requests')
      .select('*')
      .eq('member_id', member.member_id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading my requests:', error)
      setMyRequests([])
      return
    }
    setMyRequests(data || [])
  }

  // Load all member requests (execs only)
  const loadAllMemberRequests = async () => {
    if (!member) return
    const { data, error } = await supabase
      .from('member_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading member requests:', error)
      setAllMemberRequests([])
      return
    }
    if (data && data.length > 0) {
      const memberIds = [...new Set(data.map(r => r.member_id))]
      const { data: membersData } = await supabase
        .from('members')
        .select('member_id, first_name, last_name, email')
        .in('member_id', memberIds)
      const membersMap = {}
      if (membersData) membersData.forEach(m => { membersMap[m.member_id] = m })
      data.forEach(r => { r.member = membersMap[r.member_id] })
    }
    setAllMemberRequests(data || [])
  }

  // HR Report handlers
  const handleSubmitHrReport = async () => {
    const { nature, regardingMemberId, regardingName, dateOccurred, details } = hrReportForm
    setHrReportError('')
    setHrReportSuccess('')

    // Validation
    if (!nature || !dateOccurred) {
      setHrReportError('Nature of complaint and date occurred are required.')
      return
    }

    if (!member) {
      setHrReportError('Member data not loaded.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('hr_reports')
        .insert({
          submitted_by: member.member_id,
          nature_of_complaint: nature.trim(),
          regarding_member_id: regardingMemberId || null,
          regarding_name: regardingName.trim() || null,
          date_occurred: dateOccurred,
          details: details.trim() || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error submitting HR report:', error)
        setHrReportError('Failed to submit report. ' + error.message)
        return
      }

      setHrReportSuccess('HR report submitted successfully. Executive directors have been notified.')
      setHrReportForm({
        nature: '',
        regardingMemberId: '',
        regardingName: '',
        dateOccurred: '',
        details: ''
      })
      
      // Refresh reports if user has permission to view them
      if (hasPermission('registration')) {
        await loadHrReports()
      }
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowHrReportModal(false)
        setHrReportSuccess('')
      }, 3000)
    } catch (err) {
      console.error('Error submitting HR report:', err)
      setHrReportError(err.message || 'Failed to submit report.')
    }
  }

  // Update HR report status
  const handleUpdateHrReportStatus = async (reportId, newStatus) => {
    if (!member) {
      console.error('No member data available')
      return
    }

    console.log('Updating HR report status:', { reportId, newStatus, memberId: member.member_id })

    try {
      const { data: updateResult, error } = await supabase
        .from('hr_reports')
        .update({
          status: newStatus,
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString()
        })
        .eq('report_id', reportId)
        .select()

      if (error) {
        console.error('Error updating HR report status:', error)
        alert('Failed to update report status: ' + error.message)
        return
      }

      console.log('Update result:', updateResult)

      if (!updateResult || updateResult.length === 0) {
        console.error('Update returned no rows - RLS policy may be blocking the update')
        alert('Failed to update report status. You may not have permission to update this report.')
        return
      }

      console.log('Status updated in database, fetching updated report...')

      // Small delay to ensure database commit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Fetch the updated report with all related data
      const { data: updatedReportData, error: fetchError } = await supabase
        .from('hr_reports')
        .select('*')
        .eq('report_id', reportId)
        .single()

      if (fetchError) {
        console.error('Error fetching updated report:', fetchError)
      } else if (updatedReportData) {
        console.log('Fetched updated report:', updatedReportData)
        
        // Fetch member details
        const memberIds = new Set()
        if (updatedReportData.submitted_by) memberIds.add(updatedReportData.submitted_by)
        if (updatedReportData.regarding_member_id) memberIds.add(updatedReportData.regarding_member_id)
        if (updatedReportData.reviewed_by) memberIds.add(updatedReportData.reviewed_by)
        
        if (memberIds.size > 0) {
          const { data: membersData } = await supabase
            .from('members')
            .select('member_id, first_name, last_name, email')
            .in('member_id', Array.from(memberIds))
          
          const membersMap = {}
          if (membersData) {
            membersData.forEach(m => {
              membersMap[m.member_id] = m
            })
          }
          
          updatedReportData.submitted_by_member = membersMap[updatedReportData.submitted_by]
          updatedReportData.regarding_member = membersMap[updatedReportData.regarding_member_id]
          updatedReportData.reviewed_by_member = membersMap[updatedReportData.reviewed_by]
        }
        
        console.log('Setting selectedHrReport to:', updatedReportData)
        setSelectedHrReport(updatedReportData)
      }

      // Refresh reports to get updated data
      await loadHrReports()
      
      // If the new status doesn't match the current filter, switch to "all" to show the updated report
      if (hrReportFilter !== 'all' && hrReportFilter !== newStatus) {
        setHrReportFilter('all')
      }
    } catch (err) {
      console.error('Error updating HR report status:', err)
      alert('Failed to update report status.')
    }
  }

  // Filter HR reports by status
  const filteredHrReports = hrReports.filter(report => {
    if (hrReportFilter === 'all') return true
    return report.status === hrReportFilter
  })

  // Submit leave or extension request
  const handleSubmitRequest = async (e) => {
    e?.preventDefault()
    setRequestError('')
    setRequestSuccess('')
    if (!member?.member_id) {
      setRequestError('Member data not loaded.')
      return
    }
    const reason = (requestForm.reason || '').trim()
    if (!reason) {
      setRequestError('Please provide a reason.')
      return
    }
    try {
      const payload = {
        member_id: member.member_id,
        type: requestForm.type,
        reason,
        leave_start: requestForm.leaveStart || null,
        leave_end: requestForm.leaveEnd || null,
        project_name: requestForm.projectName?.trim() || null,
        requested_by_date: requestForm.requestedByDate || null
      }
      const { error } = await supabase.from('member_requests').insert(payload)
      if (error) throw error
      setRequestSuccess('Request submitted. Executive directors will review it.')
      setRequestForm({ type: 'leave', reason: '', leaveStart: '', leaveEnd: '', projectName: '', requestedByDate: '' })
      setShowRequestModal(false)
      await loadMyRequests()
      if (hasPermission('registration')) await loadAllMemberRequests()
    } catch (err) {
      setRequestError(err.message || 'Failed to submit request.')
    }
  }

  const openRequestReviewModal = (request, action) => {
    setSelectedRequestForReview(request)
    setRequestReviewAction(action)
    setRequestReviewNotes(request?.review_notes || '')
    setShowRequestReviewModal(true)
  }

  const handleRequestReviewSubmit = async () => {
    if (!selectedRequestForReview || !requestReviewAction || !member?.member_id) return
    try {
      const { error } = await supabase
        .from('member_requests')
        .update({
          status: requestReviewAction === 'approve' ? 'approved' : 'declined',
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString(),
          review_notes: requestReviewNotes.trim() || null
        })
        .eq('request_id', selectedRequestForReview.request_id)
      if (error) throw error
      setShowRequestReviewModal(false)
      setSelectedRequestForReview(null)
      setRequestReviewNotes('')
      await loadAllMemberRequests()
      await loadMyRequests()
    } catch (err) {
      alert(err.message || 'Failed to update request.')
    }
  }

  const filteredMemberRequests = allMemberRequests.filter(r => {
    if (memberRequestFilter === 'all') return true
    return r.status === memberRequestFilter
  })

  const loadMemberData = async (skipRedirect = false) => {
    try {
      console.log('Loading member data...')
      
      // Check if there's a hash in the URL (from invite link callback)
      // Supabase processes these automatically, but we should wait a bit for it to complete
      const hasHash = window.location.hash && window.location.hash.length > 0
      if (hasHash) {
        console.log('Detected URL hash (likely from invite link), waiting for auth processing...')
        // Wait a moment for Supabase to process the hash
        await new Promise(resolve => setTimeout(resolve, 1000))
        // Clear the hash from URL after processing
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      }
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        setLoading(false)
        return
      }
      
      if (!session) {
        // Don't redirect if we're waiting for hash processing (skipRedirect = true)
        // The onAuthStateChange listener will handle it
        if (!skipRedirect && !hasHash) {
          console.log('No session, redirecting to login')
          window.location.href = '/login.html'
        } else if (hasHash) {
          console.log('No session yet, but hash detected - waiting for auth state change...')
        }
        setLoading(false)
        return
      }

      const userId = session.user.id
      const email = session.user.email
      console.log('Fetching member data for user_id:', userId, 'email:', email)
      
      // Try to fetch by user_id first (more reliable), fallback to email if user_id is null
      let memberData = null
      let error = null
      
      if (userId) {
        const { data, error: userIdError } = await supabase
          .from('members')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        memberData = data
        error = userIdError
        
        // If not found by user_id, try email as fallback
        if (!memberData && !error) {
          console.log('Member not found by user_id, trying email...')
          const { data: emailData, error: emailError } = await supabase
            .from('members')
            .select('*')
            .eq('email', email)
            .maybeSingle()
          memberData = emailData
          error = emailError
        }
      } else {
        // No user_id, fallback to email
        console.log('No user_id in session, using email lookup')
        const { data: emailData, error: emailError } = await supabase
          .from('members')
          .select('*')
          .eq('email', email)
          .maybeSingle()
        memberData = emailData
        error = emailError
      }

      if (error) {
        console.error('Error fetching member data:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setLoading(false)
        setMember(null) // Explicitly set to null to show error message
        return
      }

      if (!memberData) {
        console.error('No member data found for user_id:', userId, 'email:', email)
        console.error('This might mean:')
        console.error('1. The member record does not exist in the members table')
        console.error('2. The user_id is not linked to the member record')
        console.error('3. An RLS policy is blocking the query')
        setLoading(false)
        setMember(null) // Explicitly set to null to show error message
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

  // Profile picture change
  const handleProfilePicClick = () => {
    profilePicInputRef.current?.click()
  }

  const handleProfilePicChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !member?.member_id) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setProfilePicError('Please choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfilePicError('Image must be under 5 MB.')
      return
    }

    setProfilePicError('')
    setProfilePicSuccess('')
    setProfilePicLoading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${member.member_id}.${ext}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('members-images')
        .upload(filename, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        setProfilePicError('Failed to upload image: ' + uploadError.message)
        setProfilePicLoading(false)
        e.target.value = ''
        return
      }

      const { data: updateData, error: updateError } = await supabase.rpc('update_own_member_image', { filename })

      if (updateError) {
        setProfilePicError('Failed to update profile: ' + updateError.message)
        setProfilePicLoading(false)
        e.target.value = ''
        return
      }

      // If RPC returns rows_updated and it's 0, the DB row wasn't matched (e.g. user_id/email not linked)
      if (updateData === 0) {
        setProfilePicError('Profile could not be updated: your account may not be linked to a member record. Please contact an admin.')
        setProfilePicLoading(false)
        e.target.value = ''
        return
      }

      setMember(prev => prev ? { ...prev, image: filename } : null)
      setProfilePicVersion(Date.now()) // force img to reload (same URL would show cached old image)
      setProfilePicSuccess('Profile picture updated.')
      setProfilePicLoading(false)
      e.target.value = ''
      setTimeout(() => setProfilePicSuccess(''), 3000)
    } catch (err) {
      setProfilePicError(err.message || 'Failed to update profile picture.')
      setProfilePicLoading(false)
      e.target.value = ''
    }
  }

  // Exec: change a member's profile picture (Member Management)
  const handleExecChangeMemberPhoto = (memberItem) => {
    setMemberPhotoTarget(memberItem.member_id)
    setMemberPhotoError('')
    setMemberPhotoSuccess('')
    execMemberPhotoInputRef.current?.click()
  }

  const handleExecMemberPhotoFileChange = async (e) => {
    const file = e.target.files?.[0]
    const targetId = memberPhotoTarget
    if (!file || !targetId) {
      e.target.value = ''
      setMemberPhotoTarget(null)
      return
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMemberPhotoError('Please choose a JPEG, PNG, or WebP image.')
      e.target.value = ''
      setMemberPhotoTarget(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMemberPhotoError('Image must be under 5 MB.')
      e.target.value = ''
      setMemberPhotoTarget(null)
      return
    }

    setMemberPhotoError('')
    setMemberPhotoSuccess('')
    setMemberPhotoLoading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${targetId}.${ext}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('members-images')
        .upload(filename, file, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        setMemberPhotoError('Failed to upload: ' + uploadError.message)
        setMemberPhotoLoading(false)
        e.target.value = ''
        setMemberPhotoTarget(null)
        return
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({ image: filename })
        .eq('member_id', targetId)

      if (updateError) {
        setMemberPhotoError('Failed to update member: ' + updateError.message)
        setMemberPhotoLoading(false)
        e.target.value = ''
        setMemberPhotoTarget(null)
        return
      }

      setAllMembersForManagement(prev =>
        prev.map(m => m.member_id === targetId ? { ...m, image: filename } : m)
      )
      setMemberPhotoSuccess('Profile picture updated.')
      setMemberPhotoLoading(false)
      e.target.value = ''
      setMemberPhotoTarget(null)
      setTimeout(() => setMemberPhotoSuccess(''), 3000)
    } catch (err) {
      setMemberPhotoError(err.message || 'Failed to update profile picture.')
      setMemberPhotoLoading(false)
      e.target.value = ''
      setMemberPhotoTarget(null)
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

  // Volunteer verification PDF
  const handleSendVerification = async (targetMemberId, approvedEntries) => {
    setVerificationGenerating(true)
    try {
      // Fetch full member data for the PDF (need dob, city, state, role, etc.)
      const { data: fullMember, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('member_id', targetMemberId)
        .maybeSingle()

      if (memberError || !fullMember) {
        alert('Failed to load member data for verification letter.')
        setVerificationGenerating(false)
        return
      }

      const { pdfBlob, pdfBase64 } = await generateVolunteerPDF(fullMember, approvedEntries, supabase)
      const blobUrl = URL.createObjectURL(pdfBlob)

      setVerificationPdfUrl(blobUrl)
      setVerificationPdfBase64(pdfBase64)
      setVerificationMember(fullMember)
      setVerificationEntryCount(approvedEntries.length)
      setShowVerificationModal(true)
    } catch (err) {
      console.error('Error generating verification PDF:', err)
      alert('Failed to generate verification PDF: ' + err.message)
    } finally {
      setVerificationGenerating(false)
    }
  }

  const handleConfirmSendVerification = async () => {
    if (!verificationMember || !verificationPdfBase64) return
    setVerificationSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(
        'https://qujzohvrbfsouakzocps.supabase.co/functions/v1/send-volunteer-verification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            member_name: `${verificationMember.first_name || ''} ${verificationMember.last_name || ''}`.trim(),
            member_email: verificationMember.original_email || verificationMember.email,
            pdf_base64: verificationPdfBase64,
          }),
        }
      )
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}))
        console.error('Verification email failed:', errData)
        alert('Failed to send verification email: ' + (errData.error || 'Unknown error'))
        return
      }
      alert('Verification letter sent successfully!')
      setShowVerificationModal(false)
      if (verificationPdfUrl) URL.revokeObjectURL(verificationPdfUrl)
      setVerificationPdfUrl(null)
      setVerificationPdfBase64(null)
      setVerificationMember(null)
    } catch (err) {
      console.error('Error sending verification email:', err)
      alert('Failed to send verification email.')
    } finally {
      setVerificationSending(false)
    }
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

      // 2. Determine bill status based on permissions
      // Only execs (all 4 permissions: volunteer, applications, bills, registration) can approve directly
      // Others with bills=true can only submit for review
      const isExec = hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration')
      const billStatus = isExec ? 'approved' : 'under_review'

      // 3. Insert bill to database
      const { data: billData, error: insertError } = await supabase
        .from('bills')
        .insert([{
          state: state.trim(),
          name: name.trim(),
          position: position,
          description: description.trim(),
          bill_date: billDate,
          legiscan_link: legiscanLink.trim() || null,
          bill_collaborators: collaborators.length > 0 ? collaborators : null,
          status: billStatus,
          submitted_by: billStatus === 'under_review' ? member.member_id : null,
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (insertError) {
        console.error('Bill insert error:', insertError)
        setBillError('Failed to save bill. ' + insertError.message)
        return
      }

      if (billStatus === 'approved') {
        setBillSuccess(`Bill "${state} ${name}" uploaded and approved successfully!`)
      } else {
        setBillSuccess(`Bill "${state} ${name}" submitted for review. It will appear on the site once approved.`)
      }
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
      
      // If this was a review edit, approve it as modified
      if (selectedBillForEdit?.isReviewEdit) {
        await handleApproveBill(selectedBillForEdit, true)
      }
      
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

  // Bill review handlers (for execs and policy leads)
  const handleApproveBill = async (bill, modified = false) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({
          status: modified ? 'modified' : 'approved',
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString()
        })
        .eq('bill_id', bill.bill_id)

      if (error) throw error

      await loadAllBills()
    } catch (err) {
      console.error('Error approving bill:', err)
      alert('Failed to approve bill: ' + err.message)
    }
  }

  const handleRejectBill = async (bill, reviewNotes = '') => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({
          status: 'rejected',
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('bill_id', bill.bill_id)

      if (error) throw error

      await loadAllBills()
      await loadMySubmittedBills()
    } catch (err) {
      console.error('Error rejecting bill:', err)
      alert('Failed to reject bill: ' + err.message)
    }
  }

  const handleModifyAndApproveBill = async (bill) => {
    // Open edit modal, then approve after save
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
    // Mark that this is a review edit
    setSelectedBillForEdit({ ...bill, isReviewEdit: true })
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
    emailManuallyEdited.current = false
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
      linkedin: application.linkedin_url || '',
      instagram: application.instagram_url || '',
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
    if (!editingMemberId && showMemberModal && memberForm.firstName && memberForm.lastName && !emailManuallyEdited.current) {
      const generatedEmail = generateSpanEmail(memberForm.firstName, memberForm.lastName)
      if (generatedEmail) {
        setMemberForm(prev => ({ ...prev, email: generatedEmail }))
      }
    }
  }, [memberForm.firstName, memberForm.lastName, editingMemberId, showMemberModal])

  // Reset manual edit flag when modal opens/closes
  useEffect(() => {
    if (showMemberModal && !editingMemberId) {
      emailManuallyEdited.current = false
    }
  }, [showMemberModal, editingMemberId])

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

  const handleAcceptApplication = async () => {
    if (!selectedApplication) return

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'accepted',
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString(),
          notes: applicationNotes.trim() || null
        })
        .eq('application_id', selectedApplication.application_id)

      if (error) {
        console.error('Error accepting application:', error)
        alert('Failed to accept application: ' + error.message)
        return
      }

      // Save application data before closing the modal
      const appData = { ...selectedApplication }

      await loadApplications()
      setShowApplicationModal(false)
      setSelectedApplication(null)
      setApplicationNotes('')

      // Pre-fill the Add Member form with application data and open it
      setEditingMemberId(null)
      emailManuallyEdited.current = false
      handleImportFromApplication(appData)
      setShowMemberModal(true)
    } catch (err) {
      console.error('Error accepting application:', err)
      alert('Failed to accept application.')
    }
  }

  const handleRejectApplication = async () => {
    if (!selectedApplication) return

    try {
      // Update status to rejected
      const { error } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          reviewed_by: member.member_id,
          reviewed_at: new Date().toISOString(),
          notes: applicationNotes.trim() || null
        })
        .eq('application_id', selectedApplication.application_id)

      if (error) {
        console.error('Error rejecting application:', error)
        alert('Failed to reject application: ' + error.message)
        return
      }

      // Send rejection email if opted in
      if (sendRejectionEmail && selectedApplication.email) {
        setRejectionEmailSending(true)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const resp = await fetch(
            'https://qujzohvrbfsouakzocps.supabase.co/functions/v1/send-rejection-email',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                applicant_name: selectedApplication.full_name,
                applicant_email: selectedApplication.email,
              }),
            }
          )
          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}))
            console.error('Rejection email failed:', errData)
            alert('Application was rejected, but the rejection email failed to send. You may need to notify the applicant manually.')
          }
        } catch (emailErr) {
          console.error('Error sending rejection email:', emailErr)
          alert('Application was rejected, but the rejection email failed to send. You may need to notify the applicant manually.')
        } finally {
          setRejectionEmailSending(false)
        }
      }

      setShowRejectConfirmModal(false)
      setSendRejectionEmail(true)
      await loadApplications()
      setShowApplicationModal(false)
      setSelectedApplication(null)
      setApplicationNotes('')
    } catch (err) {
      console.error('Error rejecting application:', err)
      alert('Failed to reject application.')
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

  // Partner management handlers
  const handleAddPartner = () => {
    setEditingPartnerId(null)
    setPartnerForm({
      partnerName: '',
      websiteUrl: '',
      displayOrder: 999,
      active: true
    })
    setPartnerLogoFile(null)
    setPartnerError('')
    setPartnerSuccess('')
    setShowPartnerModal(true)
  }

  const handleEditPartner = (partner) => {
    setEditingPartnerId(partner.partner_id)
    setPartnerForm({
      partnerName: partner.partner_name,
      websiteUrl: partner.website_url || '',
      displayOrder: partner.display_order || 999,
      active: partner.active !== false
    })
    setPartnerLogoFile(null)
    setPartnerError('')
    setPartnerSuccess('')
    setShowPartnerModal(true)
  }

  const handleSavePartner = async () => {
    const { partnerName, websiteUrl, displayOrder, active } = partnerForm
    setPartnerError('')
    setPartnerSuccess('')

    if (!partnerName.trim()) {
      setPartnerError('Partner name is required.')
      return
    }

    try {
      let logoFilename = null

      // Upload logo if a new file was selected
      if (partnerLogoFile) {
        const fileExt = partnerLogoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${partnerName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('partners-images')
          .upload(fileName, partnerLogoFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Error uploading logo:', uploadError)
          setPartnerError('Failed to upload logo: ' + uploadError.message)
          return
        }

        logoFilename = fileName
      }

      if (editingPartnerId) {
        // Update existing partner
        const updateData = {
          partner_name: partnerName.trim(),
          website_url: websiteUrl.trim() || null,
          display_order: parseInt(displayOrder) || 999,
          active: active
        }

        if (logoFilename) {
          // Get old logo filename to delete it
          const oldPartner = partners.find(p => p.partner_id === editingPartnerId)
          if (oldPartner?.partner_logo) {
            await supabase.storage
              .from('partners-images')
              .remove([oldPartner.partner_logo])
          }
          updateData.partner_logo = logoFilename
        }

        const { error } = await supabase
          .from('partners')
          .update(updateData)
          .eq('partner_id', editingPartnerId)

        if (error) throw error
        setPartnerSuccess('Partner updated successfully!')
      } else {
        // Create new partner
        if (!logoFilename) {
          setPartnerError('Logo is required for new partners.')
          return
        }

        const { error } = await supabase
          .from('partners')
          .insert({
            partner_name: partnerName.trim(),
            partner_logo: logoFilename,
            website_url: websiteUrl.trim() || null,
            display_order: parseInt(displayOrder) || 999,
            active: active
          })

        if (error) throw error
        setPartnerSuccess('Partner added successfully!')
      }

      await loadPartners()
      setTimeout(() => {
        setShowPartnerModal(false)
        setPartnerSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Error saving partner:', err)
      setPartnerError(err.message || 'Failed to save partner.')
    }
  }

  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('Are you sure you want to delete this partner? This cannot be undone.')) {
      return
    }

    try {
      const partner = partners.find(p => p.partner_id === partnerId)
      
      // Delete logo from storage
      if (partner?.partner_logo) {
        await supabase.storage
          .from('partners-images')
          .remove([partner.partner_logo])
      }

      // Delete partner from database
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('partner_id', partnerId)

      if (error) throw error

      await loadPartners()
    } catch (err) {
      console.error('Error deleting partner:', err)
      alert('Failed to delete partner: ' + err.message)
    }
  }

  // School management handlers
  const handleAddSchool = () => {
    setEditingSchoolId(null)
    setSchoolForm({
      schoolName: '',
      displayOrder: 999,
      active: true
    })
    setSchoolLogoFile(null)
    setSchoolError('')
    setSchoolSuccess('')
    setShowSchoolModal(true)
  }

  const handleEditSchool = (school) => {
    setEditingSchoolId(school.school_id ?? school.id)
    setSchoolForm({
      schoolName: school.school_name,
      displayOrder: school.display_order || 999,
      active: school.active !== false
    })
    setSchoolLogoFile(null)
    setSchoolError('')
    setSchoolSuccess('')
    setShowSchoolModal(true)
  }

  const handleSaveSchool = async () => {
    const { schoolName, displayOrder, active } = schoolForm
    setSchoolError('')
    setSchoolSuccess('')

    if (!schoolName.trim()) {
      setSchoolError('School name is required.')
      return
    }

    try {
      let logoFilename = null

      // Upload logo if a new file was selected
      if (schoolLogoFile) {
        const fileExt = schoolLogoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${schoolName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('schools-images')
          .upload(fileName, schoolLogoFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Error uploading logo:', uploadError)
          setSchoolError('Failed to upload logo: ' + uploadError.message)
          return
        }

        logoFilename = fileName
      }

      if (editingSchoolId) {
        // Update existing school (logo optional — keep current if not changed)
        const updateData = {
          school_name: schoolName.trim(),
          display_order: parseInt(displayOrder) || 999,
          active: active !== false
        }

        if (logoFilename) {
          const oldSchool = schools.find(s => (s.school_id ?? s.id) === editingSchoolId)
          if (oldSchool?.school_image) {
            await supabase.storage
              .from('schools-images')
              .remove([oldSchool.school_image])
          }
          updateData.school_image = logoFilename
        }

        const { error } = await supabase
          .from('schools')
          .update(updateData)
          .eq('school_id', editingSchoolId)

        if (error) throw error
        setSchoolSuccess('School updated successfully!')
      } else {
        // Create new school
        if (!logoFilename) {
          setSchoolError('Logo is required for new schools.')
          return
        }

        const { error } = await supabase
          .from('schools')
          .insert({
            school_name: schoolName.trim(),
            school_image: logoFilename,
            display_order: parseInt(displayOrder) || 999,
            active: active !== false
          })

        if (error) throw error
        setSchoolSuccess('School added successfully!')
      }

      await loadSchools()
      setTimeout(() => {
        setShowSchoolModal(false)
        setSchoolSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Error saving school:', err)
      setSchoolError(err.message || 'Failed to save school.')
    }
  }

  const handleDeleteSchool = async (schoolId) => {
    if (!window.confirm('Are you sure you want to delete this school? This cannot be undone.')) {
      return
    }

    try {
      const school = schools.find(s => (s.school_id ?? s.id) === schoolId)
      
      // Delete logo from storage
      if (school?.school_image) {
        await supabase.storage
          .from('schools-images')
          .remove([school.school_image])
      }

      // Delete school from database
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('school_id', schoolId)

      if (error) throw error

      await loadSchools()
    } catch (err) {
      console.error('Error deleting school:', err)
      alert('Failed to delete school: ' + err.message)
    }
  }

  // Drag and drop handlers for schools
  const handleSchoolDragStart = (e, schoolId) => {
    setDraggedSchoolId(schoolId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', schoolId.toString())
    e.currentTarget.style.opacity = '0.5'
    e.currentTarget.style.cursor = 'grabbing'
  }

  const handleSchoolDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    e.currentTarget.style.cursor = 'move'
    setDraggedSchoolId(null)
  }

  const handleSchoolDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleSchoolDrop = async (e, targetSchoolId) => {
    e.preventDefault()
    if (!draggedSchoolId || draggedSchoolId === targetSchoolId) {
      setDraggedSchoolId(null)
      return
    }

    const schoolPk = s => s.school_id ?? s.id
    const draggedIndex = schools.findIndex(s => schoolPk(s) === draggedSchoolId)
    const targetIndex = schools.findIndex(s => schoolPk(s) === targetSchoolId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSchoolId(null)
      return
    }

    // Reorder schools array
    const newSchools = [...schools]
    const [removed] = newSchools.splice(draggedIndex, 1)
    newSchools.splice(targetIndex, 0, removed)

    // Update display_order for all affected schools
    const updates = newSchools.map((school, index) => ({
      school_id: schoolPk(school),
      display_order: index + 1
    }))

    try {
      await Promise.all(
        updates.map(update =>
          supabase
            .from('schools')
            .update({ display_order: update.display_order })
            .eq('school_id', update.school_id)
        )
      )

      await loadSchools()
    } catch (err) {
      console.error('Error reordering schools:', err)
      alert('Failed to reorder schools: ' + err.message)
    }

    setDraggedSchoolId(null)
  }

  // Drag and drop handlers for partners
  const handlePartnerDragStart = (e, partnerId) => {
    setDraggedPartnerId(partnerId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', partnerId.toString())
    e.currentTarget.style.opacity = '0.5'
    e.currentTarget.style.cursor = 'grabbing'
  }

  const handlePartnerDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    e.currentTarget.style.cursor = 'move'
    setDraggedPartnerId(null)
  }

  const handlePartnerDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handlePartnerDrop = async (e, targetPartnerId) => {
    e.preventDefault()
    if (!draggedPartnerId || draggedPartnerId === targetPartnerId) {
      setDraggedPartnerId(null)
      return
    }

    const draggedIndex = partners.findIndex(p => p.partner_id === draggedPartnerId)
    const targetIndex = partners.findIndex(p => p.partner_id === targetPartnerId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPartnerId(null)
      return
    }

    // Reorder partners array
    const newPartners = [...partners]
    const [removed] = newPartners.splice(draggedIndex, 1)
    newPartners.splice(targetIndex, 0, removed)

    // Update display_order for all affected partners
    const updates = newPartners.map((partner, index) => ({
      partner_id: partner.partner_id,
      display_order: index + 1
    }))

    try {
      // Update all partners in parallel
      await Promise.all(
        updates.map(update =>
          supabase
            .from('partners')
            .update({ display_order: update.display_order })
            .eq('partner_id', update.partner_id)
        )
      )

      await loadPartners()
    } catch (err) {
      console.error('Error reordering partners:', err)
      alert('Failed to reorder partners: ' + err.message)
    }

    setDraggedPartnerId(null)
  }

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

  const effectiveMember = viewAsData?.member ?? member
  const fullName = `${effectiveMember.first_name || ''} ${effectiveMember.last_name || ''}`.trim()

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

  const effectiveVolunteerEntries = viewAsData ? (viewAsData.volunteer_entries ?? []) : volunteerEntries
  const effectiveBills = viewAsData ? (viewAsData.bills ?? []) : (hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration') ? allBills : mySubmittedBills)
  const effectiveRequests = viewAsData ? (viewAsData.leave_requests ?? []) : (hasPermission('registration') ? filteredMemberRequests : myRequests)
  const effectiveApplications = viewAsData ? (viewAsData.applications ?? []) : applications
  const filteredEffectiveApplications = applicationFilter === 'all' ? effectiveApplications : effectiveApplications.filter(app => app.status === applicationFilter)

  // Group volunteer entries by member_id
  const groupedEntries = {}
  effectiveVolunteerEntries.forEach(entry => {
    if (!groupedEntries[entry.member_id]) {
      groupedEntries[entry.member_id] = []
    }
    groupedEntries[entry.member_id].push(entry)
  })

  // Group bills by state
  const billsByState = {}
  effectiveBills.forEach(bill => {
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
        {/* View-as mode: banner and loading/error */}
        {viewAsLoading && new URLSearchParams(window.location.search).get('viewAs') && (
          <div className="alert alert-info d-flex align-items-center gap-2">
            <span className="spinner-border spinner-border-sm" />
            Loading this member&apos;s dashboard...
          </div>
        )}
        {viewAsError && (
          <div className="alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2">
            <span>{viewAsError}</span>
            <a href="/dashboard" className="btn btn-sm btn-outline-dark">Exit view</a>
          </div>
        )}
        {viewAsData && !viewAsError && (
          <div className="alert alert-dark d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
            <span>
              <i className="bi bi-person-badge me-2" />
              Viewing dashboard as <strong>{effectiveMember.first_name} {effectiveMember.last_name}</strong>
            </span>
            <a href="/dashboard" className="btn btn-sm btn-light text-dark">Exit view</a>
          </div>
        )}

        {/* Profile Header */}
        <div className="text-center mb-5">
          <input
            ref={profilePicInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="d-none"
            onChange={handleProfilePicChange}
          />
          <div className="position-relative d-inline-block mb-3">
            {effectiveMember.image ? (
              <img
                src={`${IMAGE_BASE_URL}/${effectiveMember.image}${!viewAsData && profilePicVersion ? `?v=${profilePicVersion}` : ''}`}
                className="rounded-circle border border-dark border-3"
                alt="Profile"
                style={{ width: '150px', height: '150px', objectFit: 'cover' }}
              />
            ) : (
              <div
                className="rounded-circle border border-dark border-3 d-flex align-items-center justify-content-center bg-light text-dark"
                style={{ width: '150px', height: '150px', fontSize: '3rem' }}
              >
                {effectiveMember.first_name?.[0]}{effectiveMember.last_name?.[0]}
              </div>
            )}
            {!viewAsData && (
              <button
                type="button"
                className="btn btn-sm btn-dark position-absolute bottom-0 end-0 rounded-circle p-2"
                style={{ width: '36px', height: '36px' }}
                onClick={handleProfilePicClick}
                disabled={profilePicLoading}
                title="Change profile picture"
              >
                {profilePicLoading ? (
                  <span className="spinner-border spinner-border-sm" style={{ width: '14px', height: '14px' }} />
                ) : (
                  <i className="bi bi-camera-fill" style={{ fontSize: '0.9rem' }} />
                )}
              </button>
            )}
          </div>
          {!viewAsData && profilePicError && (
            <div className="small text-danger mb-1">{profilePicError}</div>
          )}
          {!viewAsData && profilePicSuccess && (
            <div className="small text-success mb-1">{profilePicSuccess}</div>
          )}
          {!viewAsData && (
            <div className="small text-muted mb-1">
              <button type="button" className="btn btn-link btn-sm p-0 text-muted" onClick={handleProfilePicClick}>
                Change profile picture
              </button>
            </div>
          )}
          <h2>{fullName}</h2>
          <p className="text-muted">{effectiveMember.role || '-'}</p>
          <div className="mt-2">
            {effectiveMember.linkedin && (
              <a href={effectiveMember.linkedin} target="_blank" rel="noopener noreferrer" className="text-dark fs-4 me-2">
                <i className="bi bi-linkedin"></i>
              </a>
            )}
            {effectiveMember.instagram && (
              <a href={effectiveMember.instagram} target="_blank" rel="noopener noreferrer" className="text-dark fs-4">
                <i className="bi bi-instagram"></i>
              </a>
            )}
          </div>
          {!viewAsData && (
            <button className="btn btn-dark mt-3" onClick={handleDownloadSpanCard}>
              <i className="bi bi-person-vcard"></i> Download My SPANCard
            </button>
          )}
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
                  {formatDate(effectiveMember.start_date)}
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
                  {effectiveMember.email || '-'}
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
                      {formatDate(effectiveMember.dob)}
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
                      {effectiveMember.city && effectiveMember.state ? `${effectiveMember.city}, ${effectiveMember.state}` : '-'}
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
                      {effectiveMember.school_name || '-'}
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
                      {formatPhone(effectiveMember.phone)}
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
            {!viewAsData && (
              <button className="btn btn-dark" onClick={handleAddVolunteer}>
                <i className="bi bi-plus-circle me-2"></i>Add Entry
              </button>
            )}
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {Object.entries(groupedEntries).map(([memberId, entries]) => {
              const firstEntry = entries[0]
              const memberData = viewAsData ? effectiveMember : (firstEntry.members || {})
              const isOwn = firstEntry.member_id === effectiveMember.member_id
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
                                  <p><i className="bi bi-upload me-1"></i>Submitted: {new Date(entry.request_submit_timestamp || entry.created_at || 0).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  {!viewAsData && (
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
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {!viewAsData && hasPermission('volunteer') && entries.some(e => e.approved === 'approved') && (
                        <div className="mt-3 pt-3 border-top d-flex justify-content-end">
                          <button
                            className="btn btn-sm btn-outline-dark"
                            disabled={verificationGenerating}
                            onClick={() => {
                              const approved = entries.filter(e => e.approved === 'approved')
                              handleSendVerification(memberId, approved)
                            }}
                          >
                            {verificationGenerating ? (
                              <><span className="spinner-border spinner-border-sm me-1" role="status"></span>Generating...</>
                            ) : (
                              <><i className="bi bi-file-earmark-pdf me-1"></i>Send Verification Letter ({entries.filter(e => e.approved === 'approved').length} approved)</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {effectiveVolunteerEntries.length === 0 && (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-clock-history display-4 d-block mb-3"></i>
                <p>No volunteer entries found.{!viewAsData && ' Add your first entry to get started.'}</p>
              </div>
            )}
          </div>
        </section>

        {/* Bill Management Section - Execs Only (all 4 permissions) */}
        {(() => {
          const isExec = hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration')
          return isExec
        })() && (
          <section className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
              <h3 className="mb-0">Bill Management</h3>
              <div className="d-flex align-items-center gap-2">
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${billFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setBillFilter('all')}
                  >
                    All ({effectiveBills.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${billFilter === 'under_review' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setBillFilter('under_review')}
                  >
                    Under Review ({effectiveBills.filter(b => b.status === 'under_review' || (!b.status && billFilter === 'under_review')).length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${billFilter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setBillFilter('approved')}
                  >
                    Approved ({effectiveBills.filter(b => b.status === 'approved' || (!b.status && billFilter === 'approved')).length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${billFilter === 'modified' ? 'btn-info' : 'btn-outline-info'}`}
                    onClick={() => setBillFilter('modified')}
                  >
                    Modified ({effectiveBills.filter(b => b.status === 'modified').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${billFilter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setBillFilter('rejected')}
                  >
                    Rejected ({effectiveBills.filter(b => b.status === 'rejected').length})
                  </button>
                </div>
                {!viewAsData && (
                  <button className="btn btn-dark btn-sm" onClick={handleAddBill}>
                    <i className="bi bi-plus-circle me-2"></i>Upload New Bill
                  </button>
                )}
              </div>
            </div>

            {/* Filtered Bills List */}
            {(() => {
              const filteredBills = billFilter === 'all' 
                ? effectiveBills 
                : effectiveBills.filter(bill => {
                    if (billFilter === 'approved' && (!bill.status || bill.status === 'approved')) return true
                    return bill.status === billFilter
                  })
              
              // Group by state
              const billsByStateFiltered = {}
              filteredBills.forEach(bill => {
                const state = bill.state || 'Unknown'
                if (!billsByStateFiltered[state]) {
                  billsByStateFiltered[state] = []
                }
                billsByStateFiltered[state].push(bill)
              })
              
              const sortedStatesFiltered = Object.keys(billsByStateFiltered).sort((a, b) => {
                if (a === 'Unknown') return 1
                if (b === 'Unknown') return -1
                return a.localeCompare(b)
              })

              return filteredBills.length > 0 ? (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {sortedStatesFiltered.map(state => {
                  const stateBills = billsByStateFiltered[state]
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
                                      <div className="d-flex gap-2 align-items-center">
                                        <span className={`badge ${
                                          bill.position === 'Support' ? 'bg-success' :
                                          bill.position === 'Oppose' ? 'bg-danger' :
                                          bill.position === 'Propose' ? 'bg-info' :
                                          'bg-warning text-dark'
                                        }`}>
                                          {bill.position}
                                        </span>
                                        {bill.status && bill.status !== 'approved' && (
                                          <span className={`badge ${
                                            bill.status === 'under_review' ? 'bg-warning text-dark' :
                                            bill.status === 'modified' ? 'bg-info' :
                                            bill.status === 'rejected' ? 'bg-danger' :
                                            'bg-secondary'
                                          }`} title={bill.status === 'under_review' ? 'Under Review' : bill.status}>
                                            {bill.status === 'under_review' ? 'Under Review' :
                                             bill.status === 'modified' ? 'Modified' :
                                             bill.status === 'rejected' ? 'Rejected' :
                                             bill.status}
                                          </span>
                                        )}
                                      </div>
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
                                    {bill.status === 'under_review' && bill.submitted_by && (
                                      <div className="mb-3">
                                        <strong>Submitted By:</strong>
                                        <p className="mt-1 mb-0">
                                          {(() => {
                                            const submitter = allMembers.find(m => m.member_id === bill.submitted_by)
                                            return submitter ? `${submitter.first_name} ${submitter.last_name}` : 'Unknown'
                                          })()}
                                        </p>
                                      </div>
                                    )}
                                    <div className="mt-3 d-flex gap-2 flex-wrap">
                                      {bill.status === 'under_review' ? (
                                        <>
                                          <button
                                            className="btn btn-sm btn-success"
                                            onClick={() => {
                                              if (window.confirm(`Approve "${bill.name}" and make it live?`)) {
                                                handleApproveBill(bill, false)
                                              }
                                            }}
                                          >
                                            <i className="bi bi-check-circle me-1"></i>Approve
                                          </button>
                                          <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleModifyAndApproveBill(bill)}
                                          >
                                            <i className="bi bi-pencil me-1"></i>Modify & Approve
                                          </button>
                                          <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => {
                                              const notes = window.prompt('Rejection reason (optional):')
                                              if (notes !== null) {
                                                handleRejectBill(bill, notes)
                                              }
                                            }}
                                          >
                                            <i className="bi bi-x-circle me-1"></i>Reject
                                          </button>
                                        </>
                                      ) : (
                                        <>
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
                                        </>
                                      )}
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
                <p>No {billFilter === 'all' ? '' : billFilter.replace('_', ' ')} bills found.</p>
              </div>
            )
            })()}
          </section>
        )}

        {/* Bill Submission Section - For Members with Bills Permission (but not execs) */}
        {(() => {
          const hasBills = hasPermission('bills')
          const isExec = hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration')
          return hasBills && !isExec
        })() && (
          <section className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3>Bill Submission</h3>
              {!viewAsData && (
                <button className="btn btn-dark" onClick={handleAddBill}>
                  <i className="bi bi-plus-circle me-2"></i>Submit Bill for Review
                </button>
              )}
            </div>

            {/* My Submitted Bills */}
            {effectiveBills.length > 0 ? (
              <div>
                <h4 className="mb-3">My Submitted Bills</h4>
                <div className="accordion mb-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {effectiveBills.map(bill => (
                    <div key={bill.bill_id} className="accordion-item mb-2 shadow-sm border rounded">
                      <h2 className="accordion-header">
                        <button
                          className="accordion-button collapsed bg-white text-dark"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapseMyBill${bill.bill_id}`}
                          aria-expanded="false"
                        >
                          <div className="d-flex w-100 justify-content-between align-items-center">
                            <span className="fw-bold">{bill.name}</span>
                            <span className={`badge me-3 ${
                              bill.status === 'approved' ? 'bg-success' :
                              bill.status === 'modified' ? 'bg-info' :
                              bill.status === 'rejected' ? 'bg-danger' :
                              'bg-warning text-dark'
                            }`}>
                              {bill.status === 'under_review' ? 'Under Review' :
                               bill.status === 'approved' ? 'Approved' :
                               bill.status === 'modified' ? 'Modified' :
                               bill.status === 'rejected' ? 'Rejected' :
                               'Pending'}
                            </span>
                            <span className="text-muted">{formatDate(bill.bill_date)}</span>
                          </div>
                        </button>
                      </h2>
                      <div id={`collapseMyBill${bill.bill_id}`} className="accordion-collapse collapse">
                        <div className="accordion-body">
                          <div className="mb-3">
                            <strong>State:</strong>
                            <p className="mt-1 mb-0">{bill.state}</p>
                          </div>
                          <div className="mb-3">
                            <strong>Description:</strong>
                            <p className="mt-1 mb-0">{bill.description || '-'}</p>
                          </div>
                          <div className="mb-3">
                            <strong>Status:</strong>
                            <p className="mt-1 mb-0">
                              <span className={`badge ${
                                bill.status === 'approved' ? 'bg-success' :
                                bill.status === 'modified' ? 'bg-info' :
                                bill.status === 'rejected' ? 'bg-danger' :
                                'bg-warning text-dark'
                              }`}>
                                {bill.status === 'under_review' ? 'Under Review' :
                                 bill.status === 'approved' ? 'Approved' :
                                 bill.status === 'modified' ? 'Modified & Approved' :
                                 bill.status === 'rejected' ? 'Rejected' :
                                 'Pending'}
                              </span>
                            </p>
                          </div>
                          {bill.review_notes && (
                            <div className="mb-3">
                              <strong>Review Notes:</strong>
                              <p className="mt-1 mb-0">{bill.review_notes}</p>
                            </div>
                          )}
                          {bill.reviewed_at && (
                            <div className="mb-3">
                              <strong>Reviewed:</strong>
                              <p className="mt-1 mb-0">{formatDateLong(bill.reviewed_at)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-file-earmark-text display-4 d-block mb-3"></i>
                <p>No submitted bills yet. Submit your first bill for review.</p>
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

            <input
              ref={execMemberPhotoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="d-none"
              onChange={handleExecMemberPhotoFileChange}
            />
            {(memberPhotoError || memberPhotoSuccess) && (
              <div className="mb-3">
                {memberPhotoError && <div className="small text-danger">{memberPhotoError}</div>}
                {memberPhotoSuccess && <div className="small text-success">{memberPhotoSuccess}</div>}
              </div>
            )}

            {/* Active and Inactive Members in 2 columns with collapsible accordions */}
            <div className="row g-4">
              {/* Active Members */}
              <div className="col-lg-6">
                <div className="mb-4">
                  <h4 className="mb-3">Active Members</h4>
                  <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
                    {allMembersForManagement.filter(m => m.active !== false).length > 0 ? (
                      <div className="accordion" id="activeMembersAccordion">
                      {allMembersForManagement.filter(m => m.active !== false).map(memberItem => (
                        <div key={memberItem.member_id} className="accordion-item mb-2 shadow-sm border rounded">
                          <h2 className="accordion-header">
                            <button
                              className="accordion-button collapsed bg-white text-dark"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target={`#collapseActiveMember${memberItem.member_id}`}
                              aria-expanded="false"
                            >
                              <div className="d-flex w-100 align-items-center gap-3">
                                {memberItem.image ? (
                                  <img
                                    src={`${IMAGE_BASE_URL}/${memberItem.image}`}
                                    alt=""
                                    className="rounded-circle flex-shrink-0"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle flex-shrink-0 bg-light text-dark d-flex align-items-center justify-content-center"
                                    style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}
                                  >
                                    {memberItem.first_name?.[0]}{memberItem.last_name?.[0]}
                                  </div>
                                )}
                                <div className="d-flex flex-column text-start">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold">{memberItem.first_name} {memberItem.last_name}</span>
                                    <span className="badge bg-secondary">{memberItem.role || 'No Role'}</span>
                                  </div>
                                  <small className="text-muted">{memberItem.email}</small>
                                </div>
                              </div>
                            </button>
                          </h2>
                          <div id={`collapseActiveMember${memberItem.member_id}`} className="accordion-collapse collapse" data-bs-parent="#activeMembersAccordion">
                            <div className="accordion-body">
                              <div className="row g-3">
                                <div className="col-12 d-flex align-items-center gap-3 mb-2">
                                  {memberItem.image ? (
                                    <img
                                      src={`${IMAGE_BASE_URL}/${memberItem.image}`}
                                      alt=""
                                      className="rounded-circle"
                                      style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div
                                      className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
                                      style={{ width: '64px', height: '64px', fontSize: '1.25rem' }}
                                    >
                                      {memberItem.first_name?.[0]}{memberItem.last_name?.[0]}
                                    </div>
                                  )}
                                  <div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={(ev) => { ev.stopPropagation(); handleExecChangeMemberPhoto(memberItem); }}
                                      disabled={memberPhotoLoading}
                                    >
                                      {memberPhotoLoading && memberPhotoTarget === memberItem.member_id ? (
                                        <span className="spinner-border spinner-border-sm me-1" />
                                      ) : (
                                        <i className="bi bi-camera me-1" />
                                      )}
                                      Change profile picture
                                    </button>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <strong>Name:</strong>
                                  <p className="mt-1 mb-0">{memberItem.first_name} {memberItem.last_name}</p>
                                </div>
                                <div className="col-md-6">
                                  <strong>Email:</strong>
                                  <p className="mt-1 mb-0">
                                    <a href={`mailto:${memberItem.email}`}>{memberItem.email}</a>
                                  </p>
                                </div>
                                <div className="col-md-6">
                                  <strong>Role:</strong>
                                  <p className="mt-1 mb-0">{memberItem.role || '-'}</p>
                                </div>
                                <div className="col-md-6">
                                  <strong>Phone:</strong>
                                  <p className="mt-1 mb-0">
                                    {memberItem.phone ? (
                                      <a href={`tel:${memberItem.phone}`}>{formatPhone(memberItem.phone.toString())}</a>
                                    ) : '-'}
                                  </p>
                                </div>
                                {memberItem.school_name && (
                                  <div className="col-md-6">
                                    <strong>School:</strong>
                                    <p className="mt-1 mb-0">{memberItem.school_name}</p>
                                  </div>
                                )}
                                {(memberItem.city || memberItem.state) && (
                                  <div className="col-md-6">
                                    <strong>Location:</strong>
                                    <p className="mt-1 mb-0">
                                      {memberItem.city && memberItem.state 
                                        ? `${memberItem.city}, ${memberItem.state}`
                                        : memberItem.city || memberItem.state || '-'}
                                    </p>
                                  </div>
                                )}
                                <div className="col-12">
                                  <strong>Permissions:</strong>
                                  <div className="d-flex gap-1 flex-wrap mt-1">
                                    {memberItem.volunteer && <span className="badge bg-primary">Volunteer</span>}
                                    {memberItem.applications && <span className="badge bg-success">Applications</span>}
                                    {memberItem.bills && <span className="badge bg-info">Bills</span>}
                                    {memberItem.registration && <span className="badge bg-warning text-dark">Registration</span>}
                                    {!memberItem.volunteer && !memberItem.applications && !memberItem.bills && !memberItem.registration && (
                                      <span className="text-muted">No permissions</span>
                                    )}
                                  </div>
                                </div>
                                {memberItem.start_date && (
                                  <div className="col-md-6">
                                    <strong>Start Date:</strong>
                                    <p className="mt-1 mb-0">{formatDate(memberItem.start_date)}</p>
                                  </div>
                                )}
                                <div className="col-12 mt-2">
                                  <div className="d-flex gap-2 flex-wrap">
                                    {hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration') && (
                                      <a
                                        href={`/dashboard?viewAs=${memberItem.member_id}`}
                                        className="btn btn-sm btn-outline-dark"
                                      >
                                        <i className="bi bi-person-square me-1"></i>View dashboard
                                      </a>
                                    )}
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => handleEditMember(memberItem)}
                                    >
                                      <i className="bi bi-pencil me-1"></i>Edit
                                    </button>
                                    <a
                                      href={`mailto:${memberItem.email}`}
                                      className="btn btn-sm btn-outline-secondary"
                                    >
                                      <i className="bi bi-envelope me-1"></i>Email
                                    </a>
                                    {memberItem.phone && (
                                      <a
                                        href={`sms:${memberItem.phone}`}
                                        className="btn btn-sm btn-outline-secondary"
                                      >
                                        <i className="bi bi-chat-dots me-1"></i>Text
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    ) : (
                    <p className="text-muted">No active members found.</p>
                  )}
                  </div>
                </div>
              </div>

              {/* Inactive Members */}
              <div className="col-lg-6">
                <div className="mb-4">
                  <h4 className="mb-3">Inactive Members</h4>
                  <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
                    {allMembersForManagement.filter(m => m.active === false).length > 0 ? (
                      <div className="accordion" id="inactiveMembersAccordion">
                      {allMembersForManagement.filter(m => m.active === false).map(memberItem => (
                        <div key={memberItem.member_id} className="accordion-item mb-2 shadow-sm border rounded opacity-75">
                          <h2 className="accordion-header">
                            <button
                              className="accordion-button collapsed bg-white text-dark"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target={`#collapseInactiveMember${memberItem.member_id}`}
                              aria-expanded="false"
                            >
                              <div className="d-flex w-100 align-items-center gap-3">
                                {memberItem.image ? (
                                  <img
                                    src={`${IMAGE_BASE_URL}/${memberItem.image}`}
                                    alt=""
                                    className="rounded-circle flex-shrink-0"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle flex-shrink-0 bg-light text-dark d-flex align-items-center justify-content-center"
                                    style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}
                                  >
                                    {memberItem.first_name?.[0]}{memberItem.last_name?.[0]}
                                  </div>
                                )}
                                <div className="d-flex flex-column text-start">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold">{memberItem.first_name} {memberItem.last_name}</span>
                                    <span className="badge bg-secondary">{memberItem.role || 'No Role'}</span>
                                  </div>
                                  <small className="text-muted">{memberItem.email}</small>
                                </div>
                              </div>
                            </button>
                          </h2>
                          <div id={`collapseInactiveMember${memberItem.member_id}`} className="accordion-collapse collapse" data-bs-parent="#inactiveMembersAccordion">
                            <div className="accordion-body">
                              <div className="row g-3">
                                <div className="col-12 d-flex align-items-center gap-3 mb-2">
                                  {memberItem.image ? (
                                    <img
                                      src={`${IMAGE_BASE_URL}/${memberItem.image}`}
                                      alt=""
                                      className="rounded-circle"
                                      style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div
                                      className="rounded-circle bg-light text-dark d-flex align-items-center justify-content-center"
                                      style={{ width: '64px', height: '64px', fontSize: '1.25rem' }}
                                    >
                                      {memberItem.first_name?.[0]}{memberItem.last_name?.[0]}
                                    </div>
                                  )}
                                  <div>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={(ev) => { ev.stopPropagation(); handleExecChangeMemberPhoto(memberItem); }}
                                      disabled={memberPhotoLoading}
                                    >
                                      {memberPhotoLoading && memberPhotoTarget === memberItem.member_id ? (
                                        <span className="spinner-border spinner-border-sm me-1" />
                                      ) : (
                                        <i className="bi bi-camera me-1" />
                                      )}
                                      Change profile picture
                                    </button>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <strong>Name:</strong>
                                  <p className="mt-1 mb-0">{memberItem.first_name} {memberItem.last_name}</p>
                                </div>
                                <div className="col-md-6">
                                  <strong>Email:</strong>
                                  <p className="mt-1 mb-0">
                                    <a href={`mailto:${memberItem.email}`}>{memberItem.email}</a>
                                  </p>
                                </div>
                                <div className="col-md-6">
                                  <strong>Role:</strong>
                                  <p className="mt-1 mb-0">{memberItem.role || '-'}</p>
                                </div>
                                <div className="col-md-6">
                                  <strong>Phone:</strong>
                                  <p className="mt-1 mb-0">
                                    {memberItem.phone ? (
                                      <a href={`tel:${memberItem.phone}`}>{formatPhone(memberItem.phone.toString())}</a>
                                    ) : '-'}
                                  </p>
                                </div>
                                {memberItem.school_name && (
                                  <div className="col-md-6">
                                    <strong>School:</strong>
                                    <p className="mt-1 mb-0">{memberItem.school_name}</p>
                                  </div>
                                )}
                                {(memberItem.city || memberItem.state) && (
                                  <div className="col-md-6">
                                    <strong>Location:</strong>
                                    <p className="mt-1 mb-0">
                                      {memberItem.city && memberItem.state 
                                        ? `${memberItem.city}, ${memberItem.state}`
                                        : memberItem.city || memberItem.state || '-'}
                                    </p>
                                  </div>
                                )}
                                <div className="col-12">
                                  <strong>Permissions:</strong>
                                  <div className="d-flex gap-1 flex-wrap mt-1">
                                    {memberItem.volunteer && <span className="badge bg-primary">Volunteer</span>}
                                    {memberItem.applications && <span className="badge bg-success">Applications</span>}
                                    {memberItem.bills && <span className="badge bg-info">Bills</span>}
                                    {memberItem.registration && <span className="badge bg-warning text-dark">Registration</span>}
                                    {!memberItem.volunteer && !memberItem.applications && !memberItem.bills && !memberItem.registration && (
                                      <span className="text-muted">No permissions</span>
                                    )}
                                  </div>
                                </div>
                                {memberItem.start_date && (
                                  <div className="col-md-6">
                                    <strong>Start Date:</strong>
                                    <p className="mt-1 mb-0">{formatDate(memberItem.start_date)}</p>
                                  </div>
                                )}
                                <div className="col-12 mt-2">
                                  <div className="d-flex gap-2 flex-wrap">
                                    {hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration') && (
                                      <a
                                        href={`/dashboard?viewAs=${memberItem.member_id}`}
                                        className="btn btn-sm btn-outline-dark"
                                      >
                                        <i className="bi bi-person-square me-1"></i>View dashboard
                                      </a>
                                    )}
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => handleEditMember(memberItem)}
                                    >
                                      <i className="bi bi-pencil me-1"></i>Edit
                                    </button>
                                    <a
                                      href={`mailto:${memberItem.email}`}
                                      className="btn btn-sm btn-outline-secondary"
                                    >
                                      <i className="bi bi-envelope me-1"></i>Email
                                    </a>
                                    {memberItem.phone && (
                                      <a
                                        href={`sms:${memberItem.phone}`}
                                        className="btn btn-sm btn-outline-secondary"
                                      >
                                        <i className="bi bi-chat-dots me-1"></i>Text
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    ) : (
                    <p className="text-muted">No inactive members found.</p>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Partners Management - Executive Directors Only */}
        {hasPermission('registration') && (
          <section className="mt-5">
            <h3 className="mb-4">Partners</h3>
            <div className="alert alert-info mb-4">
              <i className="bi bi-info-circle me-2"></i>
              Manage schools and partner organizations displayed on the homepage. Upload logos and they will appear automatically.
            </div>

            <div className="row g-4">
              {/* Schools Column */}
              <div className="col-md-6">
                <div className="card h-100 shadow-sm">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Schools</h5>
                    <button className="btn btn-sm btn-dark" onClick={handleAddSchool}>
                      <i className="bi bi-plus-circle me-1"></i>Add School
                    </button>
                  </div>
                  <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
                    {schools.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover table-sm mb-0">
                          <thead>
                            <tr>
                              <th style={{ width: '30px' }}></th>
                              <th>Logo</th>
                              <th>Name</th>
                              <th>Active</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schools.map(school => {
                              const schoolPk = school.school_id ?? school.id
                              return (
                              <tr 
                                key={schoolPk}
                                draggable
                                onDragStart={(e) => handleSchoolDragStart(e, schoolPk)}
                                onDragEnd={handleSchoolDragEnd}
                                onDragOver={handleSchoolDragOver}
                                onDrop={(e) => handleSchoolDrop(e, schoolPk)}
                                style={{ 
                                  cursor: 'move',
                                  opacity: draggedSchoolId === schoolPk ? 0.5 : 1
                                }}
                              >
                                <td>
                                  <i className="bi bi-grip-vertical text-muted" style={{ cursor: 'grab', userSelect: 'none' }}></i>
                                </td>
                                <td>
                                  {school.school_image && (
                                    <img
                                      src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/schools-images/${school.school_image}`}
                                      alt={school.school_name}
                                      style={{ maxHeight: '40px', maxWidth: '80px', objectFit: 'contain' }}
                                    />
                                  )}
                                </td>
                                <td>{school.school_name}</td>
                                <td>
                                  <span className={`badge ${school.active !== false ? 'bg-success' : 'bg-secondary'}`}>
                                    {school.active !== false ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  <div className="d-flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditSchool(school)
                                      }}
                                      title="Edit"
                                    >
                                      <i className="bi bi-pencil"></i>
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteSchool(schoolPk)
                                      }}
                                      title="Delete"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <i className="bi bi-building display-6 d-block mb-2"></i>
                        <p className="small mb-0">No schools found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Partner Organizations Column */}
              <div className="col-md-6">
                <div className="card h-100 shadow-sm">
                  <div className="card-header bg-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Partner Organizations</h5>
                    <button className="btn btn-sm btn-dark" onClick={handleAddPartner}>
                      <i className="bi bi-plus-circle me-1"></i>Add Partner
                    </button>
                  </div>
                  <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
                    {partners.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-hover table-sm mb-0">
                          <thead>
                            <tr>
                              <th style={{ width: '30px' }}></th>
                              <th>Logo</th>
                              <th>Name</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {partners.map(partner => (
                              <tr 
                                key={partner.partner_id}
                                draggable
                                onDragStart={(e) => handlePartnerDragStart(e, partner.partner_id)}
                                onDragEnd={handlePartnerDragEnd}
                                onDragOver={handlePartnerDragOver}
                                onDrop={(e) => handlePartnerDrop(e, partner.partner_id)}
                                style={{ 
                                  cursor: 'move',
                                  opacity: draggedPartnerId === partner.partner_id ? 0.5 : 1
                                }}
                              >
                                <td>
                                  <i className="bi bi-grip-vertical text-muted" style={{ cursor: 'grab', userSelect: 'none' }}></i>
                                </td>
                                <td>
                                  {partner.partner_logo && (
                                    <img
                                      src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/partners-images/${partner.partner_logo}`}
                                      alt={partner.partner_name}
                                      style={{ maxHeight: '40px', maxWidth: '80px', objectFit: 'contain' }}
                                    />
                                  )}
                                </td>
                                <td>{partner.partner_name}</td>
                                <td>
                                  <span className={`badge ${partner.active ? 'bg-success' : 'bg-secondary'}`}>
                                    {partner.active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  <div className="d-flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditPartner(partner)
                                      }}
                                      title="Edit"
                                    >
                                      <i className="bi bi-pencil"></i>
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeletePartner(partner.partner_id)
                                      }}
                                      title="Delete"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <i className="bi bi-handshake display-6 d-block mb-2"></i>
                        <p className="small mb-0">No partners found.</p>
                      </div>
                    )}
                  </div>
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
                  All ({effectiveApplications.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => setApplicationFilter('pending')}
                >
                  Pending ({effectiveApplications.filter(a => a.status === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'under_review' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setApplicationFilter('under_review')}
                >
                  Under Review ({effectiveApplications.filter(a => a.status === 'under_review').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'contacted' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setApplicationFilter('contacted')}
                >
                  Contacted ({effectiveApplications.filter(a => a.status === 'contacted').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'accepted' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setApplicationFilter('accepted')}
                >
                  Accepted ({effectiveApplications.filter(a => a.status === 'accepted').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${applicationFilter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setApplicationFilter('rejected')}
                >
                  Rejected ({effectiveApplications.filter(a => a.status === 'rejected').length})
                </button>
              </div>
            </div>

            {filteredEffectiveApplications.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-hover table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Grade</th>
                      <th>State</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEffectiveApplications.map(app => (
                      <tr key={app.application_id}>
                        <td>{app.full_name}</td>
                        <td>
                          <a href={`mailto:${app.email}`}>{app.email}</a>
                        </td>
                        <td>{app.grade}</td>
                        <td>{app.state}</td>
                        <td>{formatDateLong(app.submitted_at)}</td>
                        <td>
                          <span className={`badge ${
                            app.status === 'pending' ? 'bg-warning text-dark' :
                            app.status === 'under_review' ? 'bg-info' :
                            app.status === 'contacted' ? 'bg-primary' :
                            app.status === 'accepted' ? 'bg-success' :
                            'bg-danger'
                          }`}>
                            {app.status === 'under_review' ? 'Under Review' :
                             app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                          </span>
                        </td>
                        <td className="text-end">
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

        {/* HR Reports - single section: all members can submit; execs see filters + list */}
        <section className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <h3 className="mb-0">HR Reports</h3>
            <div className="d-flex align-items-center gap-2">
              {hasPermission('registration') && (
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${hrReportFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setHrReportFilter('all')}
                  >
                    All ({hrReports.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${hrReportFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setHrReportFilter('pending')}
                  >
                    Pending ({hrReports.filter(r => r.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${hrReportFilter === 'reviewed' ? 'btn-info' : 'btn-outline-info'}`}
                    onClick={() => setHrReportFilter('reviewed')}
                  >
                    Reviewed ({hrReports.filter(r => r.status === 'reviewed').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${hrReportFilter === 'resolved' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setHrReportFilter('resolved')}
                  >
                    Resolved ({hrReports.filter(r => r.status === 'resolved').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${hrReportFilter === 'dismissed' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setHrReportFilter('dismissed')}
                  >
                    Dismissed ({hrReports.filter(r => r.status === 'dismissed').length})
                  </button>
                </div>
              )}
              {!viewAsData && (
                <button className="btn btn-dark btn-sm" onClick={() => {
                  setHrReportForm({
                    nature: '',
                    regardingMemberId: '',
                    regardingName: '',
                    dateOccurred: '',
                    details: ''
                  })
                  setHrReportError('')
                  setHrReportSuccess('')
                  setShowHrReportModal(true)
                }}>
                  <i className="bi bi-file-earmark-text me-2"></i>Submit HR Report
                </button>
              )}
            </div>
          </div>
          {hasPermission('registration') ? (
            <>
              <div className="alert alert-info mb-3">
                <i className="bi bi-info-circle me-2"></i>
                You can view all HR reports except those that involve you directly.
              </div>
              {filteredHrReports.length > 0 ? (
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Submitted</th>
                        <th>Submitted By</th>
                        <th>Nature of Complaint</th>
                        <th>Regarding</th>
                        <th>Date Occurred</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHrReports.map(report => (
                        <tr key={report.report_id}>
                          <td>{formatDateLong(report.created_at)}</td>
                          <td>
                            {report.submitted_by_member ? (
                              `${report.submitted_by_member.first_name} ${report.submitted_by_member.last_name}`
                            ) : 'Unknown'}
                          </td>
                          <td>{report.nature_of_complaint}</td>
                          <td>
                            {report.regarding_member ? (
                              `${report.regarding_member.first_name} ${report.regarding_member.last_name}`
                            ) : report.regarding_name || 'N/A'}
                          </td>
                          <td>{formatDate(report.date_occurred)}</td>
                          <td>
                            <span className={`badge ${
                              report.status === 'pending' ? 'bg-warning text-dark' :
                              report.status === 'resolved' ? 'bg-success' :
                              report.status === 'dismissed' ? 'bg-secondary' :
                              'bg-info'
                            }`}>
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setSelectedHrReport(report)
                                setShowHrReportViewModal(true)
                              }}
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
                  <p>No {hrReportFilter === 'all' ? '' : hrReportFilter} HR reports found.</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted mb-0">Submit a confidential HR complaint or report using the button above. Reports are reviewed by executive directors.</p>
          )}
        </section>

        {/* Leave & extension requests - single section: members see own requests + make new; execs see all + filters + make new */}
        <section className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <h3 className="mb-0">Leave & extension requests</h3>
            <div className="d-flex align-items-center gap-2">
              {!viewAsData && hasPermission('registration') && (
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'all' ? 'btn-dark' : 'btn-outline-dark'}`}
                    onClick={() => setMemberRequestFilter('all')}
                  >
                    All ({allMemberRequests.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={() => setMemberRequestFilter('pending')}
                  >
                    Pending ({allMemberRequests.filter(r => r.status === 'pending').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setMemberRequestFilter('approved')}
                  >
                    Approved ({allMemberRequests.filter(r => r.status === 'approved').length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${memberRequestFilter === 'declined' ? 'btn-danger' : 'btn-outline-danger'}`}
                    onClick={() => setMemberRequestFilter('declined')}
                  >
                    Declined ({allMemberRequests.filter(r => r.status === 'declined').length})
                  </button>
                </div>
              )}
              {!viewAsData && (
                <button className="btn btn-dark btn-sm" onClick={() => { setRequestError(''); setRequestSuccess(''); setRequestForm({ type: 'leave', reason: '', leaveStart: '', leaveEnd: '', projectName: '', requestedByDate: '' }); setShowRequestModal(true) }}>
                  <i className="bi bi-plus-circle me-2"></i>Make new request
                </button>
              )}
            </div>
          </div>
          {(() => {
            const isExecDisplay = !viewAsData && hasPermission('registration')
            const requests = effectiveRequests
            if (requests.length > 0) {
              return (
                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        {isExecDisplay && <th>Member</th>}
                        <th>Type</th>
                        <th>Reason</th>
                        <th>Details</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        {isExecDisplay ? <th>Actions</th> : <th>Review notes</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(req => (
                        <tr key={req.request_id}>
                          {isExecDisplay && (
                            <td>
                              {req.member ? `${req.member.first_name} ${req.member.last_name}` : 'Unknown'}
                              {req.member?.email && <div className="small text-muted">{req.member.email}</div>}
                            </td>
                          )}
                          <td><span className="badge bg-secondary text-capitalize">{req.type}</span></td>
                          <td>{req.reason}</td>
                          <td>
                            {req.type === 'leave' && (req.leave_start || req.leave_end)
                              ? `${req.leave_start ? formatDate(req.leave_start) : '—'} to ${req.leave_end ? formatDate(req.leave_end) : '—'}`
                              : req.type === 'extension' && (req.project_name || req.requested_by_date)
                                ? [req.project_name, req.requested_by_date ? formatDate(req.requested_by_date) : null].filter(Boolean).join(' · ')
                                : '—'}
                          </td>
                          <td>
                            <span className={`badge ${req.status === 'approved' ? 'bg-success' : req.status === 'declined' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                              {req.status}
                            </span>
                          </td>
                          <td>{formatDateLong(req.created_at)}</td>
                          {isExecDisplay ? (
                            <td>
                              {req.status === 'pending' && (
                                <>
                                  <button className="btn btn-sm btn-success me-1" onClick={() => openRequestReviewModal(req, 'approve')}>
                                    Approve
                                  </button>
                                  <button className="btn btn-sm btn-danger" onClick={() => openRequestReviewModal(req, 'decline')}>
                                    Decline
                                  </button>
                                </>
                              )}
                            </td>
                          ) : (
                            <td>{req.review_notes || '—'}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
            return (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-calendar-x display-4 d-block mb-3"></i>
                <p className="mb-0">
                  {isExecDisplay ? `No ${memberRequestFilter === 'all' ? '' : memberRequestFilter} leave or extension requests.` : 'No leave or extension requests yet. Use the button above to submit one.'}
                </p>
              </div>
            )
          })()}
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

      {/* Request leave or extension modal */}
      {showRequestModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) setShowRequestModal(false)
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Request leave or extension</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRequestModal(false)}></button>
                </div>
                <form onSubmit={handleSubmitRequest}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Type</label>
                      <select
                        className="form-select"
                        value={requestForm.type}
                        onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}
                      >
                        <option value="leave">Leave / break</option>
                        <option value="extension">Project extension</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Reason <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={requestForm.reason}
                        onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                        placeholder="Explain your request..."
                        required
                      />
                    </div>
                    {requestForm.type === 'leave' && (
                      <div className="mb-3 row">
                        <div className="col-md-6">
                          <label className="form-label">Start date (optional)</label>
                          <input
                            type="date"
                            className="form-control"
                            value={requestForm.leaveStart}
                            onChange={(e) => setRequestForm({ ...requestForm, leaveStart: e.target.value })}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">End date (optional)</label>
                          <input
                            type="date"
                            className="form-control"
                            value={requestForm.leaveEnd}
                            onChange={(e) => setRequestForm({ ...requestForm, leaveEnd: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    {requestForm.type === 'extension' && (
                      <div className="mb-3">
                        <div className="row">
                          <div className="col-md-6 mb-2">
                            <label className="form-label">Project name (optional)</label>
                            <input
                              type="text"
                              className="form-control"
                              value={requestForm.projectName}
                              onChange={(e) => setRequestForm({ ...requestForm, projectName: e.target.value })}
                              placeholder="e.g. Policy brief"
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Requested by date (optional)</label>
                            <input
                              type="date"
                              className="form-control"
                              value={requestForm.requestedByDate}
                              onChange={(e) => setRequestForm({ ...requestForm, requestedByDate: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {requestError && <div className="text-danger small mt-2">{requestError}</div>}
                    {requestSuccess && <div className="text-success small mt-2">{requestSuccess}</div>}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-dark" onClick={() => setShowRequestModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-dark">Submit request</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* Request review (approve/decline) modal - exec only */}
      {showRequestReviewModal && selectedRequestForReview && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowRequestReviewModal(false)
                setSelectedRequestForReview(null)
                setRequestReviewNotes('')
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{requestReviewAction === 'approve' ? 'Approve' : 'Decline'} request</h5>
                  <button type="button" className="btn-close" onClick={() => { setShowRequestReviewModal(false); setSelectedRequestForReview(null) }}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-2"><strong>Member:</strong> {selectedRequestForReview.member ? `${selectedRequestForReview.member.first_name} ${selectedRequestForReview.member.last_name}` : 'Unknown'}</p>
                  <p className="mb-2"><strong>Type:</strong> <span className="text-capitalize">{selectedRequestForReview.type}</span></p>
                  <p className="mb-2"><strong>Reason:</strong> {selectedRequestForReview.reason}</p>
                  <div className="mb-3">
                    <label className="form-label">Review notes (optional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={requestReviewNotes}
                      onChange={(e) => setRequestReviewNotes(e.target.value)}
                      placeholder="e.g. reason for decline or any follow-up"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-dark" onClick={() => { setShowRequestReviewModal(false); setSelectedRequestForReview(null) }}>Cancel</button>
                  <button
                    type="button"
                    className={requestReviewAction === 'approve' ? 'btn btn-success' : 'btn btn-danger'}
                    onClick={handleRequestReviewSubmit}
                  >
                    {requestReviewAction === 'approve' ? 'Approve' : 'Decline'}
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
                      <option value="Propose">Propose</option>
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
                      <option value="Propose">Propose</option>
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
                        onChange={(e) => {
                          emailManuallyEdited.current = true
                          setMemberForm({ ...memberForm, email: e.target.value })
                        }}
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
                    {editingMemberId && (
                      <div className="col-md-6">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="memberFormActive"
                            checked={memberForm.active !== false}
                            onChange={(e) => setMemberForm({ ...memberForm, active: e.target.checked })}
                          />
                          <label className="form-check-label" htmlFor="memberFormActive">
                            Active member
                          </label>
                        </div>
                        <small className="text-muted d-block">Uncheck to move member to Inactive; they won’t appear in the directory.</small>
                      </div>
                    )}
                    
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
                            <small className="text-muted d-block">Can submit bills for review</small>
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
                    {selectedApplication.linkedin_url && (
                      <div className="col-md-6">
                        <strong>LinkedIn:</strong>
                        <p>
                          <a href={selectedApplication.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                            <i className="bi bi-linkedin me-1"></i>
                            {selectedApplication.linkedin_url}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedApplication.instagram_url && (
                      <div className="col-md-6">
                        <strong>Instagram:</strong>
                        <p>
                          <a href={selectedApplication.instagram_url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                            <i className="bi bi-instagram me-1"></i>
                            {selectedApplication.instagram_url}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedApplication.resume_file && (
                      <div className="col-12">
                        <strong>Resume:</strong>
                        <p>
                          <a 
                            href={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/applications-resumes/${selectedApplication.resume_file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            <i className="bi bi-file-earmark-pdf me-1"></i>
                            View Resume
                          </a>
                        </p>
                      </div>
                    )}
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
                          selectedApplication.status === 'under_review' ? 'bg-info' :
                          selectedApplication.status === 'contacted' ? 'bg-primary' :
                          selectedApplication.status === 'accepted' ? 'bg-success' :
                          'bg-danger'
                        }`}>
                          {selectedApplication.status === 'under_review' ? 'Under Review' :
                           selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
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

                  {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review' || selectedApplication.status === 'contacted') && (
                    <div className="alert alert-info">
                      <i className="bi bi-info-circle me-2"></i>
                      You can update the status to track your progress with this application. Add notes for your records.
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
                  <div className="d-flex gap-2 flex-wrap">
                    {(selectedApplication.status === 'pending' || selectedApplication.status === 'under_review' || selectedApplication.status === 'contacted') && (
                      <>
                        <button
                          type="button"
                          className="btn btn-info"
                          onClick={() => handleUpdateApplicationStatus('under_review')}
                        >
                          <i className="bi bi-eye me-1"></i>Mark Under Review
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleUpdateApplicationStatus('contacted')}
                        >
                          <i className="bi bi-envelope-check me-1"></i>Mark Contacted
                        </button>
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={() => {
                            if (window.confirm(`Accept ${selectedApplication.full_name}'s application?\n\nYou'll be able to add them as a member next.`)) {
                              handleAcceptApplication()
                            }
                          }}
                        >
                          <i className="bi bi-check-circle me-1"></i>Accept & Add Member
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            setSendRejectionEmail(true)
                            setShowRejectConfirmModal(true)
                          }}
                        >
                          <i className="bi bi-x-circle me-1"></i>Reject
                        </button>
                      </>
                    )}
                    {(selectedApplication.status === 'accepted' || selectedApplication.status === 'rejected') && (
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

      {/* HR Report Submission Modal */}
      {showHrReportModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowHrReportModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Submit HR Report</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowHrReportModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {hrReportError && <div className="alert alert-danger">{hrReportError}</div>}
                  {hrReportSuccess && <div className="alert alert-success">{hrReportSuccess}</div>}
                  
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    All HR reports are confidential and will be reviewed by executive directors. Reports involving an executive director will not be visible to that person.
                  </div>

                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label">Nature of Complaint <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={hrReportForm.nature}
                        onChange={(e) => setHrReportForm({ ...hrReportForm, nature: e.target.value })}
                        placeholder="e.g., Harassment, Discrimination, Policy Violation, etc."
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Regarding (Member Name)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={hrReportForm.regardingName}
                        onChange={(e) => setHrReportForm({ ...hrReportForm, regardingName: e.target.value })}
                        placeholder="Name of person this report is about (optional)"
                      />
                      <small className="text-muted">If this is about a specific member, enter their name</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Date Occurred <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={hrReportForm.dateOccurred}
                        onChange={(e) => setHrReportForm({ ...hrReportForm, dateOccurred: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">Details</label>
                      <textarea
                        className="form-control"
                        rows="5"
                        value={hrReportForm.details}
                        onChange={(e) => setHrReportForm({ ...hrReportForm, details: e.target.value })}
                        placeholder="Provide additional details about the incident..."
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowHrReportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSubmitHrReport}
                  >
                    Submit Report
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* HR Report View Modal */}
      {showHrReportViewModal && selectedHrReport && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1060 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowHrReportViewModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">HR Report Details</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowHrReportViewModal(false)}
                  ></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <strong>Submitted By:</strong>
                      <p>
                        {selectedHrReport.submitted_by_member ? (
                          `${selectedHrReport.submitted_by_member.first_name} ${selectedHrReport.submitted_by_member.last_name}`
                        ) : 'Unknown'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <strong>Submitted:</strong>
                      <p>{formatDateLong(selectedHrReport.created_at)}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Nature of Complaint:</strong>
                      <p>{selectedHrReport.nature_of_complaint}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Regarding:</strong>
                      <p>
                        {selectedHrReport.regarding_member ? (
                          `${selectedHrReport.regarding_member.first_name} ${selectedHrReport.regarding_member.last_name}`
                        ) : selectedHrReport.regarding_name || 'N/A'}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <strong>Date Occurred:</strong>
                      <p>{formatDate(selectedHrReport.date_occurred)}</p>
                    </div>
                    <div className="col-md-6">
                      <strong>Status:</strong>
                      {hasPermission('volunteer') && hasPermission('applications') && hasPermission('bills') && hasPermission('registration') ? (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              selectedHrReport.status === 'pending' 
                                ? 'btn-warning' 
                                : 'btn-outline-warning'
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Pending button clicked', { reportId: selectedHrReport?.report_id })
                              if (selectedHrReport?.report_id) {
                                handleUpdateHrReportStatus(selectedHrReport.report_id, 'pending')
                              } else {
                                console.error('No report_id found')
                              }
                            }}
                          >
                            Pending
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              selectedHrReport.status === 'reviewed' 
                                ? 'btn-info' 
                                : 'btn-outline-info'
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Reviewed button clicked', { reportId: selectedHrReport?.report_id })
                              if (selectedHrReport?.report_id) {
                                handleUpdateHrReportStatus(selectedHrReport.report_id, 'reviewed')
                              } else {
                                console.error('No report_id found')
                              }
                            }}
                          >
                            Reviewed
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              selectedHrReport.status === 'resolved' 
                                ? 'btn-success' 
                                : 'btn-outline-success'
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Resolved button clicked', { reportId: selectedHrReport?.report_id })
                              if (selectedHrReport?.report_id) {
                                handleUpdateHrReportStatus(selectedHrReport.report_id, 'resolved')
                              } else {
                                console.error('No report_id found')
                              }
                            }}
                          >
                            Resolved
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              selectedHrReport.status === 'dismissed' 
                                ? 'btn-secondary' 
                                : 'btn-outline-secondary'
                            }`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Dismissed button clicked', { reportId: selectedHrReport?.report_id })
                              if (selectedHrReport?.report_id) {
                                handleUpdateHrReportStatus(selectedHrReport.report_id, 'dismissed')
                              } else {
                                console.error('No report_id found')
                              }
                            }}
                          >
                            Dismissed
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2">
                          <span className={`badge ${
                            selectedHrReport.status === 'pending' ? 'bg-warning text-dark' :
                            selectedHrReport.status === 'resolved' ? 'bg-success' :
                            selectedHrReport.status === 'dismissed' ? 'bg-secondary' :
                            'bg-info'
                          }`}>
                            {selectedHrReport.status.charAt(0).toUpperCase() + selectedHrReport.status.slice(1)}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="col-12">
                      <strong>Details:</strong>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{selectedHrReport.details || 'No additional details provided.'}</p>
                    </div>
                    {selectedHrReport.review_notes && (
                      <div className="col-12">
                        <strong>Review Notes:</strong>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{selectedHrReport.review_notes}</p>
                      </div>
                    )}
                    {selectedHrReport.reviewed_by && selectedHrReport.reviewed_at && (
                      <div className="col-md-6">
                        <strong>Reviewed:</strong>
                        <p>{formatDateLong(selectedHrReport.reviewed_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowHrReportViewModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1055 }}></div>
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

      {/* Rejection Confirmation Modal */}
      {showRejectConfirmModal && selectedApplication && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1065 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show') && !rejectionEmailSending) {
                setShowRejectConfirmModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">Reject Application</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowRejectConfirmModal(false)}
                    disabled={rejectionEmailSending}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to reject the application from <strong>{selectedApplication.full_name}</strong>?</p>
                  <div className="form-check mt-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="sendRejectionEmailCheck"
                      checked={sendRejectionEmail}
                      onChange={(e) => setSendRejectionEmail(e.target.checked)}
                      disabled={rejectionEmailSending}
                    />
                    <label className="form-check-label" htmlFor="sendRejectionEmailCheck">
                      Send rejection email to <strong>{selectedApplication.email}</strong>
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowRejectConfirmModal(false)}
                    disabled={rejectionEmailSending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleRejectApplication()}
                    disabled={rejectionEmailSending}
                  >
                    {rejectionEmailSending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Sending email...
                      </>
                    ) : (
                      <>Reject{sendRejectionEmail ? ' & Send Email' : ''}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        </>
      )}

      {/* Volunteer Verification PDF Preview Modal */}
      {showVerificationModal && verificationMember && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1065 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show') && !verificationSending) {
                setShowVerificationModal(false)
                if (verificationPdfUrl) URL.revokeObjectURL(verificationPdfUrl)
                setVerificationPdfUrl(null)
                setVerificationPdfBase64(null)
                setVerificationMember(null)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-file-earmark-pdf me-2"></i>
                    Volunteer Verification Letter
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowVerificationModal(false)
                      if (verificationPdfUrl) URL.revokeObjectURL(verificationPdfUrl)
                      setVerificationPdfUrl(null)
                      setVerificationPdfBase64(null)
                      setVerificationMember(null)
                    }}
                    disabled={verificationSending}
                  ></button>
                </div>
                <div className="modal-body p-0" style={{ height: '70vh' }}>
                  <div className="d-flex flex-column h-100">
                    <div className="px-3 py-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                      <span>
                        <strong>{verificationMember.first_name} {verificationMember.last_name}</strong>
                        <span className="text-muted ms-2">
                          {verificationEntryCount} approved entr{verificationEntryCount === 1 ? 'y' : 'ies'}
                        </span>
                      </span>
                      <span className="text-muted small">
                        Will send to: <strong>{verificationMember.original_email || verificationMember.email}</strong>
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      {verificationPdfUrl ? (
                        <iframe
                          src={verificationPdfUrl}
                          title="Verification Letter Preview"
                          width="100%"
                          height="100%"
                          style={{ border: 'none' }}
                        />
                      ) : (
                        <div className="d-flex justify-content-center align-items-center h-100">
                          <span className="spinner-border" role="status"></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => {
                      setShowVerificationModal(false)
                      if (verificationPdfUrl) URL.revokeObjectURL(verificationPdfUrl)
                      setVerificationPdfUrl(null)
                      setVerificationPdfBase64(null)
                      setVerificationMember(null)
                    }}
                    disabled={verificationSending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleConfirmSendVerification}
                    disabled={verificationSending}
                  >
                    {verificationSending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-envelope-paper me-1"></i>
                        Send Verification Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1060 }}></div>
        </>
      )}

      {/* Partner Add/Edit Modal */}
      {showPartnerModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowPartnerModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingPartnerId ? 'Edit Partner' : 'Add Partner'}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowPartnerModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {partnerError && <div className="alert alert-danger">{partnerError}</div>}
                  {partnerSuccess && <div className="alert alert-success">{partnerSuccess}</div>}

                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label">Partner Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={partnerForm.partnerName}
                        onChange={(e) => setPartnerForm({ ...partnerForm, partnerName: e.target.value })}
                        placeholder="e.g., Beyond Partisan"
                        required
                      />
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">Website URL (Optional)</label>
                      <input
                        type="url"
                        className="form-control"
                        value={partnerForm.websiteUrl}
                        onChange={(e) => setPartnerForm({ ...partnerForm, websiteUrl: e.target.value })}
                        placeholder="https://example.org"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Display Order</label>
                      <input
                        type="number"
                        className="form-control"
                        value={partnerForm.displayOrder}
                        onChange={(e) => setPartnerForm({ ...partnerForm, displayOrder: parseInt(e.target.value) || 999 })}
                        placeholder="999"
                      />
                      <small className="text-muted">Lower numbers appear first</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={partnerForm.active ? 'true' : 'false'}
                        onChange={(e) => setPartnerForm({ ...partnerForm, active: e.target.value === 'true' })}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">
                        Logo {!editingPartnerId && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => setPartnerLogoFile(e.target.files[0] || null)}
                      />
                      <small className="text-muted">
                        {editingPartnerId ? 'Leave empty to keep current logo' : 'Upload partner organization logo'}
                      </small>
                      {editingPartnerId && partners.find(p => p.partner_id === editingPartnerId)?.partner_logo && (
                        <div className="mt-2">
                          <p className="small mb-1">Current logo:</p>
                          <img
                            src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/partners-images/${partners.find(p => p.partner_id === editingPartnerId)?.partner_logo}`}
                            alt="Current logo"
                            style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowPartnerModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSavePartner}
                  >
                    {editingPartnerId ? 'Update Partner' : 'Add Partner'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
        </>
      )}

      {/* School Add/Edit Modal */}
      {showSchoolModal && (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block', zIndex: 1055 }}
            onClick={(e) => {
              if (e.target.className.includes('modal fade show')) {
                setShowSchoolModal(false)
              }
            }}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingSchoolId ? 'Edit School' : 'Add School'}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowSchoolModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  {schoolError && <div className="alert alert-danger">{schoolError}</div>}
                  {schoolSuccess && <div className="alert alert-success">{schoolSuccess}</div>}

                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label">School Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={schoolForm.schoolName}
                        onChange={(e) => setSchoolForm({ ...schoolForm, schoolName: e.target.value })}
                        placeholder="e.g., Rice University"
                        required
                      />
                    </div>

                    <div className="col-md-12">
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="schoolActive"
                          checked={schoolForm.active !== false}
                          onChange={(e) => setSchoolForm({ ...schoolForm, active: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="schoolActive">
                          Active (show on homepage carousel)
                        </label>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <label className="form-label">
                        Logo {!editingSchoolId && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={(e) => setSchoolLogoFile(e.target.files[0] || null)}
                      />
                      <small className="text-muted">
                        {editingSchoolId ? 'Leave empty to keep current logo' : 'Upload school logo'}
                      </small>
                      {editingSchoolId && schools.find(s => (s.school_id ?? s.id) === editingSchoolId)?.school_image && (
                        <div className="mt-2">
                          <p className="small mb-1">Current logo:</p>
                          <img
                            src={`https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public/schools-images/${schools.find(s => (s.school_id ?? s.id) === editingSchoolId)?.school_image}`}
                            alt="Current logo"
                            style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-dark"
                    onClick={() => setShowSchoolModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={handleSaveSchool}
                  >
                    {editingSchoolId ? 'Update School' : 'Add School'}
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


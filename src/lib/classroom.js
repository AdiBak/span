import { supabase } from './supabase'

export const DEFAULT_CLASSROOM_FEATURES = {
  assignments: true,
  legiscan: true,
  policy_toolkit: true,
}

export const CLASSROOM_FEATURE_LABELS = {
  assignments: 'Assignments',
  legiscan: 'LegiScan search',
  policy_toolkit: 'Policy toolkit',
}

const SUBMISSION_BUCKET = 'classroom-submissions'
const MAX_SUBMISSION_BYTES = 10 * 1024 * 1024

/** Common LMS-style extensions teachers can allow for submissions. */
export const CLASSROOM_FILE_TYPE_OPTIONS = [
  { ext: 'pdf', label: 'PDF', accept: '.pdf,application/pdf' },
  { ext: 'doc', label: 'DOC', accept: '.doc,application/msword' },
  { ext: 'docx', label: 'DOCX', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'ppt', label: 'PPT', accept: '.ppt,application/vnd.ms-powerpoint' },
  { ext: 'pptx', label: 'PPTX', accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { ext: 'txt', label: 'TXT', accept: '.txt,text/plain' },
  { ext: 'png', label: 'PNG', accept: '.png,image/png' },
  { ext: 'jpg', label: 'JPG', accept: '.jpg,.jpeg,image/jpeg' },
  { ext: 'webp', label: 'WEBP', accept: '.webp,image/webp' },
  { ext: 'gif', label: 'GIF', accept: '.gif,image/gif' },
]

export function fileExtension(fileName) {
  const parts = String(fileName || '').toLowerCase().split('.')
  if (parts.length < 2) return ''
  return parts.pop() || ''
}

export function acceptAttrForExtensions(extensions) {
  if (!extensions || !extensions.length) {
    return CLASSROOM_FILE_TYPE_OPTIONS.map((o) => o.accept).join(',')
  }
  const set = new Set(extensions.map((e) => String(e).toLowerCase().replace(/^\./, '')))
  return CLASSROOM_FILE_TYPE_OPTIONS.filter((o) => set.has(o.ext))
    .map((o) => o.accept)
    .join(',')
}

export function validateSubmissionFile(file, { allowFileUpload = true, allowedExtensions = null } = {}) {
  if (!file) return null
  if (!allowFileUpload) {
    return 'This assignment does not accept file uploads.'
  }
  if (file.size > MAX_SUBMISSION_BYTES) {
    return 'File must be 10 MB or smaller'
  }
  const ext = fileExtension(file.name)
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext
  if (allowedExtensions?.length) {
    const allowed = allowedExtensions.map((e) => {
      const x = String(e).toLowerCase().replace(/^\./, '')
      return x === 'jpeg' ? 'jpg' : x
    })
    if (!allowed.includes(normalizedExt)) {
      return `File type .${ext || '?'} is not allowed. Use: ${allowed.map((e) => `.${e}`).join(', ')}`
    }
  } else {
    const known = new Set(CLASSROOM_FILE_TYPE_OPTIONS.map((o) => o.ext))
    if (!known.has(normalizedExt)) {
      return 'Unsupported file type.'
    }
  }
  return null
}

export async function getClassroomSessionRole() {
  const { data, error } = await supabase.rpc('get_classroom_session_role')
  if (error) throw error
  return data || {}
}

export async function validateJoinCode(code) {
  const { data, error } = await supabase.rpc('validate_classroom_join_code', { p_code: code })
  if (error) throw error
  return data?.[0] || null
}

export async function joinClassWithCode({ code, firstName, lastName, phone }) {
  const { data, error } = await supabase.rpc('join_classroom_with_code', {
    p_code: code,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
  })
  if (error) throw error
  return data
}

/**
 * Public join when Auth signups are disabled: edge function creates/links the user,
 * enrolls them, and returns session tokens.
 */
export async function registerAndJoinClass({
  code,
  email,
  password,
  firstName,
  lastName,
  phone,
}) {
  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const resp = await fetch(`${base}/functions/v1/classroom-join-student`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      code,
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      phone,
    }),
  })

  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(payload.error || payload.details || 'Could not join class')
  }
  return payload
}

export async function linkTeacherByEmail(teacherId, email) {
  const { data, error } = await supabase.rpc('classroom_link_teacher', {
    p_teacher_id: teacherId,
    p_email: email,
  })
  if (error) throw error
  return data === true
}

export async function createClass(name, term) {
  const { data, error } = await supabase.rpc('classroom_create_class', {
    p_name: name,
    p_term: term || null,
  })
  if (error) throw error
  return data
}

export async function fetchSchools() {
  const { data, error } = await supabase
    .from('classroom_schools')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function fetchTeachers() {
  const { data, error } = await supabase
    .from('classroom_teachers')
    .select('*, classroom_schools(name)')
    .order('last_name')
  if (error) throw error
  return data || []
}

export async function fetchAllClasses() {
  const { data, error } = await supabase
    .from('classroom_classes')
    .select('*, classroom_teachers(first_name, last_name, email), classroom_schools(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchTeacherClasses() {
  const { data, error } = await supabase
    .from('classroom_classes')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchClassRoster(classId) {
  const { data, error } = await supabase
    .from('classroom_enrollments')
    .select('joined_at, classroom_students(student_id, first_name, last_name, email, phone)')
    .eq('class_id', classId)
    .order('joined_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchStudentEnrollments() {
  const { data, error } = await supabase
    .from('classroom_enrollments')
    .select('*, classroom_classes(*)')
    .order('joined_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchClassAssignments(classId) {
  const { data, error } = await supabase
    .from('classroom_assignments')
    .select('*, classroom_assignment_materials(material_id, file_path, file_name, created_at)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAssignmentSubmissions(assignmentIds) {
  if (!assignmentIds.length) return []
  const { data, error } = await supabase
    .from('classroom_submissions')
    .select('*, classroom_students(first_name, last_name)')
    .in('assignment_id', assignmentIds)
  if (error) throw error
  return data || []
}

export async function insertSchool(row) {
  const { data, error } = await supabase.from('classroom_schools').insert(row).select().single()
  if (error) throw error
  return data
}

export async function insertTeacher(row) {
  const { data, error } = await supabase.from('classroom_teachers').insert(row).select().single()
  if (error) throw error
  return data
}

/** Exec: create auth user if needed, link teacher, email Classroom login. */
export async function provisionTeacher(teacherId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not signed in')

  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const resp = await fetch(`${base}/functions/v1/classroom-provision-teacher`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ teacher_id: teacherId }),
  })

  const payload = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    throw new Error(payload.error || payload.details || 'Failed to provision teacher login')
  }
  return payload
}

export async function insertAssignment(row) {
  const { data, error } = await supabase.from('classroom_assignments').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateAssignment(assignmentId, patch) {
  const { data, error } = await supabase
    .from('classroom_assignments')
    .update(patch)
    .eq('assignment_id', assignmentId)
    .select('*, classroom_assignment_materials(material_id, file_path, file_name, created_at)')
    .single()
  if (error) throw error
  return data
}

export async function upsertSubmission(row) {
  const { data, error } = await supabase
    .from('classroom_submissions')
    .upsert(row, { onConflict: 'assignment_id,student_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function gradeSubmission(submissionId, grade, feedback) {
  const { data, error } = await supabase.rpc('classroom_grade_submission', {
    p_submission_id: submissionId,
    p_grade: grade ?? null,
    p_feedback: feedback ?? null,
  })
  if (error) throw error
  return data
}

function sanitizeFileName(name) {
  return String(name || 'file')
    .replace(/[^\w.\-()+ ]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

/** Upload a student submission file. Path: class/assignment/student/filename */
export async function uploadSubmissionFile({
  classId,
  assignmentId,
  studentId,
  file,
  allowFileUpload = true,
  allowedExtensions = null,
}) {
  const validationError = validateSubmissionFile(file, { allowFileUpload, allowedExtensions })
  if (validationError) throw new Error(validationError)

  const safeName = sanitizeFileName(file.name)
  const path = `${classId}/${assignmentId}/${studentId}/${Date.now()}_${safeName}`

  const { error } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error

  return { path, fileName: file.name }
}

/** Teacher context files. Path: class/assignment/_materials/filename */
export async function uploadAssignmentMaterial({ classId, assignmentId, file }) {
  if (!file) throw new Error('No file selected')
  if (file.size > MAX_SUBMISSION_BYTES) {
    throw new Error('File must be 10 MB or smaller')
  }

  const safeName = sanitizeFileName(file.name)
  const path = `${classId}/${assignmentId}/_materials/${Date.now()}_${safeName}`

  const { error } = await supabase.storage.from(SUBMISSION_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error

  const { data, error: insertError } = await supabase
    .from('classroom_assignment_materials')
    .insert({
      assignment_id: assignmentId,
      file_path: path,
      file_name: file.name,
    })
    .select()
    .single()
  if (insertError) throw insertError
  return data
}

export async function deleteAssignmentMaterial(material) {
  if (!material?.material_id) return
  if (material.file_path) {
    await supabase.storage.from(SUBMISSION_BUCKET).remove([material.file_path])
  }
  const { error } = await supabase
    .from('classroom_assignment_materials')
    .delete()
    .eq('material_id', material.material_id)
  if (error) throw error
}

export async function getSubmissionFileUrl(filePath) {
  if (!filePath) return null
  const { data, error } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(filePath, 3600)
  if (error) throw error
  return data?.signedUrl || null
}

export async function removeSubmissionFile(filePath) {
  if (!filePath) return
  const { error } = await supabase.storage.from(SUBMISSION_BUCKET).remove([filePath])
  if (error) throw error
}

export async function updateClassFeatures(classId, features) {
  const { data, error } = await supabase
    .from('classroom_classes')
    .update({ features })
    .eq('class_id', classId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStudentProfile(studentId, patch) {
  const { data, error } = await supabase
    .from('classroom_students')
    .update(patch)
    .eq('student_id', studentId)
    .select()
    .single()
  if (error) throw error
  return data
}

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
    .select('*')
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

export async function upsertSubmission(row) {
  const { data, error } = await supabase
    .from('classroom_submissions')
    .upsert(row, { onConflict: 'assignment_id,student_id' })
    .select()
    .single()
  if (error) throw error
  return data
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

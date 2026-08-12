// Centralized Supabase public "object/public/<bucket>" URL bases.
// These are used for client-side <img src=...> and public download links.

export const SUPABASE_PUBLIC_OBJECT_BASE_URL =
  'https://qujzohvrbfsouakzocps.supabase.co/storage/v1/object/public'

export const MEMBERS_IMAGES_BASE_URL = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/members-images`
export const PARTNERS_IMAGES_BASE_URL = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/partners-images`
export const SCHOOLS_IMAGES_BASE_URL = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/schools-images`
export const ADVISORS_IMAGES_BASE_URL = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/advisors-images`
export const APPLICATIONS_RESUMES_BASE_URL = `${SUPABASE_PUBLIC_OBJECT_BASE_URL}/applications-resumes`


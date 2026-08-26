import { supabase } from './supabase'

/**
 * Public directory / team / blog fields (via get_public_directory_members RPC).
 * Avoids anon SELECT * on members (PII / permission flags).
 */
export async function fetchPublicDirectoryMembers({
  requireRegistration = true,
  role = null,
} = {}) {
  const { data, error } = await supabase.rpc('get_public_directory_members', {
    p_require_registration: requireRegistration,
    p_role: role,
  })
  if (error) throw error
  return data || []
}

/**
 * Public approved bills (via get_public_bills RPC).
 * Avoids anon SELECT * on bills (internal review fields).
 */
export async function fetchPublicBills() {
  const { data, error } = await supabase.rpc('get_public_bills')
  if (error) throw error
  return data || []
}

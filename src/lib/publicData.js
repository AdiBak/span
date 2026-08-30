import { supabase } from './supabase'

const DEFAULT_TTL_MS = 60_000

/** @type {Map<string, { expires: number, value: Promise<any> }>} */
const cache = new Map()

function cacheKey(name, params) {
  return `${name}:${JSON.stringify(params ?? null)}`
}

/**
 * Short-lived in-memory cache + in-flight dedupe for public RPCs.
 * Avoids React Query/SWR dependency while cutting repeat homepage/directory fetches.
 */
async function cachedRpc(name, params, ttlMs = DEFAULT_TTL_MS) {
  const key = cacheKey(name, params)
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) {
    return hit.value
  }

  const value = (async () => {
    const { data, error } = await supabase.rpc(name, params)
    if (error) throw error
    return data || []
  })()

  cache.set(key, { expires: now + ttlMs, value })
  try {
    return await value
  } catch (err) {
    cache.delete(key)
    throw err
  }
}

/** Drop cached public payloads (e.g. after an exec updates public content). */
export function invalidatePublicDataCache() {
  cache.clear()
}

/**
 * Public directory / team / blog fields (via get_public_directory_members RPC).
 * Avoids anon SELECT * on members (PII / permission flags).
 */
export async function fetchPublicDirectoryMembers({
  requireRegistration = true,
  role = null,
} = {}) {
  return cachedRpc('get_public_directory_members', {
    p_require_registration: requireRegistration,
    p_role: role,
  })
}

/**
 * Public approved bills (via get_public_bills RPC).
 * Avoids anon SELECT * on bills (internal review fields).
 */
export async function fetchPublicBills() {
  return cachedRpc('get_public_bills')
}

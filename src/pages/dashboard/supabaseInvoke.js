/** Headers for fetch() to Supabase Edge Functions (apikey is required by the gateway). */
export function supabaseInvokeHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  }
}

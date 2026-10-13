// Per-user hourly limit backed by the check_rate_limit RPC (migration 116 pins end-user
// buckets to the caller's own uid, so the bucket must end with ":<userId>"). Fails closed: if
// the check itself errors (DB slow/down), the request counts as over the limit.
export async function overHourlyLimit(supabase: any, name: string, userId: string, max: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', { p_bucket: `${name}:${userId}`, p_max: max, p_window_seconds: 3600 })
    return !!error || data !== true
  } catch { return true }
}

// A ceiling for one AI route across all users per day (bucket "<name>:global", service role), so
// many accounts together can't run up the AI bill. An RPC error counts as over the limit.
export async function overGlobalDailyLimit(name: string, max: number): Promise<boolean> {
  try {
    const { createAdminSupabaseClient } = await import('@/lib/supabase/server')
    const { data, error } = await createAdminSupabaseClient().rpc('check_rate_limit', { p_bucket: `${name}:global`, p_max: max, p_window_seconds: 86400 })
    return !!error || data === false
  } catch { return true }
}

export const RATE_LIMITED_AR = 'محاولات كثيرة، حاول بعد قليل.'

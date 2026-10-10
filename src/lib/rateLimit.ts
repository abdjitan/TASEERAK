// Per-user hourly limit backed by the check_rate_limit RPC (migration 116 pins end-user
// buckets to the caller's own uid, so the bucket must end with ":<userId>").
export async function overHourlyLimit(supabase: any, name: string, userId: string, max: number): Promise<boolean> {
  const { data } = await supabase.rpc('check_rate_limit', { p_bucket: `${name}:${userId}`, p_max: max, p_window_seconds: 3600 })
  return data === false
}

export const RATE_LIMITED_AR = 'محاولات كثيرة، حاول بعد قليل.'

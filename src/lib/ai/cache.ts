// Server cache for AI results (table ai_cache, migration 194_ai_cache.sql). A BOQ uploaded twice,
// the same spec file matched again, or a BOQ line already classified costs no second AI call.
// Best effort: if the table is missing or the DB is slow, reads miss and writes are dropped.
import { createHash } from 'crypto'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const MAX_AGE_DAYS = 30

export function hashKey(...parts: (string | Buffer)[]): string {
  const h = createHash('sha256')
  for (const p of parts) { h.update(p); h.update('\u0000') }
  return h.digest('hex').slice(0, 40)
}

export async function cacheGet<T = any>(kind: string, key: string): Promise<T | null> {
  try {
    const since = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString()
    const { data, error } = await createAdminSupabaseClient().from('ai_cache').select('result').eq('key', `${kind}:${key}`).gte('created_at', since).maybeSingle()
    if (error || !data) return null
    return (data as any).result as T
  } catch { return null }
}

export async function cacheGetMany<T = any>(kind: string, keys: string[]): Promise<Map<string, T>> {
  const out = new Map<string, T>()
  if (!keys.length) return out
  try {
    const since = new Date(Date.now() - MAX_AGE_DAYS * 86400000).toISOString()
    const full = Array.from(new Set(keys)).map(k => `${kind}:${k}`)
    for (let i = 0; i < full.length; i += 200) {
      const { data, error } = await createAdminSupabaseClient().from('ai_cache').select('key, result').in('key', full.slice(i, i + 200)).gte('created_at', since)
      if (error) break
      for (const r of (data || []) as any[]) out.set(String(r.key).slice(kind.length + 1), r.result as T)
    }
  } catch { /* miss */ }
  return out
}

export async function cacheSet(kind: string, key: string, result: any): Promise<void> {
  await cacheSetMany(kind, [{ key, result }])
}

export async function cacheSetMany(kind: string, rows: { key: string; result: any }[]): Promise<void> {
  if (!rows.length) return
  try {
    const now = new Date().toISOString()
    await createAdminSupabaseClient().from('ai_cache').upsert(rows.map(r => ({ key: `${kind}:${r.key}`, kind, result: r.result, created_at: now })), { onConflict: 'key' })
  } catch { /* dropped */ }
}

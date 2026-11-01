// cleanup: request retention (migration 192, owner 2026-11-01). Called daily by run_rfq_retention()
// via pg_net with the notify secret (deployed with verify_jwt=false; auth = the shared secret).
// For each request that ended without a deal and passed the retention period: remove its files from
// the private «licenses» bucket through the Storage API (only files no kept request still uses), then
// delete the rows (purge_rfqs re-checks that the request is still due and archives a stats line).
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return json({ error: 'method' }, 405)
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: cfg } = await supabase.from('notify_config').select('notify_secret').eq('id', true).single()
    const secret = req.headers.get('x-notify-secret') || ''
    if (!cfg?.notify_secret || secret.length !== cfg.notify_secret.length || !safeEqual(secret, cfg.notify_secret)) return json({ error: 'unauthorized' }, 401)

    const { data: due, error } = await supabase.rpc('purge_candidates', { p_limit: 200 })
    if (error) throw error
    const rows: { rfq_id: string; paths: string[] }[] = due || []
    if (!rows.length) return json({ ok: true, purged: 0, files: 0 })

    const ids = rows.map(r => r.rfq_id)
    const allPaths = [...new Set(rows.flatMap(r => r.paths || []))]
    let files = 0
    if (allPaths.length) {
      const { data: free } = await supabase.rpc('unreferenced_paths', { p_ids: ids, p_paths: allPaths })
      const toRemove: string[] = (free || []).map((p: string) => decodeURIComponent(p))
      for (let i = 0; i < toRemove.length; i += 500) {
        const { data: removed, error: rmErr } = await supabase.storage.from('licenses').remove(toRemove.slice(i, i + 500))
        if (rmErr) {
          await supabase.from('system_errors_log').insert({ context: 'cleanup:storage', message: String(rmErr.message).slice(0, 500) })
          return json({ ok: false, error: 'storage' }, 500) // keep the rows so the next run retries the files
        }
        files += removed?.length || 0
      }
    }
    const { data: purged, error: pErr } = await supabase.rpc('purge_rfqs', { p_ids: ids })
    if (pErr) throw pErr
    return json({ ok: true, purged, files })
  } catch (e: any) {
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
      await supabase.from('system_errors_log').insert({ context: 'cleanup', message: String(e?.message || e).slice(0, 500) })
    } catch (_) { /* ignore */ }
    return json({ error: 'server error' }, 500)
  }
})

function safeEqual(a: string, b: string) {
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}

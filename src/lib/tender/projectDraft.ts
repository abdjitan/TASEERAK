// The bill-of-quantities draft (/contractor/project/new), shared by the tender review that fills it.
//
// Round-5 UX-096: the browser copy is kept per account («tsk_project_draft:<uid>»), so the next person on a shared
// device never sees (or sends) the previous user's list.
// Round-5 UX-089: a server copy is kept in rfq_drafts (data.kind = 'boq', one row per account), so a long list is
// not lost when the buyer changes device. The browser copy stays as the instant, offline copy.
// the browser Supabase client (typed loosely, like the rest of the app's row access)
type SupabaseClient = any

/** The old key shared by every account on the device (read once, then removed). */
export const LEGACY_PROJECT_DRAFT_KEY = 'tsk_project_draft'
export const projectDraftKey = (uid: string) => `${LEGACY_PROJECT_DRAFT_KEY}:${uid}`
export const BOQ_DRAFT_KIND = 'boq'

/** The browser copy of this account's draft, or null. An old shared-key draft is adopted once and removed. */
export function readProjectDraft(uid: string): any | null {
  if (!uid) return null
  try {
    const own = localStorage.getItem(projectDraftKey(uid))
    if (own) {
      const d = JSON.parse(own)
      // a draft written for another account is never shown
      return d && (!d.uid || d.uid === uid) ? d : null
    }
    const legacy = localStorage.getItem(LEGACY_PROJECT_DRAFT_KEY)
    if (legacy) {
      localStorage.removeItem(LEGACY_PROJECT_DRAFT_KEY)
      const d = JSON.parse(legacy)
      if (d && Array.isArray(d.items) && d.items.length) {
        const adopted = { ...d, uid }
        localStorage.setItem(projectDraftKey(uid), JSON.stringify(adopted))
        return adopted
      }
    }
  } catch { /* storage blocked or a broken value: no draft */ }
  return null
}

/** Writes this account's browser copy (stamped with the account and the time). Returns false when storage fails. */
export function writeProjectDraft(uid: string, d: any): boolean {
  if (!uid) return false
  try { localStorage.setItem(projectDraftKey(uid), JSON.stringify({ ...d, uid, saved_at: new Date().toISOString() })); return true } catch { return false }
}

export function clearProjectDraft(uid: string) {
  if (!uid) return
  try { localStorage.removeItem(projectDraftKey(uid)) } catch {}
  try { localStorage.removeItem(LEGACY_PROJECT_DRAFT_KEY) } catch {}
}

/** The account's server copy (the newest «boq» row), or null. */
export async function fetchBoqServerDraft(sb: SupabaseClient, id?: string | null): Promise<{ id: string; updated_at: string; data: any } | null> {
  try {
    let q = sb.from('rfq_drafts').select('id, updated_at, data').eq('data->>kind', BOQ_DRAFT_KIND)
    if (id) q = q.eq('id', id)
    const { data, error } = await q.order('updated_at', { ascending: false }).limit(1)
    if (error || !data?.length) return null
    return data[0] as any
  } catch { return null }
}

/**
 * Saves the server copy: updates `id` when given, else the account's existing «boq» row, else inserts one.
 * Returns the row id, or null when it could not be saved (the browser copy still holds the list).
 */
export async function saveBoqServerDraft(sb: SupabaseClient, uid: string, id: string | null, title: string, d: any): Promise<string | null> {
  if (!uid) return null
  const data = { ...d, kind: BOQ_DRAFT_KIND }
  delete (data as any).uid
  delete (data as any).server_id
  const now = new Date().toISOString()
  try {
    let target = id
    if (!target) target = (await fetchBoqServerDraft(sb))?.id || null
    if (target) {
      const { data: rows, error } = await sb.from('rfq_drafts').update({ title, data, updated_at: now }).eq('id', target).select('id')
      if (!error && rows?.length) return target
      if (error) return null
      // the row was deleted elsewhere: insert a new one
    }
    const { data: row, error } = await sb.from('rfq_drafts').insert({ contractor_id: uid, title, data }).select('id').single()
    return error || !row ? null : String((row as any).id)
  } catch { return null }
}

export async function deleteBoqServerDraft(sb: SupabaseClient, id: string | null) {
  try {
    if (id) await sb.from('rfq_drafts').delete().eq('id', id)
    else await sb.from('rfq_drafts').delete().eq('data->>kind', BOQ_DRAFT_KIND)
  } catch {}
}

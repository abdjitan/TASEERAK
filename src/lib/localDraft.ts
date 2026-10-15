import { clearPageCache } from '@/lib/pageCache'
// Auto-saved request drafts, kept on this device so leaving the page (opening another link,
// switching to the detailed form, closing the tab) never loses what the buyer already entered.
// Text goes to localStorage; photos go to IndexedDB (too big for localStorage).
// Everything is per user and best-effort: storage can be blocked (private mode), so every call
// is wrapped and failure just means no draft.

const PREFIX = 'taseerak_draft:'
const MAX_AGE_MS = 14 * 24 * 3600 * 1000

export function loadLocalDraft<T = any>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object' || Date.now() - (v.savedAt || 0) > MAX_AGE_MS) {
      window.localStorage.removeItem(PREFIX + key)
      return null
    }
    return v.data as T
  } catch { return null }
}

export function saveLocalDraft(key: string, data: any) {
  try { window.localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data })) } catch {}
}

export function clearLocalDraft(key: string) {
  try { window.localStorage.removeItem(PREFIX + key) } catch {}
}

// On sign-out: drop every draft (text + photos) so the next person on a shared device can't
// read them from the browser storage.
export function clearAllLocalDrafts() {
  clearPageCache() // sign-out: also drop the per-tab page snapshots
  try { window.localStorage.removeItem('tsk_seller_kind') } catch {}
  try {
    const ls = window.localStorage
    for (let i = ls.length - 1; i >= 0; i--) { const k = ls.key(i); if (k && k.startsWith(PREFIX)) ls.removeItem(k) }
  } catch {}
  try { window.indexedDB.deleteDatabase(DB) } catch {}
}

// ── Photos (IndexedDB) ────────────────────────────────────────────────────────────────────
const DB = 'taseerak_drafts'
const STORE = 'blobs'

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      const req = window.indexedDB.open(DB, 1)
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const t = db.transaction(STORE, mode)
      const r = run(t.objectStore(STORE))
      t.oncomplete = () => { resolve(r ? (r.result as T) : null); db.close() }
      t.onerror = () => { resolve(null); db.close() }
    } catch { resolve(null); db.close() }
  })
}

export function putDraftBlob(id: string, blob: Blob) { return tx('readwrite', s => s.put(blob, id)) }
export function getDraftBlob(id: string): Promise<Blob | null> { return tx<Blob>('readonly', s => s.get(id)) }
export function deleteDraftBlobs(ids: string[]) {
  return tx('readwrite', s => { for (const id of ids) s.delete(id) })
}

// Per-tab snapshot of a page's last loaded data (stale-while-revalidate): a page shows what it
// had a moment ago instantly, then refreshes from the database in the background. Lives in
// sessionStorage (this tab only, gone when it closes) and is wiped on sign-out.
const PREFIX = 'tsk_pc_'
const MAX_AGE = 30 * 60 * 1000

export function readPageCache<T = any>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    return Date.now() - at < MAX_AGE ? data : null
  } catch { return null }
}

export function writePageCache(key: string, data: unknown) {
  try { sessionStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data })) } catch { /* full or blocked */ }
}

export function clearPageCache() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(PREFIX)) sessionStorage.removeItem(k)
    }
  } catch { /* blocked */ }
}

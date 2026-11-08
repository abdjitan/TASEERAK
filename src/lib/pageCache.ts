// Per-tab snapshot of a page's last loaded data (stale-while-revalidate): a page shows what it
// had last time instantly, then refreshes from the database in the background. Lives in
// localStorage (survives closing the tab, so reopening the site shows the home page at once;
// was sessionStorage until 2026-11-08), expires after 12 hours and is wiped on sign-out.
const PREFIX = 'tsk_pc_'
const MAX_AGE = 12 * 60 * 60 * 1000
const store = () => localStorage

export function readPageCache<T = any>(key: string): T | null {
  try {
    const raw = store().getItem(PREFIX + key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    return Date.now() - at < MAX_AGE ? data : null
  } catch { return null }
}

export function writePageCache(key: string, data: unknown) {
  try { store().setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data })) } catch { /* full or blocked */ }
}

export function clearPageCache() {
  for (const st of [() => localStorage, () => sessionStorage]) { // sessionStorage: copies left by the old version
    try {
      const ss = st()
      for (let i = ss.length - 1; i >= 0; i--) {
        const k = ss.key(i)
        if (k && k.startsWith(PREFIX)) ss.removeItem(k)
      }
    } catch { /* blocked */ }
  }
  try { localStorage.removeItem('tsk_role_hint') } catch { /* blocked */ } // PageLoader's menu hint
}

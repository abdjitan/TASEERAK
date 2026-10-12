import { redirect } from 'next/navigation'

// The detailed request page was merged into the one request page (/contractor/rfq/quick), which
// now has per-line specifications, attachments and the advanced options. Old links (bookmarks,
// notifications, ?from= reorder, ?draft= drafts) keep working through this redirect.
export default function OldRequestPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const q = new URLSearchParams()
  for (const k of ['from', 'draft']) {
    const v = searchParams[k]
    if (typeof v === 'string' && v) q.set(k, v)
  }
  const qs = q.toString()
  redirect('/contractor/rfq/quick' + (qs ? '?' + qs : ''))
}

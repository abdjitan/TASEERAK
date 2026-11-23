import { redirect } from 'next/navigation'

// The detailed request page was merged into the one request page (/contractor/rfq/quick), which
// now has per-line specifications, attachments and the advanced options. Old links (bookmarks,
// notifications, ?from= reorder, ?draft= drafts and any other parameter) keep working through this redirect.
export default async function OldRequestPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams
  const q = new URLSearchParams()
  // every parameter is carried over (not only ?from= and ?draft=), so no old link loses what it pointed at
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string') { if (v) q.set(k, v) }
    else if (Array.isArray(v)) for (const x of v) if (x) q.append(k, x)
  }
  const qs = q.toString()
  redirect('/contractor/rfq/quick' + (qs ? '?' + qs : ''))
}

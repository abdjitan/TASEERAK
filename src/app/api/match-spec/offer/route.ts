import { NextRequest, NextResponse } from 'next/server'
import { getRouteUser } from '@/lib/supabase/server'
import { extractAttrs, compareAttrs, issuesAr, describeAttrs } from '@/lib/ai/specCompare'

export const runtime = 'nodejs'

// Compare what a supplier OFFERED for a line (its spec / brand / notes) with what was REQUIRED (the
// buyer's line, or the requirement read from the project specification by /api/match-spec).
// Rules only (src/lib/ai/specCompare): strength, grade, diameter, thickness, size, cable section,
// fire rating, IP, standard, brand + «or approved equal». No AI call, so no cost and no limit
// beyond sign-in; the buyer sees «مطابق / يختلف / غير مذكور» per field when comparing offers.
//
// POST { lines: [{ id?, required: string, offered: string | { specification?, brand?, notes? } }] }  (≤ 200)
//   → { ok, lines: [{ id, verdict, checks, issues, required_summary, offered_summary }] }
export async function POST(req: NextRequest) {
  const { user } = await getRouteUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const lines: any[] = Array.isArray(body?.lines) ? body.lines.slice(0, 200) : (body?.required ? [body] : [])
  if (!lines.length) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  const out = lines.map((l: any, i: number) => {
    const required = String(l?.required || '').slice(0, 2000)
    const o = l?.offered
    const offered = typeof o === 'string' ? o.slice(0, 2000)
      : [o?.specification, o?.brand ? `الماركة: ${o.brand}` : '', o?.notes].map((x: any) => String(x || '')).filter(Boolean).join(' ؛ ').slice(0, 2000)
    const req_ = extractAttrs(required), off = extractAttrs(offered)
    const cmp = compareAttrs(req_, off)
    return {
      id: l?.id ?? i,
      verdict: cmp.verdict,
      checks: cmp.checks,
      issues: issuesAr(cmp.checks),
      required_summary: describeAttrs(req_),
      offered_summary: describeAttrs(off),
    }
  })
  return NextResponse.json({ ok: true, lines: out })
}

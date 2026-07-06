import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// =============================================================
// CR VERIFICATION — pulls official Commercial Registration data
// from the Saudi Ministry of Commerce "Wathq (واثق)" platform,
// using the new-legislation `fullinfo` endpoint.
//
// • If WATHQ_API_KEY is NOT set  → mode:'manual' (document upload + admin review).
// • If WATHQ_API_KEY IS set      → mode:'wathq' with official name, status,
//   city, capital, AND the partners/managers list.
//
// Anti-fraud: pass { cr, nationalId } and we report whether that national ID
// is actually an owner/partner/manager of the CR.
//
// Configure (Vercel → Settings → Environment Variables, and/or .env.local):
//   WATHQ_API_KEY  = <مفتاح الأمان from api.wathq.sa>
//   WATHQ_API_BASE = https://api.wathq.sa            (optional)
//   WATHQ_CR_PATH  = /sandbox/commercial-registration/fullinfo/   (sandbox default;
//                    switch to the production path once the commercial plan is active)
// =============================================================

const WATHQ_KEY = process.env.WATHQ_API_KEY
const WATHQ_BASE = process.env.WATHQ_API_BASE || 'https://api.wathq.sa'
const WATHQ_CR_PATH = process.env.WATHQ_CR_PATH || '/sandbox/commercial-registration/fullinfo/'

// SAFETY: Wathq's sandbox returns ONE fixed fake company (masked with x's) for
// ANY number. It must never act as real verification in production. So unless
// WATHQ_ALLOW_SANDBOX is explicitly set, a sandbox path is treated as "not
// connected" → the user gets honest manual review instead of a fake "verified".
const IS_SANDBOX = /\/sandbox\//.test(WATHQ_CR_PATH)
const ALLOW_SANDBOX = process.env.WATHQ_ALLOW_SANDBOX === '1' || process.env.WATHQ_ALLOW_SANDBOX === 'true'
const WATHQ_LIVE = !!WATHQ_KEY && (!IS_SANDBOX || ALLOW_SANDBOX)

function pick(obj: any, paths: string[]): any {
  for (const p of paths) {
    const val = p.split('.').reduce((o: any, k: string) => (o == null ? undefined : o[k]), obj)
    if (val !== undefined && val !== null && val !== '') return val
  }
  return undefined
}
function safeJson(t: string): any { try { return JSON.parse(t) } catch { return (t || '').slice(0, 300) } }

// Gather the FULL commercial-activity text (Wathq returns many activities).
// Handles the various shapes the fullinfo payload may use (array of objects,
// object with description[], or a single string) so the supplier-specialty
// auto-detection has rich text to analyse.
function allActivities(j: any): string | null {
  const acts = j?.activities
  let out: string[] = []
  if (Array.isArray(acts)) {
    out = acts.map((a: any) => (typeof a === 'string' ? a : (a?.name || a?.description || a?.activityName || a?.isicActivity?.name || ''))).filter(Boolean)
  } else if (acts && typeof acts === 'object') {
    if (Array.isArray(acts.description)) out = acts.description.map(String).filter(Boolean)
    else if (acts.description) out = [String(acts.description)]
    else if (Array.isArray(acts.name)) out = acts.name.map(String).filter(Boolean)
    else if (acts.name) out = [String(acts.name)]
  } else if (typeof acts === 'string' && acts.trim()) {
    out = [acts]
  }
  if (out.length === 0) {
    const single = pick(j, ['isicActivity.name', 'mainActivity', 'activity'])
    if (single) out = [String(single)]
  }
  // de-dupe + cap length so we never bloat the profile row
  const uniq = Array.from(new Set(out.map(s => s.trim()).filter(Boolean)))
  const joined = uniq.join(' - ')
  return joined ? joined.slice(0, 4000) : null
}

// Map the fullinfo payload to the shape our app uses.
function extract(j: any) {
  const parties = Array.isArray(j?.parties) ? j.parties.map((p: any) => ({
    name: p?.name ?? null,
    idNumber: p?.identity?.id != null ? String(p.identity.id) : null,
    idType: p?.identity?.typeName ?? null,
    role: Array.isArray(p?.partnership) ? p.partnership.map((x: any) => x?.name).filter(Boolean).join('، ') : null,
  })) : []
  const managers = Array.isArray(j?.management?.managers) ? j.management.managers.map((m: any) => ({
    name: m?.name ?? null,
    idNumber: m?.identity?.id != null ? String(m.identity.id) : null,
  })) : []
  const statusName = pick(j, ['status.name', 'status', 'crStatus.name'])
  const isActive = j?.status?.id === 1 || /نشط|active|ساري|قائم|valid/i.test(String(statusName ?? ''))
  return {
    name: j?.name ?? pick(j, ['crName', 'entityName', 'businessName']) ?? null,
    status: statusName ?? null,
    isActive: !!isActive,
    crNationalNumber: j?.crNationalNumber ?? null,
    crNumber: j?.crNumber ?? null,
    entityType: j?.entityType?.name ?? null,
    city: j?.headquarterCityName ?? pick(j, ['address.city', 'city']) ?? null,
    activity: allActivities(j),
    capital: j?.crCapital ?? null,
    issueDate: j?.issueDateGregorian ?? pick(j, ['issueDate']) ?? null,
    isEcommerce: j?.hasEcommerce ?? null,
    parties,
    managers,
  }
}

// Anti-fraud: is this national ID an owner/partner/manager of the CR?
function ownerCheck(ex: any, nationalId: string) {
  if (!nationalId) return null
  const isOwner = ex.parties.some((p: any) => p.idNumber === nationalId)
  const isManager = ex.managers.some((m: any) => m.idNumber === nationalId)
  return { checked: true, nationalId, isOwner, isManager, authorized: isOwner || isManager }
}

export async function POST(req: NextRequest) {
  try {
    // Auth required + rate-limit by USER id (not the spoofable x-forwarded-for header) — protects
    // the paid Wathq quota and blocks anonymous CR / owner-name harvesting (SEC-12).
    const rl = createServerSupabaseClient()
    const { data: { user } } = await rl.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    const { data: allowed } = await rl.rpc('check_rate_limit', { p_bucket: 'verify-cr:' + user.id, p_max: 20, p_window_seconds: 3600 })
    if (allowed === false) {
      return NextResponse.json({ ok: false, error: 'rate_limited', message: 'محاولات كثيرة — حاول بعد قليل.' }, { status: 429 })
    }

    const body = await req.json().catch(() => ({}))
    const cr = String(body?.cr || '').trim()
    const nationalId = String(body?.nationalId || '').trim()

    // 1) format check (Saudi CR = exactly 10 digits)
    if (!/^\d{10}$/.test(cr)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FORMAT', message: 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط' },
        { status: 400 },
      )
    }

    // 1.5) DEMO MODE (set WATHQ_DEMO=1) — fake data, no subscription needed
    const DEMO = process.env.WATHQ_DEMO === '1' || process.env.WATHQ_DEMO === 'true'
    if (!WATHQ_LIVE && DEMO) {
      return NextResponse.json({
        ok: true, mode: 'wathq', verified: true, cr,
        name: 'مؤسسة تجريبية للمقاولات والتوريدات (DEMO)', status: 'نشط',
        activity: 'مقاولات عامة للمباني وتجارة مواد البناء',
        issueDate: '2020-01-01', city: 'الرياض', parties: [], managers: [], ownerCheck: null,
        raw: { demo: true, cr }, message: '🧪 وضع تجريبي — بيانات وهمية للعرض فقط.',
      })
    }

    // 2) MANUAL MODE — Wathq not connected (no key, or sandbox-only/test key)
    if (!WATHQ_LIVE) {
      return NextResponse.json({
        ok: true, mode: 'manual', verified: false, cr,
        message: 'الربط الآلي مع واثق غير مُفعّل بعد — سيتم التوثيق عبر رفع صورة السجل ومراجعة الإدارة.',
      })
    }

    // 3) WATHQ MODE — pull from the Ministry of Commerce (fullinfo)
    const url = `${WATHQ_BASE}${WATHQ_CR_PATH}${cr}?language=ar`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    let res: Response
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { apiKey: WATHQ_KEY, Accept: 'application/json' },
        signal: controller.signal, cache: 'no-store',
      })
    } catch {
      clearTimeout(timeout)
      return NextResponse.json({
        ok: true, mode: 'wathq', verified: false, cr,
        error: 'NETWORK', message: 'تعذّر الاتصال بواثق حالياً، حاول لاحقاً أو ارفع صورة السجل.',
      })
    }
    clearTimeout(timeout)

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      // The new-legislation "fullinfo" endpoint expects the UNIFIED national
      // number (starts with 7). An old CR number (1010/4030…) returns 500/404 —
      // guide the user to the right number instead of a vague error.
      const looksOldCr = !/^7\d{9}$/.test(cr)
      return NextResponse.json({
        ok: true, mode: 'wathq', verified: false, cr,
        error: 'WATHQ_ERROR', httpStatus: res.status,
        message:
          res.status === 401 || res.status === 403 ? 'مفتاح واثق غير صالح أو الاشتراك منتهي'
          : looksOldCr ? 'يبدو أنك أدخلت رقم السجل القديم — الرجاء إدخال الرقم الوطني الموحّد للمنشأة (يبدأ بـ 700) الموجود في شهادة السجل التجاري.'
          : res.status === 404 ? 'لم يتم العثور على سجل تجاري بهذا الرقم في واثق'
          : 'تعذّر التحقق من واثق حالياً، حاول لاحقاً أو ارفع صورة السجل.',
        raw: safeJson(txt),
      })
    }

    const j: any = await res.json().catch(() => ({}))
    const ex = extract(j)
    const oc = ownerCheck(ex, nationalId)

    // Best-effort English name (production CRs may carry one; the sandbox returns
    // Arabic). Only used if it actually contains Latin letters.
    let nameEn: string | null = null
    try {
      const enRes = await fetch(`${WATHQ_BASE}${WATHQ_CR_PATH}${cr}?language=en`, {
        headers: { apiKey: WATHQ_KEY, Accept: 'application/json' }, cache: 'no-store',
      })
      if (enRes.ok) { const ej: any = await enRes.json(); if (ej?.name && /[A-Za-z]/.test(ej.name)) nameEn = ej.name }
    } catch {}

    // PRIVACY (PDPL): never ship national ID numbers to the browser. The
    // owner-match (ownerCheck) is computed server-side above and returns only
    // booleans; the client gets names/roles, not identities.
    return NextResponse.json({
      ok: true, mode: 'wathq', verified: ex.isActive, cr,
      ...ex, nameEn,
      parties: ex.parties.map((p: any) => ({ name: p.name, role: p.role, idType: p.idType })),
      managers: ex.managers.map((m: any) => ({ name: m.name })),
      ownerCheck: oc,
      message: ex.isActive
        ? 'تم التحقق من السجل التجاري عبر واثق ✓'
        : 'السجل التجاري غير ساري المفعول حسب واثق — يحتاج مراجعة',
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR', message: 'حدث خطأ غير متوقع أثناء التحقق' },
      { status: 500 },
    )
  }
}

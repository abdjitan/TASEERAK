import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// =============================================================
// CR VERIFICATION — pulls official Commercial Registration data
// from the Saudi Ministry of Commerce "Wathq (واثق)" platform.
//
// • If WATHQ_API_KEY is NOT set  → returns mode:'manual'
//   (the app falls back to document upload + admin review).
// • If WATHQ_API_KEY IS set      → returns mode:'wathq' with the
//   official entity name, activity, status, dates pulled live.
//
// Configure in Vercel (Project → Settings → Environment Variables)
// and/or .env.local:
//   WATHQ_API_KEY = <your apiKey from api.wathq.sa>
//   WATHQ_API_BASE = https://api.wathq.sa            (optional override)
//   WATHQ_CR_PATH  = /v5/commercialregistration/info/ (optional override)
// =============================================================

const WATHQ_KEY = process.env.WATHQ_API_KEY
const WATHQ_BASE = process.env.WATHQ_API_BASE || 'https://api.wathq.sa'
const WATHQ_CR_PATH = process.env.WATHQ_CR_PATH || '/v5/commercialregistration/info/'

// safely read nested fields with several possible names
function pick(obj: any, paths: string[]): any {
  for (const p of paths) {
    const val = p.split('.').reduce((o: any, k: string) => (o == null ? undefined : o[k]), obj)
    if (val !== undefined && val !== null && val !== '') return val
  }
  return undefined
}

function safeJson(t: string): any {
  try { return JSON.parse(t) } catch { return (t || '').slice(0, 300) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const cr = String(body?.cr || '').trim()

    // 1) format check (Saudi CR = exactly 10 digits)
    if (!/^\d{10}$/.test(cr)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FORMAT', message: 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط' },
        { status: 400 },
      )
    }

    // 2) MANUAL MODE — Wathq not connected yet
    if (!WATHQ_KEY) {
      return NextResponse.json({
        ok: true,
        mode: 'manual',
        verified: false,
        cr,
        message: 'الربط الآلي مع واثق غير مُفعّل بعد — سيتم التوثيق عبر رفع صورة السجل ومراجعة الإدارة.',
      })
    }

    // 3) WATHQ MODE — pull from the Ministry of Commerce
    const url = `${WATHQ_BASE}${WATHQ_CR_PATH}${cr}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    let res: Response
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { apiKey: WATHQ_KEY, Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })
    } catch (err: any) {
      clearTimeout(timeout)
      return NextResponse.json({
        ok: true, mode: 'wathq', verified: false, cr,
        error: 'NETWORK', message: 'تعذّر الاتصال بواثق حالياً، حاول لاحقاً أو ارفع صورة السجل.',
      })
    }
    clearTimeout(timeout)

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return NextResponse.json({
        ok: true, mode: 'wathq', verified: false, cr,
        error: 'WATHQ_ERROR', httpStatus: res.status,
        message:
          res.status === 404 ? 'لم يتم العثور على سجل تجاري بهذا الرقم في واثق'
          : res.status === 401 || res.status === 403 ? 'مفتاح واثق غير صالح أو الاشتراك منتهي'
          : 'تعذّر التحقق من واثق حالياً، حاول لاحقاً أو ارفع صورة السجل.',
        raw: safeJson(txt),
      })
    }

    const j: any = await res.json().catch(() => ({}))

    // robust field extraction (field names differ by Wathq product/version)
    const name = pick(j, ['crName', 'name', 'entityName', 'crNameAr', 'businessName'])
    const statusName = pick(j, ['status.name', 'status', 'crStatus.name', 'crStatus', 'crStatusName'])
    const activity = pick(j, ['activities.0.name', 'isicActivity.name', 'mainActivity', 'activity', 'activities.0'])
    const expiry = pick(j, ['expiryDate', 'crExpiryDate', 'expiry', 'expiryDateHijri'])
    const issue = pick(j, ['issueDate', 'crIssueDate', 'issue', 'issueDateHijri'])
    const city = pick(j, ['location.city', 'address.city', 'city', 'location.name'])

    const statusStr = String(statusName ?? '').toLowerCase()
    const isActive = /active|ساري|قائم|نشط|valid/.test(statusStr) || statusStr === '1' || statusStr === 'true'

    return NextResponse.json({
      ok: true,
      mode: 'wathq',
      verified: !!isActive,
      cr,
      name: name ?? null,
      status: statusName ?? null,
      activity: activity ?? null,
      expiryDate: expiry ?? null,
      issueDate: issue ?? null,
      city: city ?? null,
      raw: j,
      message: isActive
        ? 'تم التحقق من السجل التجاري عبر واثق ✓'
        : 'السجل التجاري غير ساري المفعول حسب واثق — يحتاج مراجعة',
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR', message: 'حدث خطأ غير متوقع أثناء التحقق' },
      { status: 500 },
    )
  }
}

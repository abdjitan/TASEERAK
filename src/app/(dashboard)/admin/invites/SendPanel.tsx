'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Sends the approved WhatsApp template `supplier_invite` (edge function whatsapp-invite-send,
// migration 200). Always a dry run first; a real send needs the owner's approval of this batch's
// cost. The DB refuses suppressed numbers, a second invitation to any number, and more than 50 a day.

type Row = { phone: string; shop_name: string; lang: string }
type Result = { phone: string; shop?: string; status: string; reason?: string }

const REASONS: Record<string, string> = {
  suppressed: 'في قائمة عدم التواصل', already_invited: 'دُعي من قبل', daily_cap: 'تجاوز حد اليوم (50)',
  bad_phone: 'رقم غير صالح', no_shop_name: 'بلا اسم محل', duplicate_in_list: 'مكرر في القائمة',
}
const STATUS: Record<string, string> = { would_send: 'سيُرسل', sent: 'أُرسل', failed: 'فشل', skipped: 'مستبعد' }

// pilot-50.csv: header phone_e164,shop_name,lang,section,shop_type; quoted cells.
function parseCsv(text: string): Row[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  const cells = (l: string) => (l.match(/("([^"]|"")*"|[^,]+|(?<=,)(?=,|$))/g) || []).map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
  const head = cells(lines[0] || '').map(h => h.toLowerCase())
  const iPhone = head.findIndex(h => h.startsWith('phone')), iShop = head.indexOf('shop_name'), iLang = head.indexOf('lang')
  if (iPhone < 0 || iShop < 0) return []
  return lines.slice(1).map(l => { const c = cells(l); return { phone: c[iPhone] || '', shop_name: c[iShop] || '', lang: (iLang >= 0 && c[iLang]) || 'ar' } }).filter(r => r.phone)
}

export default function InviteSendPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [results, setResults] = useState<Result[] | null>(null)
  const [estimate, setEstimate] = useState(0)
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [sentDone, setSentDone] = useState(false)

  async function call(dryRun: boolean, list: Row[]) {
    setBusy(true); setMsg('')
    const { data, error } = await createClient().functions.invoke('whatsapp-invite-send', {
      body: { rows: list, dry_run: dryRun, ...(dryRun ? {} : { approved_usd: estimate }) },
    })
    setBusy(false)
    if (error) { setMsg('تعذّر الطلب: ' + error.message); return null }
    if ((data as any)?.error) { setMsg('رفض الخادم الطلب: ' + (data as any).error); return null }
    return data as any
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    const list = parseCsv(await f.text())
    setRows(list); setResults(null); setApproved(false); setSentDone(false)
    setMsg(list.length ? `تمت قراءة ${list.length} محلًا. ابدأ بالتجربة بدون إرسال.` : 'لم أجد أعمدة phone و shop_name في الملف.')
  }

  async function dryRun() {
    const d = await call(true, rows)
    if (!d) return
    setResults(d.results || [])
    const n = (d.results || []).filter((r: Result) => r.status === 'would_send').length
    setEstimate(+(n * 0.06).toFixed(2))
    setApproved(false)
  }

  async function send() {
    const list = rows.filter(r => (results || []).some(x => x.status === 'would_send' && x.phone.endsWith(r.phone.replace(/\D/g, '').slice(-9))))
    if (!list.length) return
    if (!window.confirm(`سيُرسل القالب إلى ${list.length} محلًا بتكلفة تقريبية ${estimate}$. هل وافق المالك على ذلك؟`)) return
    const d = await call(false, list)
    if (!d) return
    setResults(d.results || []); setSentDone(true); setApproved(false)
    setMsg(`أُرسل ${d.count} من ${list.length}.`)
  }

  const willSend = (results || []).filter(r => r.status === 'would_send').length

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
      <h2 className="text-lg font-extrabold text-navy">إرسال دفعة دعوات</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        ارفع ملف القائمة (pilot-50.csv). يُرسل القالب المعتمد من رقم تسعيرك على واتساب، رسالة واحدة لكل محل، وبحد أقصى 50 في اليوم. المستبعدون وكل من دُعي من قبل لا يُرسل لهم أبدًا.
      </p>
      <input type="file" accept=".csv,text/csv" onChange={e => onFile(e.target.files?.[0])} className="text-sm" />
      {rows.length > 0 && !sentDone && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={dryRun} disabled={busy} className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#0B2438' }}>
            {busy ? 'جارٍ الفحص…' : `تجربة بدون إرسال (${rows.length})`}
          </button>
          {results && willSend > 0 && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} />
                وافق المالك على تكلفة هذه الدفعة: {willSend} رسالة، تقريبًا <span dir="ltr">${estimate}</span>
              </label>
              <button type="button" onClick={send} disabled={busy || !approved} className="px-4 py-2 rounded-xl text-sm font-bold text-[#071827] disabled:opacity-40" style={{ background: '#D4A543' }}>
                إرسال إلى {willSend}
              </button>
            </>
          )}
        </div>
      )}
      {msg && <p className="text-sm font-bold text-[#0F6E56]">{msg}</p>}
      {results && (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5">{r.shop || ''}</td>
                  <td className="py-1.5 text-xs text-gray-400" dir="ltr">+{r.phone}</td>
                  <td className="py-1.5 text-xs font-bold">{STATUS[r.status] || r.status}</td>
                  <td className="py-1.5 text-xs text-gray-500">{r.reason ? (REASONS[r.reason] || r.reason) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

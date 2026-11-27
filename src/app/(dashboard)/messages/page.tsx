'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslation } from '@/i18n'
import AppShell from '@/components/shared/AppShell'
import { getNav } from '@/lib/nav'
import PageLoader from '@/components/shared/PageLoader'
import LoadError from '@/components/shared/LoadError'
import { rfqDisplayName } from '@/lib/rfqName'
import Glyph from '@/components/shared/Glyph'
import { Flag, Check, CheckCheck } from 'lucide-react'
import AutoTr from '@/components/shared/AutoTr'
import { realtimeTopic } from '@/lib/realtimeTopic'
import { useEnsureVerified } from '@/components/shared/VerifyGate'
import { askConfirm } from '@/lib/askConfirm'
import { timeAgo, dateLocale, arMessages, countLabel, dayBucket, dayBucketLabel } from '@/lib/text'

// under a day: «قبل 5 دقائق»; older: the date (UX-160: no «قبل 5 د» abbreviations)
function fmtTime(d: any, locale: string = 'ar') {
  if (!d) return ''
  const dt = new Date(d)
  if (Date.now() - dt.getTime() < 86_400_000) return timeAgo(d, locale)
  return dt.toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short' })
}

// the clock time of a message (round-4 UX-104): every bubble shows it, the day is in the separators
function clockTime(d: any, locale: string) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString(dateLocale(locale), { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit' })
}
const riyadhDay = (d: any) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
function dayLabel(d: any, locale: string) {
  const b = dayBucket(d)
  if (b !== 'earlier') return dayBucketLabel(b, locale)
  return new Date(d).toLocaleDateString(dateLocale(locale), { timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long' })
}

function Messages() {
  const { locale, dir } = useTranslation()
  const ensureVerified = useEnsureVerified()
  const L = (en: string, ur: string, ar: string) => (locale === 'en' ? en : locale === 'ur' ? ur : ar)
  const sp = useSearchParams()
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [role, setRole] = useState('contractor')
  const [isMember, setIsMember] = useState(false) // a company team member: chats belong to the owner (UX-126)
  const [vatRegistered, setVatRegistered] = useState(false)
  // a pricing agent quotes from a source shop: his ready reply never claims own stock (round-5 UX-043)
  const [agent, setAgent] = useState(false)
  const [convos, setConvos] = useState<any[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({}) // unread messages from the other side, per conversation (UX-037)
  const [lastMine, setLastMine] = useState<Record<string, boolean>>({}) // the latest message is mine → «أنت: »
  const [activeId, setActiveId] = useState(sp.get('c') || '')
  const [msgs, setMsgs] = useState<any[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  // a failed read of the messages is said as such, never shown as an empty chat (round-7 UX-033)
  const [msgsFailed, setMsgsFailed] = useState(false)
  const [msgsRetry, setMsgsRetry] = useState(0)
  const [body, setBody] = useState(sp.get('msg')?.slice(0, 500) || '') // ?msg= pre-fills a question (e.g. «ask the buyer» on a request)
  const [loading, setLoading] = useState(true)
  const [convosFailed, setConvosFailed] = useState(false)
  const [sending, setSending] = useState(false)
  const [awarded, setAwarded] = useState(true) // افتراضياً نسمح؛ نتحقق عند فتح المحادثة
  const [dealId, setDealId] = useState<string | null>(null) // the accepted offer of this chat → «متابعة الصفقة» (UX-057)
  const endRef = useRef<any>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)
  // report / block (migration 201): {other_id, i_blocked, blocked_me}
  const [bstate, setBstate] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  // the award check of the open conversation is done: quick replies wait for it, so the previous
  // conversation's replies never flash under the new one (round-6 UX-101)
  const [awardChecked, setAwardChecked] = useState(false)
  // the seller's own offer on this request (VAT basis for an agent's reply, the buyer's «ask for a discount»
  // link) and, after the choice, the delivery place for the buyer's «send the delivery location» (round-8)
  const [chatOffer, setChatOffer] = useState<any>(null)
  const [deliveryPlace, setDeliveryPlace] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  // the ⋮ menu closes on a tap outside it and on Escape (round-6 UX-101)
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent | TouchEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('touchstart', onDown); window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); window.removeEventListener('keydown', onKey) }
  }, [menuOpen])
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [reportMsgId, setReportMsgId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const spC = sp.get('c') || ''
  useEffect(() => { if (spC) setActiveId(prev => (prev === spC ? prev : spC)) }, [spC])
  const openConvo = (id: string) => {
    setActiveId(id)
    router.replace(id ? `/messages?c=${encodeURIComponent(id)}` : '/messages', { scroll: false })
  }

  const PREAWARD_MAX = 20
  // الرسائل الفاشلة لا تُحتسب ضمن الحد (لم تُرسَل فعلاً)؛ الحد للطرفين معاً
  const remaining = Math.max(0, PREAWARD_MAX - msgs.filter((m: any) => m._status !== 'failed').length)
  const limitReached = !awarded && remaining <= 0
  const chatBlocked = !!(bstate?.i_blocked || bstate?.blocked_me)
  const blocked = limitReached || chatBlocked

  // a failed load keeps the list we already have and says so (it must not look like «no conversations»)
  async function loadConvos(uid: string = me) {
    try {
      const supabase = createClient()
      const [{ data, error }, { data: un }, { data: recent }] = await Promise.all([
        supabase
          .from('conversations')
          .select('*, contractor:profiles_public!contractor_id(company_name_ar), supplier:profiles_public!supplier_id(company_name_ar), rfq:rfqs(product_name, title, ref_no, items)')
          .order('last_message_at', { ascending: false }),
        uid ? supabase.from('messages').select('conversation_id').is('read_at', null).neq('sender_id', uid).limit(1000) : Promise.resolve({ data: [] as any[] }),
        uid ? supabase.from('messages').select('conversation_id, sender_id, created_at').order('created_at', { ascending: false }).limit(400) : Promise.resolve({ data: [] as any[] }),
      ])
      if (error) throw error
      setConvos(data || []); setConvosFailed(false)
      const u: Record<string, number> = {}
      for (const m of (un as any[]) || []) u[m.conversation_id] = (u[m.conversation_id] || 0) + 1
      setUnread(u)
      const lm: Record<string, boolean> = {}
      for (const m of (recent as any[]) || []) if (!(m.conversation_id in lm)) lm[m.conversation_id] = m.sender_id === uid
      setLastMine(lm)
    } catch (e) {
      console.error('[messages] conversations load failed:', e)
      setConvosFailed(true)
    }
  }
  async function retryConvos() { setLoading(true); await loadConvos(); setLoading(false) }

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMe(session.user.id)
      const { data: p } = await supabase.from('profiles').select('role, vat_number, provider_type').eq('id', session.user.id).single()
      const r = p?.role || 'contractor'
      setRole(r)
      setVatRegistered(!!p?.vat_number)
      setAgent(['individual', 'price_agent', 'broker'].includes(String(p?.provider_type || '')))
      if (r === 'supplier') {
        const { data: acting } = await supabase.rpc('acting_uid')
        if (acting && acting !== session.user.id) setIsMember(true)
      }
      await loadConvos(session.user.id)
      setLoading(false)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me) return
    const supabase = createClient()
    let t: any
    const refresh = () => { clearTimeout(t); t = setTimeout(() => loadConvos(me), 700) }
    const ch = supabase.channel(realtimeTopic(`convos-${me}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `contractor_id=eq.${me}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `supplier_id=eq.${me}` }, refresh)
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [me]) // eslint-disable-line react-hooks/exhaustive-deps

  // افتح المحادثة المختارة + علّم رسائلها مقروءة + استمع للجديد
  useEffect(() => {
    if (!activeId || !me) return
    const supabase = createClient()
    let cancelled = false
    let ch: any
    // switching: never show the previous chat's messages under the new person (UX-102)
    setMsgs([]); setMsgsLoading(true); setMsgsFailed(false); setDealId(null); setAwarded(true); setAwardChecked(false); setBstate(null); setChatOffer(null); setDeliveryPlace('')
    ;(async () => {
      // Fetch the conversation directly — do NOT read the possibly-stale `convos` closure,
      // which made an awarded chat wrongly show the "20-message limit" lock (B9).
      // conversation + its latest 200 messages together, then the award check in one round (perf audit)
      const [{ data: conv }, { data, error: msgsErr }] = await Promise.all([
        supabase.from('conversations').select('rfq_id, supplier_id, contractor_id').eq('id', activeId).single(),
        supabase.from('messages').select('*').eq('conversation_id', activeId).order('created_at', { ascending: false }).limit(200),
      ])
      if (cancelled) return // guard against out-of-order resolution → no cross-conversation bleed
      if (msgsErr) { setMsgsFailed(true); setMsgsLoading(false); return }
      setMsgs((data || []).slice().reverse())
      setMsgsLoading(false)
      let aw = false
      if (conv?.rfq_id && conv?.supplier_id) {
        const [{ data: aws }, { data: ofs }, { data: mine }] = await Promise.all([
          supabase.from('rfq_item_awards').select('id').eq('rfq_id', conv.rfq_id).eq('supplier_id', conv.supplier_id).limit(1),
          supabase.from('offers').select('id').eq('rfq_id', conv.rfq_id).eq('supplier_id', conv.supplier_id).eq('status', 'accepted').limit(1),
          supabase.from('offers').select('id, vat_status, status').eq('rfq_id', conv.rfq_id).eq('supplier_id', conv.supplier_id).order('created_at', { ascending: false }).limit(1),
        ])
        aw = !!((aws && aws.length) || (ofs && ofs.length))
        if (!cancelled) { setDealId((ofs && ofs[0]?.id) || null); setChatOffer((mine && mine[0]) || null) }
        // the buyer's own delivery place, written by the «send the delivery location» reply (UX-132)
        if (aw && conv.contractor_id === me) {
          const [{ data: rq }, { data: pv }] = await Promise.all([
            supabase.from('rfqs').select('city').eq('id', conv.rfq_id).maybeSingle(),
            supabase.from('rfq_private').select('delivery_location, delivery_geo').eq('rfq_id', conv.rfq_id).maybeSingle(),
          ])
          const geo = String((pv as any)?.delivery_geo || '').trim()
          const parts = [(rq as any)?.city, (pv as any)?.delivery_location].filter(Boolean).join(L(', ', '، ', '، '))
          const text = [parts, /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(geo) ? 'https://www.google.com/maps?q=' + encodeURIComponent(geo) : ''].filter(Boolean).join('\n')
          if (!cancelled && text) setDeliveryPlace(L('Delivery location: ', 'ڈیلیوری کی جگہ: ', 'موقع التسليم: ') + text)
        }
      }
      if (cancelled) return
      setAwarded(aw); setAwardChecked(true)
      const { data: bs } = await supabase.rpc('conversation_block_state', { p_conversation: activeId })
      if (cancelled) return
      setBstate(bs || null)
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', activeId).neq('sender_id', me).is('read_at', null)
      setUnread(prev => (prev[activeId] ? { ...prev, [activeId]: 0 } : prev))
      window.dispatchEvent(new Event('tsk:msgs-read')) // the menu badge recounts
      if (cancelled) return // don't open a channel for a conversation we already switched away from
      ch = supabase.channel(realtimeTopic(`conv-${activeId}`))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` }, (payload) => {
          setMsgs(prev => {
            // matched by id only (UX-018): the server row replaces ours, with its masked text, so the
            // sender sees what the other side sees (a phone number hidden before the award)
            if (prev.some(m => m.id === payload.new.id)) return prev.map((m: any) => m.id === payload.new.id ? { ...payload.new } : m)
            // our own message whose send_message call has not returned yet: deliver() drops the temp row
            // when it gets the id back, so the server row is added here once
            return [...prev, payload.new]
          })
          if (payload.new.sender_id !== me) supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', payload.new.id).then(() => window.dispatchEvent(new Event('tsk:msgs-read')))
        })
        // «read» ticks: the other side opening the message updates read_at (UX-142)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeId}` }, (payload) => {
          setMsgs(prev => prev.map((m: any) => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at, body: payload.new.body } : m))
        })
        .subscribe()
    })()
    return () => { cancelled = true; if (ch) supabase.removeChannel(ch) }
  }, [activeId, me, msgsRetry])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // the message box grows with its text up to about five lines (UX-057)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [body, activeId])

  async function send(e: any) {
    e?.preventDefault()
    const text = body.trim(); if (!text || !activeId) return
    if (!(await ensureVerified())) return
    setBody('')
    await deliver(text)
  }

  // إرسال متفائل: تظهر الرسالة فوراً (⏳ pending)، ثم تُثبَّت عند النجاح، أو تصير (⚠ failed)
  // مع زر إعادة إرسال — بلا فقدان للنص ولا نافذة alert.
  async function deliver(text: string, tempId?: string) {
    const id = tempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const convoId = activeId
    setMsgs(prev => tempId
      ? prev.map((m: any) => m.id === id ? { ...m, _status: 'pending' } : m)
      : [...prev, { id, conversation_id: convoId, sender_id: me, body: text, created_at: new Date().toISOString(), _status: 'pending' }])
    setSending(true)
    const supabase = createClient()
    const { data: newId, error } = await supabase.rpc('send_message', { p_conversation_id: convoId, p_body: text })
    setSending(false)
    if (error) {
      setMsgs(prev => prev.map((m: any) => m.id === id ? { ...m, _status: 'failed' } : m))
      return
    }
    // match by the id send_message returns: the server may mask phone numbers in the body, so a
    // body match would show the message twice (UX-102). If the realtime row already arrived, drop the temp.
    setMsgs(prev => {
      if (newId && prev.some((m: any) => m.id === newId)) return prev.filter((m: any) => m.id !== id)
      return prev.map((m: any) => m.id === id ? { ...m, id: (newId as any) || id, _status: 'sent' } : m)
    })
    // then show the stored row (the server may have masked a phone number), UX-018
    if (newId) {
      supabase.from('messages').select('*').eq('id', newId as any).maybeSingle().then(({ data: row }: any) => {
        if (row) setMsgs(prev => prev.map((m: any) => m.id === row.id ? { ...row } : m))
      }, () => {})
    }
    setLastMine(prev => ({ ...prev, [convoId]: true }))
    loadConvos()
  }

  function retry(m: any) { deliver(m.body, m.id) }

  useEffect(() => { setMenuOpen(false); setReportOpen(false); setNotice(''); setBstate(null) }, [activeId])

  async function toggleBlock() {
    if (!bstate?.other_id) return
    setMenuOpen(false)
    if (!bstate.i_blocked && !(await askConfirm(L('Block this user? Neither of you will be able to send messages in this conversation.', 'اس صارف کو بلاک کریں؟ اس گفتگو میں کوئی بھی پیغام نہیں بھیج سکے گا۔', 'حظر هذا المستخدم؟ لن يتمكّن أيٌّ منكما من إرسال الرسائل في هذه المحادثة.'), { danger: true, okLabel: L('Block', 'بلاک کریں', 'حظر') }))) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc(bstate.i_blocked ? 'unblock_user' : 'block_user', { p_user: bstate.other_id })
    setBusy(false)
    if (error) { setNotice(L('Could not update, try again.', 'اپ ڈیٹ نہیں ہوا، دوبارہ کوشش کریں۔', 'تعذّر التنفيذ، حاول مرة أخرى.')); return }
    const wasBlocked = bstate.i_blocked
    setBstate({ ...bstate, i_blocked: !wasBlocked })
    setNotice(wasBlocked ? L('User unblocked.', 'صارف ان بلاک ہو گیا۔', 'أُلغي الحظر.') : L('User blocked.', 'صارف بلاک ہو گیا۔', 'تم حظر المستخدم.'))
  }

  function openReport(msgId: string | null = null) {
    setMenuOpen(false); setReportMsgId(msgId); setReason('spam'); setDetails(''); setReportOpen(true)
  }

  async function submitReport(e: any) {
    e.preventDefault()
    if (!bstate?.other_id) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('report_user', { p_user: bstate.other_id, p_conversation: activeId, p_reason: reason, p_message_id: reportMsgId, p_details: details || null })
    setBusy(false)
    if (error) { setNotice(error.message?.includes('الحد اليومي') ? L('You reached the daily limit for reports. Try again tomorrow.', 'آپ رپورٹس کی روزانہ حد تک پہنچ گئے ہیں۔ کل دوبارہ کوشش کریں۔', 'بلغتَ الحد اليومي للبلاغات. حاول مرة أخرى غداً.') : L('Could not send the report, try again.', 'رپورٹ نہیں بھیجی جا سکی، دوبارہ کوشش کریں۔', 'تعذّر إرسال البلاغ، حاول مرة أخرى.')); return }
    setReportOpen(false)
    setNotice(L('Report sent. Our team will review it. You can also block this user from the menu.', 'رپورٹ بھیج دی گئی۔ ہماری ٹیم اس کا جائزہ لے گی۔ آپ مینو سے صارف کو بلاک بھی کر سکتے ہیں۔', 'أُرسل البلاغ وسيراجعه فريقنا. يمكنك أيضاً حظر هذا المستخدم من القائمة.'))
  }

  const REASONS: Array<[string, string]> = [
    ['spam', L('Spam or unwanted messages', 'اسپام یا ناپسندیدہ پیغامات', 'رسائل مزعجة أو غير مرغوبة')],
    ['abuse', L('Abuse or harassment', 'بدسلوکی یا ہراسانی', 'إساءة أو تحرش')],
    ['fraud', L('Fraud or scam', 'دھوکہ دہی', 'احتيال')],
    ['inappropriate', L('Inappropriate content', 'نامناسب مواد', 'محتوى غير لائق')],
    ['other', L('Other', 'دیگر', 'أخرى')],
  ]

  const active = convos.find((c: any) => c.id === activeId)
  const iAmBuyer = (c: any) => c?.contractor_id === me
  // The contractor's name is masked (profiles_public) for suppliers, so say "مشتري" rather than a blank.
  const counterpart = (c: any) => iAmBuyer(c) ? (c?.supplier?.company_name_ar || L('Supplier', 'سپلائر', 'مورد')) : (c?.contractor?.company_name_ar || L('Buyer', 'خریدار', 'مشتري'))
  const ctx = (c: any) => (c?.rfq ? rfqDisplayName(c.rfq, locale) : '')
  const rfqHref = (c: any) => !c?.rfq_id ? '' : iAmBuyer(c) ? `/contractor/rfq/${c.rfq_id}` : `/supplier/dashboard/rfq/${c.rfq_id}`
  // unread first, then the latest
  const sorted = convos.map((c, i) => ({ c, i })).sort((a, b) => ((unread[b.c.id] || 0) > 0 ? 1 : 0) - ((unread[a.c.id] || 0) > 0 ? 1 : 0) || a.i - b.i).map(x => x.c)

  // ready-made replies (the app's chips, UX-192): a tap writes the text into the box, the user sends it
  // after the choice they are about the delivery, before it about the offer (UX-057); a photo cannot
  // be sent in a chat, so no reply asks for one
  const quick: string[] = !active || !awardChecked ? [] : awarded && iAmBuyer(active) ? [
    L('When will the order arrive?', 'آرڈر کب پہنچے گا؟', 'متى يصل الطلب؟'),
    // the real place, not a promise to send it (round-8 UX-132)
    ...(deliveryPlace ? [deliveryPlace] : []),
    L('Please call me before you arrive.', 'پہنچنے سے پہلے مجھے کال کریں۔', 'اتصل بي قبل الوصول من فضلك.'),
    L('Please attach the invoice on the deal page.', 'براہ کرم ڈیل کے صفحے پر انوائس منسلک کریں۔', 'أرفق الفاتورة في صفحة الصفقة من فضلك.'),
  ] : awarded ? [
    L('Your order is ready.', 'آپ کا آرڈر تیار ہے۔', 'طلبك جاهز.'),
    L('When does delivery suit you?', 'ڈیلیوری آپ کے لیے کب مناسب ہے؟', 'متى يناسبك التسليم؟'),
    L('Is there anything more I should know about the delivery location?', 'کیا ڈیلیوری کی جگہ کے بارے میں کوئی مزید وضاحت ہے؟', 'هل من توضيح إضافي لموقع التسليم؟'),
    L('The order is on its way.', 'آرڈر راستے میں ہے۔', 'الطلب في الطريق إليك.'),
  ] : iAmBuyer(active) ? [
    L('Does the price include delivery?', 'کیا قیمت میں ڈیلیوری شامل ہے؟', 'هل السعر شامل التوصيل؟'),
    L('When can you deliver?', 'آپ کب ڈیلیور کر سکتے ہیں؟', 'متى يمكنك التوصيل؟'),
    L('Is the material available now?', 'کیا مال ابھی دستیاب ہے؟', 'هل المادة متوفرة الآن؟'),
    L('What is the brand, and where is it made?', 'برانڈ کیا ہے اور کہاں بنا ہے؟', 'ما الماركة وما بلد الصنع؟'),
  ] : [
    // an agent has no VAT number of his own: the answer follows the source shop on his offer (round-8 UX-024)
    (agent ? chatOffer?.vat_status === 'registered' : vatRegistered)
      ? L('Prices include 15% VAT.', 'قیمتوں میں 15% VAT شامل ہے۔', 'الأسعار تشمل ضريبة القيمة المضافة 15%.')
      : agent && !chatOffer
        ? L('I will make clear in the offer whether the price includes VAT.', 'میں آفر میں واضح کروں گا کہ قیمت میں VAT شامل ہے یا نہیں۔', 'سأوضّح في العرض هل السعر شامل ضريبة القيمة المضافة.')
        : L('The price is final; no VAT is added.', 'قیمت حتمی ہے؛ اس پر VAT شامل نہیں کیا جاتا۔', 'السعر نهائي، ولا تُضاف إليه ضريبة القيمة المضافة.'),
    L('Delivery within two days.', 'دو دن میں ڈیلیوری۔', 'التوصيل خلال يومين.'),
    agent
      ? L('The material is available at the source shop right now.', 'مال اس وقت ماخذ دکان پر دستیاب ہے۔', 'المادة متوفرة لدى المحل المصدر حالياً.')
      : L('We have the material in stock right now.', 'مال اس وقت ہمارے پاس دستیاب ہے۔', 'المادة متوفرة لدينا حالياً.'),
    L('The price is valid for 3 days.', 'قیمت 3 دن کے لیے ہے۔', 'السعر صالح لمدة 3 أيام.'),
    L('Please send the exact size or specs.', 'براہ کرم درست سائز یا تفصیل بھیجیں۔', 'أرسل المقاس أو المواصفات بدقة من فضلك.'),
  ]

  const backHref = role === 'supplier' ? '/supplier/dashboard' : role === 'admin' ? '/admin' : '/contractor'
  const BACK = dir === 'rtl' ? '→' : '←'

  if (loading) return <PageLoader variant="thread" />

  return (
    <AppShell title={L('Messages', 'پیغامات', 'الرسائل')} nav={getNav(role, locale, '/messages')} dir={dir}>
      <h1 className="sr-only">{L('Messages', 'پیغامات', 'الرسائل')}</h1>
      <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-4 min-h-0 h-[calc(100dvh-130px-4.5rem-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-130px)]">
        {/* قائمة المحادثات */}
        <aside className={`lg:col-span-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto ${activeId ? 'hidden lg:block' : ''}`}>
          <div className="px-2 py-1.5 border-b border-gray-100 font-bold text-sm flex items-center gap-1" style={{ color: '#0B2438' }}>
            <Link href={backHref} aria-label={L('Back', 'واپس', 'رجوع')} title={L('Back', 'واپس', 'رجوع')} className="min-w-[44px] min-h-[44px] grid place-items-center rounded-lg hover:bg-gray-100 text-gray-600 shrink-0">{BACK}</Link>
            <span><Glyph e="💬" /> {L('Conversations', 'گفتگو', 'المحادثات')} ({convos.length})</span>
          </div>
          {convosFailed && convos.length === 0 ? (
            <div className="p-3"><LoadError onRetry={retryConvos} className="!p-5 !shadow-none" /></div>
          ) : convos.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-3xl mb-2 text-[#0B2438]"><Glyph e="💬" /></div>
              {isMember ? (
                <p className="text-sm text-gray-600 leading-relaxed">{L('Conversations with buyers are managed by the company account owner.', 'خریداروں سے گفتگو کمپنی اکاؤنٹ کا مالک سنبھالتا ہے۔', 'المحادثات مع المشترين يديرها صاحب حساب الشركة.')}</p>
              ) : role === 'supplier' ? (<>
                <p className="text-sm text-gray-600 leading-relaxed">{L('No conversations yet. You can message a buyer from the request page with the «Message the buyer» button.', 'ابھی کوئی گفتگو نہیں۔ آپ درخواست کے صفحے سے «خریدار کو پیغام» بٹن کے ذریعے خریدار کو پیغام بھیج سکتے ہیں۔', 'لا توجد محادثات بعد. يمكنك مراسلة المشتري من صفحة الطلب بزر «راسل المشتري».')}</p>
                <Link href="/supplier/dashboard" className="inline-flex items-center justify-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>{L('New requests', 'نئی درخواستیں', 'الطلبات الجديدة')}</Link>
              </>) : role === 'admin' ? (
                <p className="text-sm text-gray-600">{L('No conversations yet', 'ابھی کوئی گفتگو نہیں', 'لا توجد محادثات بعد')}</p>
              ) : (<>
                <p className="text-sm text-gray-600 leading-relaxed">{L('No conversations yet. You can message a supplier from their offer page on one of your requests.', 'ابھی کوئی گفتگو نہیں۔ آپ اپنی کسی درخواست پر سپلائر کی آفر کے صفحے سے اسے پیغام بھیج سکتے ہیں۔', 'لا توجد محادثات بعد. يمكنك مراسلة المورد من صفحة عرضه على أحد طلباتك.')}</p>
                <Link href="/contractor/rfqs" className="inline-flex items-center justify-center mt-4 min-h-[44px] px-5 rounded-xl text-sm font-bold" style={{ background: '#D4A543', color: '#071827' }}>{L('Go to my requests', 'میری درخواستوں پر جائیں', 'اذهب إلى طلباتي')}</Link>
              </>)}
            </div>
          ) : sorted.map(c => {
            const n = unread[c.id] || 0
            const buyer = iAmBuyer(c)
            // a supplier's chats are all with «مشتري»: the request is what tells them apart (UX-103)
            const first = buyer ? counterpart(c) : (ctx(c) || counterpart(c))
            const second = buyer ? ctx(c) : (ctx(c) ? counterpart(c) : '')
            return (
              <button key={c.id} onClick={() => openConvo(c.id)} aria-current={activeId === c.id ? 'true' : undefined}
                className={`w-full text-start px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeId === c.id ? 'bg-[#D4A543]/10' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm truncate ${n ? 'font-bold' : 'font-semibold'}`} style={{ color: '#0B2438' }} dir="auto">
                    {!buyer && <span className="text-[#8F6820]"><Glyph e="📦" /> </span>}{first}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">{fmtTime(c.last_message_at, locale)}</span>
                </div>
                {second && <div className={`text-xs truncate ${buyer ? 'text-[#8F6820]' : 'text-gray-600'}`} dir="auto">{buyer && <><Glyph e="📦" /> </>}{second}</div>}
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  {c.last_message
                    ? <div className={`text-xs truncate ${n ? 'text-gray-800 font-semibold' : 'text-gray-500'}`} dir="auto">{lastMine[c.id] ? L('You: ', 'آپ: ', 'أنت: ') : ''}{c.last_message}</div>
                    : <span />}
                  {n > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[12px] leading-none font-bold grid place-items-center" style={{ background: '#D4A543', color: '#071827' }}
                      aria-label={L(`${n} unread`, `${n} نئے`, `${n} غير مقروءة`)}>{n > 99 ? '99+' : n}</span>
                  )}
                </div>
              </button>
            )
          })}
        </aside>

        {/* المحادثة */}
        <section className={`lg:col-span-2 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col ${activeId ? '' : 'hidden lg:flex'}`}>
          {!active && activeId && convosFailed ? (
            // opened from a link and the list did not load: a retry and a way back (round-7 UX-033)
            <div className="flex-1 grid place-items-center p-6 text-center">
              <div className="w-full max-w-sm">
                <LoadError onRetry={retryConvos} className="!p-5 !shadow-none" />
                <button type="button" onClick={() => openConvo('')} className="mt-3 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-bold border border-gray-200 text-[#0B2438] bg-white">
                  <span aria-hidden="true">{BACK}</span>&nbsp;{L('Back to conversations', 'گفتگو کی فہرست پر واپس', 'رجوع إلى المحادثات')}
                </button>
              </div>
            </div>
          ) : !active && activeId && !convosFailed ? (
            <div className="flex-1 grid place-items-center p-6 text-center">
              <div>
                <div className="text-3xl mb-2 text-[#0B2438]"><Glyph e="🔎" /></div>
                <p className="text-sm font-semibold text-gray-700">{L('We could not find this conversation.', 'یہ گفتگو نہیں ملی۔', 'تعذّر العثور على هذه المحادثة.')}</p>
                <button type="button" onClick={() => openConvo('')} className="mt-4 inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl text-sm font-bold text-[#071827]" style={{ background: '#D4A543' }}>
                  <span aria-hidden="true">{BACK}</span>&nbsp;{L('Back to conversations', 'گفتگو کی فہرست پر واپس', 'رجوع إلى المحادثات')}
                </button>
              </div>
            </div>
          ) : !active ? (
            <div className="flex-1 hidden lg:grid place-items-center text-sm text-gray-500">{L('Select a conversation', 'کوئی گفتگو منتخب کریں', 'اختر محادثة')}</div>
          ) : (
            <>
              <div className="px-2 py-1.5 border-b border-gray-100 flex items-center gap-1">
                <button onClick={() => openConvo('')} aria-label={L('Back to conversations', 'گفتگو کی فہرست پر واپس', 'رجوع إلى المحادثات')} className="lg:hidden min-w-[44px] min-h-[44px] grid place-items-center rounded-lg hover:bg-gray-100">{BACK}</button>
                <div className="min-w-0 ps-1">
                  <div className="font-bold text-sm truncate" style={{ color: '#0B2438' }}>{counterpart(active)}</div>
                  {ctx(active) && (rfqHref(active)
                    ? <Link href={rfqHref(active)} className="flex items-center gap-1 min-h-[44px] -my-2.5 text-xs text-[#8F6820] truncate hover:underline" dir="auto"><Glyph e="📦" /> {ctx(active)} · <span className="font-bold">{L('View request', 'درخواست دیکھیں', 'عرض الطلب')}</span></Link>
                    : <div className="text-xs text-gray-500 truncate"><Glyph e="📦" /> {ctx(active)}</div>)}
                </div>
                {dealId && (
                  <Link href={`/contractor/orders/${dealId}`} className={`${bstate?.other_id ? 'ms-auto' : 'ms-auto me-1'} shrink-0 inline-flex items-center min-h-[44px] px-3 rounded-xl text-xs font-bold`} style={{ background: '#D4A543', color: '#071827' }}>
                    {L('Follow the deal', 'ڈیل دیکھیں', 'متابعة الصفقة')}
                  </Link>
                )}
                {bstate?.other_id && (
                  <div ref={menuRef} className={`relative ${dealId ? '' : 'ms-auto'}`}>
                    <button type="button" onClick={() => setMenuOpen(o => !o)} disabled={busy} aria-label={L('More options', 'مزید اختیارات', 'خيارات أخرى')} aria-expanded={menuOpen}
                      className="min-w-[44px] min-h-[44px] grid place-items-center rounded-lg hover:bg-gray-100 text-gray-600 text-lg leading-none">⋮</button>
                    {menuOpen && (
                      <div className="absolute end-0 top-11 z-20 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 text-sm">
                        <button type="button" onClick={() => openReport(null)} className="w-full text-start px-3 min-h-[44px] hover:bg-gray-50">{L('Report user', 'صارف کی رپورٹ کریں', 'الإبلاغ عن المستخدم')}</button>
                        <button type="button" onClick={toggleBlock} className="w-full text-start px-3 min-h-[44px] hover:bg-gray-50 text-red-700">
                          {bstate.i_blocked ? L('Unblock user', 'ان بلاک کریں', 'إلغاء الحظر') : L('Block user', 'بلاک کریں', 'حظر المستخدم')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {notice && <div role="status" className="px-3 py-1 text-sm bg-warn-bg text-warn-text border-b border-warn-border flex items-center justify-between gap-2"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label={L('Close', 'بند کریں', 'إغلاق')} className="min-w-[44px] min-h-[44px] grid place-items-center text-warn-text"><Glyph e="✕" /></button></div>}
              {reportOpen && (
                <form onSubmit={submitReport} className="p-3 border-b border-gray-100 bg-gray-50 space-y-1 text-sm">
                  <div className="font-bold" style={{ color: '#0B2438' }}>{reportMsgId ? L('Report this message', 'اس پیغام کی رپورٹ کریں', 'الإبلاغ عن هذه الرسالة') : L('Report user', 'صارف کی رپورٹ کریں', 'الإبلاغ عن المستخدم')}</div>
                  {REASONS.map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer min-h-[44px]"><input type="radio" name="reason" className="w-5 h-5" checked={reason === k} onChange={() => setReason(k)} /> {label}</label>
                  ))}
                  <textarea value={details} onChange={e => setDetails(e.target.value.slice(0, 1000))} rows={2} className="input-field text-base sm:text-sm w-full" aria-label={L('Details (optional)', 'تفصیل (اختیاری)', 'تفاصيل (اختياري)')} placeholder={L('Details (optional)', 'تفصیل (اختیاری)', 'تفاصيل (اختياري)')} />
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={busy} className="min-h-[44px] px-4 rounded-xl font-bold text-white text-sm disabled:opacity-50" style={{ background: '#0B2438' }}>{L('Send report', 'رپورٹ بھیجیں', 'إرسال البلاغ')}</button>
                    <button type="button" onClick={() => setReportOpen(false)} className="min-h-[44px] px-4 rounded-xl text-sm text-gray-700 border border-gray-200">{L('Close', 'بند کریں', 'إغلاق')}</button>
                  </div>
                </form>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2" style={{ background: '#f7f8fa' }}>
                {msgsLoading ? (
                  <div className="h-full grid place-items-center text-sm text-gray-500" role="status">{L('Loading messages…', 'پیغامات لوڈ ہو رہے ہیں…', 'جارٍ تحميل الرسائل…')}</div>
                ) : msgsFailed ? (
                  <div className="h-full grid place-items-center text-center px-4" role="alert">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{L('Could not load the messages. Check the connection.', 'پیغامات لوڈ نہیں ہو سکے۔ کنکشن چیک کریں۔', 'تعذّر تحميل الرسائل. تحقّق من الاتصال.')}</p>
                      <button type="button" onClick={() => setMsgsRetry(k => k + 1)} className="btn-primary mt-3">{L('Try again', 'دوبارہ کوشش کریں', 'حاول مرة أخرى')}</button>
                    </div>
                  </div>
                ) : msgs.length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-gray-500 text-center px-4">{L('No messages yet. Write the first one below.', 'ابھی کوئی پیغام نہیں۔ نیچے پہلا پیغام لکھیں۔', 'لا توجد رسائل بعد. اكتب أول رسالة في الأسفل.')}</div>
                ) : msgs.map((m, i) => {
                  const mine = m.sender_id === me
                  const newDay = i === 0 || riyadhDay(msgs[i - 1].created_at) !== riyadhDay(m.created_at)
                  return (
                    <div key={m.id}>
                    {newDay && (
                      <div className="flex justify-center my-2" role="separator" aria-label={dayLabel(m.created_at, locale)}>
                        <span className="text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-0.5">{dayLabel(m.created_at, locale)}</span>
                      </div>
                    )}
                    {/* my messages on the right in every language (round-7 UX-199) */}
                    <div className={`flex ${mine === (dir === 'rtl') ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'text-white' : 'bg-white border border-gray-100 text-gray-800'}`} style={mine ? { background: m._status === 'failed' ? '#B42318' : '#0B2438' } : {}}>
                        <div className="whitespace-pre-wrap break-words">{mine ? m.body : <AutoTr text={m.body} locale={locale} />}</div>
                        <div className={`text-xs mt-1 ${mine ? 'text-white/80' : 'text-gray-500'}`}>
                          {m._status === 'pending' ? `${L('Sending…', 'بھیجا جا رہا ہے…', 'جارٍ الإرسال…')}`
                            : m._status === 'failed'
                              ? <button type="button" onClick={() => retry(m)} className="underline font-semibold text-white min-h-[44px] inline-flex items-center gap-1"><Glyph e="⚠" /> {L('Failed to send — retry', 'نہیں بھیجا جا سکا — دوبارہ کوشش کریں', 'تعذّر الإرسال — إعادة المحاولة')}</button>
                              : <span className="inline-flex items-center gap-1">{clockTime(m.created_at, locale)}{mine && (m.read_at
                                ? <span className="inline-flex items-center gap-0.5" title={L('Read', 'پڑھ لیا گیا', 'قُرئت')}><CheckCheck className="w-3.5 h-3.5 text-[#F5C55B]" aria-hidden /><span className="sr-only">{L('Read', 'پڑھ لیا گیا', 'قُرئت')}</span></span>
                                : <span className="inline-flex items-center" title={L('Sent', 'بھیج دیا', 'أُرسلت')}><Check className="w-3.5 h-3.5" aria-hidden /><span className="sr-only">{L('Sent', 'بھیج دیا', 'أُرسلت')}</span></span>)}{!mine && bstate?.other_id && typeof m.id === 'string' && !m.id.startsWith('temp-') && (
                                <button type="button" onClick={() => openReport(m.id)} aria-label={L('Report this message', 'اس پیغام کی رپورٹ کریں', 'الإبلاغ عن هذه الرسالة')} title={L('Report', 'رپورٹ', 'إبلاغ')}
                                  className="-my-3 -me-2 ms-1 min-w-[44px] min-h-[44px] grid place-items-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Flag aria-hidden className="w-4 h-4" /></button>
                              )}</span>}
                        </div>
                      </div>
                    </div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              {chatBlocked && (
                <div className="px-3 pt-2 text-[13px] leading-relaxed text-[#0B2438]">
                  {bstate?.i_blocked
                    ? L('You blocked this user. Unblock from the menu to message again.', 'آپ نے اس صارف کو بلاک کیا ہے۔ دوبارہ پیغام کے لیے مینو سے ان بلاک کریں۔', 'لقد حظرت هذا المستخدم. ألغِ الحظر من القائمة لمراسلته مجدداً.')
                    : <>{L('You can no longer send messages in this conversation. If you have a deal in progress with this party, contact support.', 'آپ اس گفتگو میں مزید پیغام نہیں بھیج سکتے۔ اگر اس فریق کے ساتھ آپ کا کوئی جاری سودا ہے تو سپورٹ سے رابطہ کریں۔', 'لم يعد بإمكانك إرسال رسائل في هذه المحادثة. إن كانت لديك صفقة قائمة مع هذا الطرف فتواصل مع الدعم.')}{' '}
                      <Link href="/support?topic=deal" className="inline-flex items-center min-h-[44px] font-bold underline">{L('Contact support', 'سپورٹ سے رابطہ کریں', 'تواصل مع الدعم')}</Link></>}
                </div>
              )}
              {!awarded && !chatBlocked && !msgsLoading && !msgsFailed && (
                <div className={`px-3 pt-2 text-xs leading-relaxed ${limitReached ? 'text-red-700' : 'text-gray-600'}`}>
                  {limitReached
                    ? L('This conversation reached its message limit before an offer was chosen. Full contact opens once an offer is chosen.', 'آفر منتخب ہونے سے پہلے اس گفتگو کی پیغامات کی حد پوری ہو گئی۔ آفر منتخب ہونے کے بعد مکمل رابطہ کھل جائے گا۔', 'بلغت هذه المحادثة الحد الأقصى للرسائل قبل اختيار العرض. يكتمل التواصل بعد اختيار العرض.')
                    : L(`${countLabel(remaining, 'en', arMessages, 'message', '')} left in this conversation (for both sides together).`, `اس گفتگو میں ${remaining} پیغامات باقی ہیں (دونوں فریقوں کے لیے مل کر)۔`, `يتبقّى في هذه المحادثة ${arMessages(remaining)} (للطرفين معاً).`)}
                  {' '}{L('Phone numbers in messages are hidden until an offer is chosen.', 'آفر منتخب ہونے تک پیغامات میں فون نمبر چھپائے جاتے ہیں۔', 'تُخفى أرقام الهواتف في الرسائل قبل اختيار العرض.')}
                </div>
              )}
              {!blocked && !body.trim() && !msgsLoading && !msgsFailed && quick.length > 0 && (
                <div className="px-3 pt-2 flex gap-2 overflow-x-auto" aria-label={L('Quick replies', 'فوری جوابات', 'ردود جاهزة')}>
                  {quick.map(t => (
                    <button key={t} type="button" onClick={() => setBody(t)}
                      className="shrink-0 min-h-[44px] px-3.5 rounded-full text-sm font-semibold border border-[#0B2438]/15 bg-white text-[#0B2438] hover:border-[#D4A543]">{t.length > 60 ? t.slice(0, 57) + '…' : t}</button>
                  ))}
                  {/* a discount asked in the chat does not change the offer: the official request does (round-8 UX-068) */}
                  {!awarded && iAmBuyer(active) && active?.rfq_id && chatOffer?.id && (
                    <Link href={`/contractor/rfq/${active.rfq_id}/offer/${chatOffer.id}?reduce=1`}
                      className="shrink-0 min-h-[44px] inline-flex items-center px-3.5 rounded-full text-sm font-bold border border-[#D4A543] bg-[#D4A543]/10 text-[#071827]">{L('Ask for an official discount', 'باضابطہ رعایت مانگیں', 'اطلب تخفيضاً رسمياً')}</Link>
                  )}
                </div>
              )}
              {/* a price lowered in the chat does not change the offer in the comparison (round-7 UX-137) */}
              {!awarded && iAmBuyer(active) && /(lower the price|کم ہو سکتی|تخفيض السعر)/.test(body) && (
                <p className="px-3 pt-2 text-[13px] text-gray-700">
                  {L('To change the price officially in the comparison, use «Ask for a discount» on the offer page.', 'موازنے میں قیمت باضابطہ بدلنے کے لیے آفر کے صفحے پر «رعایت مانگیں» استعمال کریں۔', 'لتعديل السعر رسمياً في المقارنة استخدم «اطلب تخفيضاً» في صفحة العرض.')}
                  {rfqHref(active) && <>{' '}<Link href={rfqHref(active)} className="inline-flex items-center min-h-[44px] font-bold text-[#8F6820] underline">{L('Open the request', 'درخواست کھولیں', 'افتح الطلب')}</Link></>}
                </p>
              )}
              <form onSubmit={send} className="p-3 border-t border-gray-100 flex items-end gap-2 mt-2">
                <textarea ref={boxRef} rows={1} value={body} onChange={e => setBody(e.target.value)} disabled={blocked} aria-label={L('Message', 'پیغام', 'نص الرسالة')}
                  onKeyDown={(e: any) => {
                    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent?.isComposing) return
                    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return // phones: Enter is a new line
                    e.preventDefault(); send(null)
                  }}
                  className="input-field flex-1 text-base sm:text-sm disabled:bg-gray-50 resize-none leading-relaxed min-h-[44px] max-h-[140px] overflow-y-auto" placeholder={chatBlocked ? L('Messaging is blocked', 'پیغام رسانی بند ہے', 'المراسلة محظورة') : blocked ? L('Limit reached before an offer is chosen', 'آفر منتخب ہونے سے پہلے کی حد پوری ہو گئی', 'انتهى الحد المسموح قبل اختيار العرض') : L('Type a message…', 'پیغام لکھیں…', 'اكتب رسالة…')} />
                <button type="submit" disabled={sending || blocked || !body.trim()} className="min-h-[44px] px-5 rounded-xl font-bold text-[#071827] text-sm disabled:opacity-50" style={{ background: '#D4A543' }}>
                  {L('Send', 'بھیجیں', 'إرسال')}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}

export default function MessagesPage() {
  return <Suspense fallback={<PageLoader variant="thread" />}><Messages /></Suspense>
}

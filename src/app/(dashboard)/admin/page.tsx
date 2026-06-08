// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/shared/Logo'

export default function AdminPanel() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, contractors: 0, suppliers: 0, pending: 0, verified: 0 })
  const [actionLoading, setActionLoading] = useState('')
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('') // '' | 'contractor' | 'supplier'
  const [rejectModal, setRejectModal] = useState(null) // { id, name }
  const [rejectReason, setRejectReason] = useState('')
  const [materialReqs, setMaterialReqs] = useState([])
  // Requests/offers overview + auth emails
  const [rfqs, setRfqs] = useState([])
  const [offers, setOffers] = useState([])
  const [projects, setProjects] = useState([])
  const [projectItems, setProjectItems] = useState([])
  const [emails, setEmails] = useState({}) // { [userId]: { email, phone, last_sign_in_at, ... } }
  const [support, setSupport] = useState([]) // all support_messages (admin reads all)
  const [objections, setObjections] = useState([]) // cr_objections (fake-account reports)
  const [expandedRfq, setExpandedRfq] = useState(null)
  const [expandedProject, setExpandedProject] = useState(null)
  // Admin password change
  const [pwModal, setPwModal] = useState(null) // { id, name, email }
  const [pwValue, setPwValue] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      // Check admin role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (profile?.role !== 'admin') { window.location.href = '/'; return }

      setUser(session.user)
      await loadData(supabase)
      setLoading(false)
    }
    init()
  }, [])

  async function loadData(supabase?: any) {
    const client = supabase || createClient()
    const { data: allUsers } = await client.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(allUsers || [])
    const { data: mreqs } = await client.from('material_requests')
      .select('*, supplier:profiles(company_name_ar)').order('created_at', { ascending: false })
    setMaterialReqs(mreqs || [])

    // Requests / offers overview (admin can read all via RLS is_admin())
    const [{ data: rfqData }, { data: offerData }, { data: projData }, { data: pItems }] = await Promise.all([
      client.from('rfqs').select('*').order('created_at', { ascending: false }),
      client.from('offers').select('*').order('created_at', { ascending: false }),
      client.from('project_rfqs').select('*').order('created_at', { ascending: false }),
      client.from('project_rfq_items').select('*'),
    ])
    setRfqs(rfqData || [])
    setOffers(offerData || [])
    setProjects(projData || [])
    setProjectItems(pItems || [])

    const { data: supp } = await client.from('support_messages').select('*').order('created_at', { ascending: false })
    setSupport(supp || [])

    const { data: objs } = await client.from('cr_objections').select('*').order('created_at', { ascending: false })
    setObjections(objs || [])

    // Auth emails via the privileged edge function (non-blocking — cards still
    // render if this fails, e.g. function not yet deployed).
    try {
      const { data: ed } = await client.functions.invoke('admin', { body: { action: 'list_emails' } })
      if (ed?.emails) setEmails(ed.emails)
    } catch {}

    const u = allUsers || []
    setStats({
      total: u.length,
      contractors: u.filter(x => x.role === 'contractor').length,
      suppliers: u.filter(x => x.role === 'supplier').length,
      pending: u.filter(x => x.verification_status === 'pending').length,
      verified: u.filter(x => x.verification_status === 'verified').length,
    })
  }

  async function updateStatus(profileId: string, status: 'verified' | 'rejected', reason?: string) {
    setActionLoading(profileId)
    const supabase = createClient()
    const updateData: any = { verification_status: status }
    if (reason) updateData.rejection_reason = reason
    await supabase.from('profiles').update(updateData).eq('id', profileId)
    setMsg(`✓ تم ${status === 'verified' ? 'الموافقة' : 'الرفض'} بنجاح`)
    setTimeout(() => setMsg(''), 3000)
    await loadData()
    setActionLoading('')
    setRejectModal(null)
    setRejectReason('')
  }

  async function reviewMaterial(reqId: string, status: 'approved' | 'rejected') {
    setActionLoading(reqId)
    const supabase = createClient()
    await supabase.from('material_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', reqId)
    setMsg(`✓ تم ${status === 'approved' ? 'قبول' : 'رفض'} المادة`)
    setTimeout(() => setMsg(''), 3000)
    await loadData()
    setActionLoading('')
  }

  // 🤖 إعادة فحص تصنيف المورد (كلمات مفتاحية + ذكاء اصطناعي إن وُجد المفتاح)
  async function reclassify(profileId: string) {
    setActionLoading(profileId)
    try {
      const res = await fetch('/api/classify-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: profileId }),
      })
      const j = await res.json()
      setMsg(j?.autoVerified ? '✓ تطابق واضح — تم التوثيق تلقائياً' : '🤖 تم تحديث نتيجة الفحص')
    } catch {
      setMsg('تعذّر الفحص، حاول لاحقاً')
    }
    setTimeout(() => setMsg(''), 3000)
    await loadData()
    setActionLoading('')
  }

  // Admin sets a new password for ANY account (via the privileged edge function)
  async function changeUserPassword() {
    if (!pwModal) return
    setPwMsg('')
    if ((pwValue || '').length < 8) { setPwMsg('كلمة المرور يجب ألا تقل عن 8 أحرف'); return }
    if (pwValue !== pwConfirm) { setPwMsg('كلمتا المرور غير متطابقتين'); return }
    setActionLoading('pw-' + pwModal.id)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('admin', {
        body: { action: 'set_password', userId: pwModal.id, newPassword: pwValue },
      })
      if (data?.ok) {
        setMsg(`✓ تم تغيير كلمة المرور لـ ${pwModal.name}`)
        setTimeout(() => setMsg(''), 3500)
        setPwModal(null); setPwValue(''); setPwConfirm('')
      } else {
        setPwMsg('تعذّر التغيير: ' + (data?.error || error?.message || 'حاول مجدداً'))
      }
    } catch (e: any) {
      setPwMsg('خطأ: ' + (e?.message || 'تعذّر الاتصال'))
    }
    setActionLoading('')
  }

  // Display helpers
  const TIER_LABEL = { manufacturer: '🏭 مصنع/رئيسي', commercial: '🏪 تجاري', local: '🏬 محلي' }
  const RFQ_STATUS = { open: '🟢 مفتوح', closed: '🔒 مغلق', awarded: '🏆 تمت الترسية', cancelled: '✕ ملغي', expired: '⏳ منتهي' }
  const OFFER_STATUS = { pending: '⏳ بانتظار', submitted: '📨 مُقدّم', accepted: '✓ مقبول', rejected: '✕ مرفوض', withdrawn: '↩ مسحوب' }
  const sar = (n: any) => (n || n === 0) ? Number(n).toLocaleString('en-US') + ' ر.س' : '—'
  const dt = (d: any) => d ? new Date(d).toLocaleDateString('ar-SA') : '—'

  // BOQ/shared files live in the public "licenses" bucket
  async function openBoq(val: string) {
    if (!val) return
    if (val.startsWith('http')) { window.open(val, '_blank'); return }
    const supabase = createClient()
    const { data } = await supabase.storage.from('licenses').createSignedUrl(val, 3600)
    window.open(data?.signedUrl || val, '_blank')
  }

  // Export the currently-filtered users to a CSV file (Excel-friendly, UTF-8 BOM)
  function exportCSV() {
    const rows = filtered.map((u: any) => ({
      الاسم: u.company_name_ar || '', 'الاسم (EN)': u.company_name_en || '',
      النوع: u.role === 'contractor' ? 'مقاول' : 'مورد',
      البريد: emails[u.id]?.email || '', الجوال: u.phone || '',
      المنطقة: u.region || '', المدينة: u.city || '',
      'السجل التجاري': u.commercial_registration || '', 'الرقم الضريبي': u.vat_number || '',
      الفئة: u.supplier_tier || u.contractor_grade || '',
      'حالة التحقق': u.verification_status || '', نشط: u.is_active === false ? 'لا' : 'نعم',
      'تاريخ التسجيل': u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : '',
    }))
    const headers = Object.keys(rows[0] || { الاسم: '' })
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [headers.map(esc).join(','), ...rows.map((r: any) => headers.map(h => esc(r[h])).join(','))].join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `taseerak-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function resolveDispute(offerId: string) {
    const resolution = prompt('ملخص حل النزاع (يظهر للطرفين):')
    if (resolution === null) return
    setActionLoading('disp-' + offerId)
    const supabase = createClient()
    await supabase.from('offers').update({
      dispute_status: 'resolved',
      dispute_resolution: resolution || 'تم الحل بالتوافق',
      dispute_resolved_at: new Date().toISOString(),
    }).eq('id', offerId)
    setMsg('✓ تم حل النزاع')
    setTimeout(() => setMsg(''), 3000)
    await loadData()
    setActionLoading('')
  }

  async function resolveObjection(id: string, status: 'reviewed' | 'dismissed') {
    setActionLoading('obj-' + id)
    const supabase = createClient()
    await supabase.from('cr_objections').update({ status }).eq('id', id)
    setMsg(status === 'reviewed' ? '✓ تم وسم البلاغ كمراجَع' : '✕ تم رفض البلاغ')
    setTimeout(() => setMsg(''), 3000)
    await loadData()
    setActionLoading('')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // open a private verification doc via a short-lived signed URL (admin reads all).
  // legacy values stored as full public URLs still open directly.
  async function openDoc(val: string) {
    if (!val) return
    if (val.startsWith('http')) { window.open(val, '_blank'); return }
    const supabase = createClient()
    const { data } = await supabase.storage.from('verification').createSignedUrl(val, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>جارٍ التحميل...</div>
      </div>
    </div>
  )

  // Lookup maps for the requests/offers overview
  const profileById = Object.fromEntries(users.map((u: any) => [u.id, u]))
  const offersByRfq: any = {}
  offers.forEach((o: any) => { (offersByRfq[o.rfq_id] = offersByRfq[o.rfq_id] || []).push(o) })
  const itemsByProject: any = {}
  projectItems.forEach((i: any) => { (itemsByProject[i.project_rfq_id] = itemsByProject[i.project_rfq_id] || []).push(i) })
  const rfqCountBy: any = {}
  rfqs.forEach((r: any) => { rfqCountBy[r.contractor_id] = (rfqCountBy[r.contractor_id] || 0) + 1 })
  const offerCountBy: any = {}
  offers.forEach((o: any) => { offerCountBy[o.supplier_id] = (offerCountBy[o.supplier_id] || 0) + 1 })
  const nameOf = (id: string) => profileById[id]?.company_name_ar || '—'

  // Support conversations grouped by user (latest message + unread-from-user count)
  const convByUser: any = {}
  support.forEach((m: any) => {
    const g = convByUser[m.user_id] = convByUser[m.user_id] || { userId: m.user_id, last: '', lastAt: null, lastSender: '', unread: 0 }
    if (!g.lastAt || new Date(m.created_at) > new Date(g.lastAt)) { g.last = m.content; g.lastAt = m.created_at; g.lastSender = m.sender }
    if (m.sender === 'user' && !m.read_by_admin) g.unread++
  })
  const conversations: any[] = Object.values(convByUser).sort((a: any, b: any) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
  const totalUnread = conversations.reduce((s: number, c: any) => s + c.unread, 0)

  // Open deal disputes (for admin mediation)
  const rfqById: any = Object.fromEntries(rfqs.map((r: any) => [r.id, r]))
  const disputes = offers.filter((o: any) => o.dispute_status === 'open')
  const openObjections = objections.filter((o: any) => o.status === 'open')

  // ── Analytics (computed from already-loaded data) ──
  const dayKey = (d: any) => new Date(d).toISOString().slice(0, 10)
  const _today = new Date()
  const last30days = [...Array(30)].map((_, i) => { const d = new Date(_today); d.setDate(d.getDate() - (29 - i)); return dayKey(d) })
  const signupsByDay: any = {}
  users.forEach((u: any) => { if (u.created_at) { const k = dayKey(u.created_at); signupsByDay[k] = (signupsByDay[k] || 0) + 1 } })
  const signupSeries = last30days.map(k => ({ day: k, n: signupsByDay[k] || 0 }))
  const maxSignup = Math.max(1, ...signupSeries.map(s => s.n))
  const newLast7 = signupSeries.slice(-7).reduce((s, x) => s + x.n, 0)
  const newLast30 = signupSeries.reduce((s, x) => s + x.n, 0)
  const countBy = (arr: any[], key: string) => { const m: any = {}; arr.forEach((x: any) => { const v = x[key]; if (v) m[v] = (m[v] || 0) + 1 }); return Object.entries(m).sort((a: any, b: any) => b[1] - a[1]) }
  const topRegions = countBy(users, 'region').slice(0, 6)
  const topSectors = countBy(rfqs, 'sector').slice(0, 6)
  const tierBreakdown = countBy(users.filter((u: any) => u.role === 'supplier'), 'supplier_tier')
  const offersPerRfq = rfqs.length ? (offers.length / rfqs.length).toFixed(1) : '0'
  const acceptedOffers = offers.filter((o: any) => o.status === 'accepted').length
  const TIERLBL: any = { manufacturer: '🏭 مصنع/رئيسي', commercial: '🏪 تجاري', local: '🏬 محلي' }

  const rfqSearch = (r: any) => !search
    || r.product_name?.includes(search) || r.sector?.includes(search)
    || nameOf(r.contractor_id)?.includes(search)
  const filteredRfqs = rfqs.filter(rfqSearch)
  const filteredProjects = projects.filter((p: any) => !search || p.title?.includes(search) || nameOf(p.contractor_id)?.includes(search))

  const filtered = users.filter(u => {
    const matchSearch = !search || u.company_name_ar?.includes(search) || u.phone?.includes(search) || emails[u.id]?.email?.includes(search)
    const matchRole = !roleFilter || u.role === roleFilter
    if (!matchSearch || !matchRole) return false
    if (tab === 'pending') return u.verification_status === 'pending'
    if (tab === 'verified') return u.verification_status === 'verified'
    if (tab === 'rejected') return u.verification_status === 'rejected'
    return true
  })

  return (
    <div className="min-h-screen bg-[#f4f6f9]" dir="rtl">
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(27,45,91,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(245,131,31,0.04) 0%, transparent 50%)',
      }} />

      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo theme="light" size="sm" />
            <span className="text-xs px-2 py-0.5 rounded-full text-white font-bold" style={{ background: '#F5831F' }}>Admin</span>
          </div>
          <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-red-500 transition-all">خروج</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>لوحة الإدارة</h1>
          <p className="text-gray-500 mt-1 text-sm">إدارة المستخدمين والتحقق من الرخص</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8 stagger">
          {[
            { label: 'إجمالي المستخدمين', value: stats.total, icon: '👥', bg: '#1B2D5B', go: () => { setTab('all'); setRoleFilter('') } },
            { label: 'مقاولون', value: stats.contractors, icon: '👷', bg: '#2a4a8a', go: () => { setTab('all'); setRoleFilter('contractor') } },
            { label: 'موردون', value: stats.suppliers, icon: '🏪', bg: '#7c3aed', go: () => { setTab('all'); setRoleFilter('supplier') } },
            { label: 'قيد المراجعة', value: stats.pending, icon: '⏳', bg: '#F5831F', go: () => { setTab('pending'); setRoleFilter('') } },
            { label: 'موثقون', value: stats.verified, icon: '✅', bg: '#0F6E56', go: () => { setTab('verified'); setRoleFilter('') } },
          ].map(({ label, value, icon, bg, go }) => (
            <button key={label} type="button" onClick={go}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-right cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F5831F]/40">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base text-white" style={{ background: bg }}>{icon}</div>
                <div className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2 font-medium flex items-center justify-between">
                <span>{label}</span>
                <span className="text-gray-300">↗</span>
              </div>
            </button>
          ))}
        </div>

        {msg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 animate-fade-in">{msg}</div>
        )}

        {/* Search + Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-5">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'analytics', label: '📊 الإحصائيات' },
              { key: 'pending', label: `قيد المراجعة (${stats.pending})` },
              { key: 'verified', label: `موثقون (${stats.verified})` },
              { key: 'rejected', label: 'مرفوضون' },
              { key: 'all', label: `الكل (${stats.total})` },
              { key: 'rfqs', label: `📋 طلبات التسعير (${rfqs.length + projects.length})` },
              { key: 'messages', label: `💬 الرسائل${totalUnread ? ' (' + totalUnread + ')' : ''}` },
              { key: 'disputes', label: `⚠ النزاعات${disputes.length ? ' (' + disputes.length + ')' : ''}` },
              { key: 'objections', label: `🚩 بلاغات حسابات وهمية${openObjections.length ? ' (' + openObjections.length + ')' : ''}` },
              { key: 'materials', label: `📦 طلبات المواد (${materialReqs.filter(r => r.status === 'pending').length})` },
            ].map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setRoleFilter('') }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                style={tab === t.key ? { background: '#1B2D5B' } : {}}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {['pending', 'verified', 'rejected', 'all'].includes(tab) && filtered.length > 0 && (
              <button onClick={exportCSV} className="text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap transition-all">⬇ تصدير CSV</button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-field max-w-xs text-sm" placeholder="🔍 بحث بالاسم أو الجوال" />
          </div>
        </div>

        {/* Active role filter chip (set by clicking the stat cards) */}
        {roleFilter && tab !== 'rfqs' && tab !== 'materials' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-gray-500">عرض:</span>
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1B2D5B] text-white">
              {roleFilter === 'contractor' ? '👷 المقاولون فقط' : '🏪 الموردون فقط'} ({filtered.length})
              <button onClick={() => setRoleFilter('')} className="hover:text-orange-300">✕</button>
            </span>
          </div>
        )}

        {/* Disputes */}
        {tab === 'disputes' ? (
          disputes.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
              <div className="text-5xl mb-4">🕊️</div>
              <h3 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>لا توجد نزاعات مفتوحة</h3>
              <p className="text-sm text-gray-400 mt-1">تظهر هنا النزاعات بين المقاولين والموردين للوساطة</p>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {disputes.map((o: any) => {
                const r = rfqById[o.rfq_id]
                return (
                  <div key={o.id} className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge text-[10px] bg-red-100 text-red-700">⚠ نزاع مفتوح</span>
                          <span className="font-bold" style={{ color: '#1B2D5B' }}>{r?.product_name || 'طلب'}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                          <span>🏢 المقاول: <b>{nameOf(r?.contractor_id)}</b></span>
                          <span>🏪 المورد: <b>{nameOf(o.supplier_id)}</b></span>
                          <span>💰 القيمة: {sar(o.total_price)}</span>
                          <span>📅 فُتح: {dt(o.dispute_opened_at)}</span>
                        </div>
                        <div className="mt-2 bg-red-50 rounded-lg p-2.5 text-sm text-red-700">📝 {o.dispute_reason}</div>
                        <div className="text-[11px] text-gray-400 mt-1.5">
                          التسليم: {o.supplier_delivered_at ? '✓' : '—'} · الاستلام: {o.received_at ? '✓' : '—'} · الدفع: {o.payment_status === 'paid' ? '✓' : '—'}
                        </div>
                      </div>
                      <button onClick={() => resolveDispute(o.id)} disabled={actionLoading === 'disp-' + o.id}
                        className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50 flex-shrink-0" style={{ background: '#0F6E56' }}>
                        {actionLoading === 'disp-' + o.id ? '...' : '✓ حل النزاع'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : tab === 'objections' ? (
          objections.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
              <div className="text-5xl mb-4">🚩</div>
              <h3 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>لا توجد بلاغات</h3>
              <p className="text-sm text-gray-400 mt-1">تظهر هنا بلاغات «هذا الحساب وهمي» المرسلة من صفحة التسجيل</p>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {objections.map((o: any) => (
                <div key={o.id} className={`bg-white rounded-2xl p-5 border shadow-sm ${o.status === 'open' ? 'border-red-200' : 'border-gray-100 opacity-70'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-[10px] ${o.status === 'open' ? 'bg-red-100 text-red-700' : o.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {o.status === 'open' ? '🚩 بلاغ جديد' : o.status === 'reviewed' ? '✓ تمت المراجعة' : '✕ مرفوض'}
                        </span>
                        <span className="font-bold" style={{ color: '#1B2D5B' }} dir="ltr">سجل تجاري: {o.commercial_registration}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                        <span>🏢 الحساب المُبلَّغ عنه: <b>{o.existing_company || '—'}</b></span>
                        <span>🙍 المُبلِّغ: <b>{o.reporter_name || '—'}</b></span>
                        {o.reporter_phone && <span dir="ltr">📞 {o.reporter_phone}</span>}
                        {o.reporter_email && <span dir="ltr">✉ {o.reporter_email}</span>}
                        <span>📅 {dt(o.created_at)}</span>
                      </div>
                      {o.reason && <div className="mt-2 bg-amber-50 rounded-lg p-2.5 text-sm text-amber-800">📝 {o.reason}</div>}
                    </div>
                    {o.status === 'open' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => resolveObjection(o.id, 'reviewed')} disabled={actionLoading === 'obj-' + o.id}
                          className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>
                          {actionLoading === 'obj-' + o.id ? '...' : '✓ تمت المراجعة'}
                        </button>
                        <button onClick={() => resolveObjection(o.id, 'dismissed')} disabled={actionLoading === 'obj-' + o.id}
                          className="text-xs px-4 py-2 rounded-xl font-semibold border border-gray-200 text-gray-600 disabled:opacity-50">
                          ✕ رفض البلاغ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'analytics' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'تسجيلات آخر 7 أيام', value: newLast7, icon: '🆕', bg: '#0F6E56' },
                { label: 'تسجيلات آخر 30 يوم', value: newLast30, icon: '📈', bg: '#1B2D5B' },
                { label: 'طلبات التسعير', value: rfqs.length, icon: '📋', bg: '#F5831F' },
                { label: 'المشاريع (BOQ)', value: projects.length, icon: '🏗', bg: '#2a4a8a' },
                { label: 'إجمالي العروض', value: offers.length, icon: '📨', bg: '#7c3aed' },
                { label: 'عروض مقبولة', value: acceptedOffers, icon: '✅', bg: '#0F6E56' },
                { label: 'متوسط العروض/طلب', value: offersPerRfq, icon: '⚖️', bg: '#1B2D5B' },
                { label: 'رسائل الدعم', value: support.length, icon: '💬', bg: '#F5831F' },
              ].map((k: any) => (
                <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: k.bg }}>{k.icon}</div>
                    <div className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{k.value}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{k.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold mb-4" style={{ color: '#1B2D5B' }}>📈 التسجيلات خلال آخر 30 يوماً</h3>
              <div className="flex items-end gap-1 h-40">
                {signupSeries.map((s: any) => (
                  <div key={s.day} className="flex-1 flex flex-col items-center justify-end" title={`${s.day}: ${s.n}`}>
                    <div className="w-full rounded-t transition-all" style={{ height: `${(s.n / maxSignup) * 100}%`, minHeight: s.n ? '4px' : '0', background: s.n ? '#F5831F' : 'transparent' }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>{signupSeries[0]?.day}</span><span>اليوم →</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold mb-3" style={{ color: '#1B2D5B' }}>📍 أعلى المناطق</h3>
                {topRegions.length === 0 ? <div className="text-xs text-gray-400">—</div> : topRegions.map(([k, v]: any) => (
                  <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0"><span className="text-gray-600">{k}</span><span className="font-bold" style={{ color: '#1B2D5B' }}>{v}</span></div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold mb-3" style={{ color: '#1B2D5B' }}>🏷 أكثر القطاعات طلباً</h3>
                {topSectors.length === 0 ? <div className="text-xs text-gray-400">—</div> : topSectors.map(([k, v]: any) => (
                  <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0"><span className="text-gray-600">{k}</span><span className="font-bold" style={{ color: '#1B2D5B' }}>{v}</span></div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold mb-3" style={{ color: '#1B2D5B' }}>🏭 فئات الموردين</h3>
                {tierBreakdown.length === 0 ? <div className="text-xs text-gray-400">—</div> : tierBreakdown.map(([k, v]: any) => (
                  <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0"><span className="text-gray-600">{TIERLBL[k] || k}</span><span className="font-bold" style={{ color: '#1B2D5B' }}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        ) : tab === 'messages' ? (
          conversations.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>لا توجد رسائل</h3>
              <p className="text-sm text-gray-400 mt-1">تظهر هنا رسائل المقاولين والموردين</p>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {conversations.map((cv: any) => (
                <a key={cv.userId} href={`/admin/users/${cv.userId}`}
                  className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: profileById[cv.userId]?.role === 'supplier' ? '#7c3aed' : '#1B2D5B' }}>
                        {nameOf(cv.userId)?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm" style={{ color: '#1B2D5B' }}>{nameOf(cv.userId)}</div>
                        <div className="text-xs text-gray-500 truncate max-w-md">{cv.lastSender === 'admin' ? 'أنت: ' : ''}{cv.last}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {cv.unread > 0 && <span className="text-[10px] font-bold text-white rounded-full px-2 py-0.5" style={{ background: '#F5831F' }}>{cv.unread} جديد</span>}
                      <span className="text-[10px] text-gray-400">{dt(cv.lastAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )
        ) : tab === 'rfqs' ? (
          <div className="space-y-8">
            {/* Single RFQs */}
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-3">📋 طلبات مفردة ({filteredRfqs.length})</h3>
              {filteredRfqs.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 border border-gray-100 text-center text-gray-400 text-sm">لا توجد طلبات تسعير مفردة</div>
              ) : (
                <div className="space-y-3 stagger">
                  {filteredRfqs.map((r: any) => {
                    const rOffers = offersByRfq[r.id] || []
                    const open = expandedRfq === r.id
                    return (
                      <div key={r.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold" style={{ color: '#1B2D5B' }}>{r.product_name}</span>
                              {r.sector && <span className="badge text-[10px] badge-gray">{r.sector}</span>}
                              {r.sub_category && <span className="badge text-[10px] badge-gray">{r.sub_category}</span>}
                              <span className="badge text-[10px] badge-navy">{RFQ_STATUS[r.status] || r.status}</span>
                              <span className="badge text-[10px] bg-orange-100 text-orange-700">{rOffers.length} عرض</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1.5 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                              <span>🏢 المقاول: <b>{nameOf(r.contractor_id)}</b>{r.hide_identity ? ' (هوية مخفية)' : ''}</span>
                              <span>📦 الكمية: {r.quantity} {r.unit}</span>
                              <span>💰 تقديري: {sar(r.estimated_value)}</span>
                              <span>📍 {r.region || '—'}{r.city ? ' / ' + r.city : ''}</span>
                              <span>🚚 {r.delivery_required ? ('توصيل: ' + (r.delivery_location || '—')) : 'استلام ذاتي'}</span>
                              <span>🧾 {r.vat_invoice_required ? 'فاتورة ضريبية' : 'بدون ضريبة'}</span>
                            </div>
                            {(r.target_tiers?.length || r.verified_only || r.nearby_only) && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                {(r.target_tiers || []).map((t: string) => <span key={t} className="badge text-[10px] bg-purple-100 text-purple-700">{TIER_LABEL[t] || t}</span>)}
                                {r.verified_only && <span className="badge text-[10px] bg-emerald-100 text-emerald-700">موثقون فقط</span>}
                                {r.nearby_only && <span className="badge text-[10px] bg-blue-100 text-blue-700">القريبون فقط</span>}
                              </div>
                            )}
                            {r.specification && <p className="text-xs text-gray-500 mt-1.5">📋 {r.specification}</p>}
                            {r.notes && <p className="text-xs text-gray-400 mt-1">📝 {r.notes}</p>}
                            <div className="text-[10px] text-gray-400 mt-1.5">أُنشئ: {dt(r.created_at)} · ينتهي: {dt(r.expires_at)}</div>
                          </div>
                          {rOffers.length > 0 && (
                            <button onClick={() => setExpandedRfq(open ? null : r.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex-shrink-0">
                              {open ? '▲ إخفاء' : `▼ العروض (${rOffers.length})`}
                            </button>
                          )}
                        </div>
                        {open && rOffers.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                            {rOffers.map((o: any) => (
                              <div key={o.id} className="bg-[#f4f6f9] rounded-xl p-3 text-xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold" style={{ color: '#1B2D5B' }}>🏪 {nameOf(o.supplier_id)}</span>
                                  <span className="badge text-[10px] badge-gray">{OFFER_STATUS[o.status] || o.status}</span>
                                  <span className="text-emerald-700 font-bold">{sar(o.total_price)}</span>
                                  {o.delivery_days != null && <span className="text-gray-500">⏱ {o.delivery_days} يوم</span>}
                                  {o.po_number && <span className="text-gray-400">PO: {o.po_number}</span>}
                                </div>
                                {Array.isArray(o.extra_charges) && o.extra_charges.length > 0 && (
                                  <div className="text-gray-500 mt-1">رسوم إضافية: {o.extra_charges.map((e: any) => `${e.label || e.name || 'بند'}: ${sar(e.amount ?? e.value)}`).join(' · ')}</div>
                                )}
                                {o.notes && <div className="text-gray-400 mt-1">📝 {o.notes}</div>}
                                {o.attachment_url && <button onClick={() => openBoq(o.attachment_url)} className="text-blue-600 hover:underline mt-1">📎 {o.attachment_name || 'مرفق'}</button>}
                                <div className="text-[10px] text-gray-400 mt-1">{dt(o.created_at)}{o.accepted_at ? ` · قُبل: ${dt(o.accepted_at)}` : ''}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Project (BOQ) RFQs */}
            {filteredProjects.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 mb-3">🏗 مشاريع — جداول كميات BOQ ({filteredProjects.length})</h3>
                <div className="space-y-3 stagger">
                  {filteredProjects.map((p: any) => {
                    const items = itemsByProject[p.id] || []
                    const open = expandedProject === p.id
                    return (
                      <div key={p.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold" style={{ color: '#1B2D5B' }}>🏗 {p.title}</span>
                              <span className="badge text-[10px] badge-navy">{RFQ_STATUS[p.status] || p.status}</span>
                              <span className="badge text-[10px] bg-orange-100 text-orange-700">{items.length} بند</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1.5">🏢 {nameOf(p.contractor_id)} · 📍 {p.region || '—'}{p.city ? ' / ' + p.city : ''}</div>
                            {p.notes && <p className="text-xs text-gray-400 mt-1">📝 {p.notes}</p>}
                            <div className="text-[10px] text-gray-400 mt-1.5">أُنشئ: {dt(p.created_at)}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {p.boq_url && <button onClick={() => openBoq(p.boq_url)} className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">📄 BOQ</button>}
                            {items.length > 0 && <button onClick={() => setExpandedProject(open ? null : p.id)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">{open ? '▲ إخفاء' : '▼ البنود'}</button>}
                          </div>
                        </div>
                        {open && items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 overflow-x-auto">
                            <table className="w-full text-xs text-right">
                              <thead><tr className="text-gray-400"><th className="py-1 font-medium">البند</th><th className="font-medium">القطاع</th><th className="font-medium">الكمية</th><th className="font-medium">المواصفة</th></tr></thead>
                              <tbody>
                                {items.map((it: any) => (
                                  <tr key={it.id} className="border-t border-gray-50">
                                    <td className="py-1.5 text-gray-700">{it.product_name}</td>
                                    <td className="text-gray-500">{it.sector || '—'}</td>
                                    <td className="text-gray-500">{it.quantity} {it.unit}</td>
                                    <td className="text-gray-400">{it.specification || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : tab === 'materials' ? (
          materialReqs.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-bold" style={{ color: '#1B2D5B' }}>لا توجد طلبات مواد</h3>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {materialReqs.map(r => (
                <div key={r.id} className={`bg-white rounded-2xl p-5 border shadow-sm ${
                  r.status === 'pending' ? 'border-amber-200' : r.status === 'approved' ? 'border-emerald-200' : 'border-red-200'
                }`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold" style={{ color: '#1B2D5B' }}>{r.name}</span>
                        {r.sector && <span className="badge text-[10px] badge-gray">{r.sector}</span>}
                        <span className={`badge text-[10px] ${
                          r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>
                          {r.status === 'approved' ? '✓ مقبولة' : r.status === 'rejected' ? '✕ مرفوضة' : '⏳ قيد المراجعة'}
                        </span>
                      </div>
                      {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                      <div className="text-[11px] text-gray-400 mt-1">
                        من: {r.supplier?.company_name_ar || '—'} · {new Date(r.created_at).toLocaleDateString('ar-SA')}
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => reviewMaterial(r.id, 'approved')} disabled={actionLoading === r.id}
                          className="text-xs px-4 py-2 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: '#0F6E56' }}>
                          {actionLoading === r.id ? '...' : '✓ قبول'}
                        </button>
                        <button onClick={() => reviewMaterial(r.id, 'rejected')} disabled={actionLoading === r.id}
                          className="text-xs px-4 py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">
                          ✕ رفض
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center">
            <div className="text-5xl mb-4 animate-float">📭</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#1B2D5B' }}>لا يوجد مستخدمين</h3>
          </div>
        ) : (
          <div className="space-y-3 stagger">
            {filtered.map(u => (
              <div key={u.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                u.verification_status === 'pending' ? 'border-amber-200' :
                u.verification_status === 'verified' ? 'border-emerald-200' : 'border-red-200'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                      style={{ background: u.role === 'contractor' ? '#1B2D5B' : '#7c3aed' }}>
                      {u.company_name_ar?.[0] || '?'}
                    </div>
                    <div>
                      <a href={`/admin/users/${u.id}`} className="font-bold hover:underline decoration-dotted" style={{ color: '#1B2D5B' }}>{u.company_name_ar}</a>
                      {u.company_name_en && <div className="text-xs text-gray-400">{u.company_name_en}</div>}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`badge text-[10px] ${u.role === 'contractor' ? 'badge-navy' : 'badge-gray'}`}>
                          {u.role === 'contractor' ? '👷 مقاول' : '🏪 مورد'}
                        </span>
                        {u.role === 'contractor' && u.contractor_grade && (
                          <span className="badge text-[10px] bg-indigo-100 text-indigo-700">درجة {u.contractor_grade}</span>
                        )}
                        {u.role === 'supplier' && u.supplier_tier && (
                          <span className="badge text-[10px] bg-purple-100 text-purple-700">
                            {u.supplier_tier === 'manufacturer' ? '🏭 مصنع' : u.supplier_tier === 'commercial' ? '🏪 تجاري' : '🏬 محلي'}
                          </span>
                        )}
                        {u.role === 'supplier' && u.auto_classification && (
                          <span className={`badge text-[10px] ${
                            u.auto_classification === 'match' ? 'bg-emerald-100 text-emerald-700' :
                            u.auto_classification === 'mismatch' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`} title={u.auto_classification_note || ''}>
                            {u.auto_classification === 'match' ? '🤖 تصنيف مطابق' :
                             u.auto_classification === 'mismatch' ? '🤖 تصنيف مشكوك ⚠' : '🤖 يحتاج مراجعة'}
                            {u.auto_classification_source === 'ai' ? ' (ذكاء)' : ''}
                          </span>
                        )}
                        {u.role === 'supplier' && u.min_order_value > 0 && (
                          <span className="badge text-[10px] badge-gray">حد أدنى: {Number(u.min_order_value).toLocaleString()} ر.س</span>
                        )}
                        <span className={`badge text-[10px] ${
                          u.verification_status === 'verified' ? 'badge-green' :
                          u.verification_status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>
                          {u.verification_status === 'verified' ? '✓ موثق' : u.verification_status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}
                        </span>
                        {u.cr_verification_source === 'wathq' && (
                          <span className="badge text-[10px] inline-flex items-center gap-0.5" style={{ background: '#0F6E56', color: '#fff' }}>🛡 واثق</span>
                        )}
                        {u.commercial_registration && (
                          <span className="text-[10px] text-gray-400">سجل: {u.commercial_registration}</span>
                        )}
                        {u.cr_official_name && (
                          <span className="text-[10px] text-emerald-600">🏛 {u.cr_official_name}</span>
                        )}
                        {u.phone && <span className="text-[10px] text-gray-400">📞 {u.phone}</span>}
                        {u.region && <span className="text-[10px] text-gray-400">📍 {u.region}</span>}
                        {u.national_short_address && <span className="text-[10px] text-gray-400 font-mono" dir="ltr">🏛 {u.national_short_address}</span>}
                      </div>
                      {u.role === 'supplier' && u.auto_classification_note && u.auto_classification !== 'match' && (
                        <div className={`text-[11px] mt-1.5 rounded-lg px-2 py-1 inline-block ${u.auto_classification === 'mismatch' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                          🤖 {u.auto_classification_note}
                        </div>
                      )}
                      {/* Extra details */}
                      <div className="text-[11px] text-gray-500 mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
                        {emails[u.id]?.email && <span>✉️ <span dir="ltr">{emails[u.id].email}</span>{emails[u.id]?.email_confirmed ? ' ✓' : ' (غير مؤكد)'}</span>}
                        {emails[u.id]?.last_sign_in_at && <span>🕐 آخر دخول: {dt(emails[u.id].last_sign_in_at)}</span>}
                        {u.role === 'contractor' && <span>📋 طلبات التسعير: {rfqCountBy[u.id] || 0}</span>}
                        {u.role === 'supplier' && <span>📨 العروض المقدّمة: {offerCountBy[u.id] || 0}</span>}
                        {u.vat_number && <span>🧾 الرقم الضريبي: {u.vat_number}</span>}
                        {u.subscription_plan && <span>💳 {u.subscription_plan}{u.subscription_expires_at ? ' · حتى ' + dt(u.subscription_expires_at) : ''}</span>}
                        {u.rating_count > 0 && <span>⭐ {Number(u.rating_avg).toFixed(1)} ({u.rating_count} تقييم)</span>}
                        {u.cr_expiry_date && <span>📅 انتهاء السجل: {dt(u.cr_expiry_date)}</span>}
                        {u.is_active === false && <span className="text-red-500 font-semibold">⛔ حساب غير نشط</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    {/* Full detail page */}
                    <a href={`/admin/users/${u.id}`} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:shadow" style={{ background: '#1B2D5B' }}>
                      👁 التفاصيل
                    </a>
                    {/* License Links */}
                    {u.license_url && (
                      <button type="button" onClick={() => openDoc(u.license_url)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        📄 الرخصة
                      </button>
                    )}
                    {u.cr_url && (
                      <button type="button" onClick={() => openDoc(u.cr_url)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        📋 السجل
                      </button>
                    )}
                    {u.latitude && u.longitude && (
                      <a href={`https://www.google.com/maps?q=${u.latitude},${u.longitude}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all">
                        🗺 الموقع
                      </a>
                    )}

                    {/* 🤖 Re-run auto-classification */}
                    {u.role === 'supplier' && (
                      <button type="button" disabled={actionLoading === u.id} onClick={() => reclassify(u.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50">
                        🤖 إعادة فحص
                      </button>
                    )}

                    {/* Supplier Tier Selector */}
                    {u.role === 'supplier' && u.verification_status === 'verified' && (
                      <select
                        value={u.supplier_tier || 'local'}
                        onChange={async (e) => {
                          const supabase = createClient()
                          await supabase.from('profiles').update({ supplier_tier: e.target.value }).eq('id', u.id)
                          await loadData()
                        }}
                        className="text-xs border border-purple-200 text-purple-700 bg-purple-50 rounded-lg px-2 py-1.5 cursor-pointer">
                        <option value="manufacturer">🏭 مصنع / مورد رئيسي</option>
                        <option value="commercial">🏪 مورد تجاري</option>
                        <option value="local">🏬 مورد محلي</option>
                      </select>
                    )}

                    {/* Contractor Grade Selector */}
                    {u.role === 'contractor' && u.verification_status === 'verified' && (
                      <select
                        value={u.contractor_grade || ''}
                        onChange={async (e) => {
                          const supabase = createClient()
                          await supabase.from('profiles').update({ contractor_grade: e.target.value || null }).eq('id', u.id)
                          await loadData()
                        }}
                        className="text-xs border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg px-2 py-1.5 cursor-pointer">
                        <option value="">-- الدرجة --</option>
                        <option value="A">أ — فوق 100M</option>
                        <option value="B">ب — 30–100M</option>
                        <option value="C">ج — 5–30M</option>
                        <option value="D">د — أقل من 5M</option>
                      </select>
                    )}

                    {/* Approve/Reject */}
                    {u.verification_status !== 'verified' && (
                      <button onClick={() => updateStatus(u.id, 'verified')}
                        disabled={actionLoading === u.id}
                        className="text-xs px-4 py-2 rounded-xl font-semibold text-white transition-all hover:shadow disabled:opacity-50"
                        style={{ background: '#0F6E56' }}>
                        {actionLoading === u.id ? '...' : '✓ موافقة'}
                      </button>
                    )}
                    {u.verification_status !== 'rejected' && (
                      <button onClick={() => { setRejectModal({ id: u.id, name: u.company_name_ar }); setRejectReason('') }}
                        disabled={actionLoading === u.id}
                        className="text-xs px-4 py-2 rounded-xl font-semibold text-white transition-all hover:shadow disabled:opacity-50 bg-red-500 hover:bg-red-600">
                        ✕ رفض
                      </button>
                    )}
                    {/* Admin: change this account's password */}
                    <button type="button"
                      onClick={() => { setPwModal({ id: u.id, name: u.company_name_ar, email: emails[u.id]?.email }); setPwValue(''); setPwConfirm(''); setPwMsg('') }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
                      🔑 كلمة المرور
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-gray-300 mt-2">
                  ID: {u.id} | تاريخ التسجيل: {new Date(u.created_at).toLocaleDateString('ar-SA')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl animate-slide-up" dir="rtl">
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>سبب الرفض</h3>
            <p className="text-sm text-gray-500 mb-4">
              رفض حساب <strong>{rejectModal.name}</strong> — سيتم إرسال السبب للمستخدم
            </p>

            <div className="space-y-3 mb-4">
              {[
                'مستندات غير واضحة أو ناقصة',
                'رخصة العمل منتهية الصلاحية',
                'بيانات السجل التجاري غير مطابقة',
                'السجل التجاري لا يشمل النشاط المطلوب',
                'صور المستندات غير مقروءة',
              ].map(reason => (
                <button key={reason} type="button"
                  onClick={() => setRejectReason(reason)}
                  className={`w-full text-right px-4 py-3 rounded-xl border text-sm transition-all ${
                    rejectReason === reason
                      ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {reason}
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-500 mb-1.5">أو اكتب سبب مخصص</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                className="input-field" rows={3}
                placeholder="أدخل سبب الرفض..." />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(rejectModal.id, 'rejected', rejectReason)}
                disabled={!rejectReason || actionLoading === rejectModal.id}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all bg-red-500 hover:bg-red-600">
                {actionLoading === rejectModal.id ? '...' : '✕ تأكيد الرفض'}
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal (admin sets a new password for any account) */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl animate-slide-up" dir="rtl">
            <h3 className="text-lg font-bold mb-1" style={{ color: '#1B2D5B' }}>🔑 تغيير كلمة المرور</h3>
            <p className="text-sm text-gray-500">الحساب: <strong>{pwModal.name}</strong></p>
            {pwModal.email && <p className="text-xs text-gray-400 mb-3" dir="ltr">{pwModal.email}</p>}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 my-4">
              ⚠️ سيتم تعيين كلمة مرور جديدة لهذا الحساب فوراً — أبلغ صاحب الحساب بها بعد الحفظ.
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">كلمة المرور الجديدة</label>
                <input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)}
                  className="input-field font-mono" placeholder="8 أحرف على الأقل" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">تأكيد كلمة المرور</label>
                <input type="text" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)}
                  className="input-field font-mono" placeholder="أعد كتابتها" dir="ltr" />
              </div>
            </div>

            {pwMsg && (
              <div className={`text-sm rounded-xl p-3 mb-4 ${pwMsg.includes('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>{pwMsg}</div>
            )}

            <div className="flex gap-3">
              <button onClick={changeUserPassword} disabled={actionLoading === 'pw-' + pwModal.id}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all" style={{ background: '#1B2D5B' }}>
                {actionLoading === 'pw-' + pwModal.id ? '...' : 'تعيين كلمة المرور'}
              </button>
              <button onClick={() => { setPwModal(null); setPwValue(''); setPwConfirm(''); setPwMsg('') }}
                className="flex-1 py-3 rounded-xl font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

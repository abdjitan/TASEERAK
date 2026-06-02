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
    const u = allUsers || []
    setStats({
      total: u.length,
      contractors: u.filter(x => x.role === 'contractor').length,
      suppliers: u.filter(x => x.role === 'supplier').length,
      pending: u.filter(x => x.verification_status === 'pending').length,
      verified: u.filter(x => x.verification_status === 'verified').length,
    })
  }

  async function updateStatus(profileId: string, status: 'verified' | 'rejected') {
    setActionLoading(profileId)
    const supabase = createClient()
    await supabase.from('profiles').update({ verification_status: status }).eq('id', profileId)
    setMsg(`✓ تم ${status === 'verified' ? 'الموافقة' : 'الرفض'} بنجاح`)
    setTimeout(() => setMsg(''), 3000)
    await loadData()
    setActionLoading('')
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
      <div className="text-center animate-pulse">
        <img src="/logo.png" alt="" className="w-14 h-14 mx-auto mb-3" />
        <div className="text-sm font-semibold" style={{ color: '#1B2D5B' }}>جارٍ التحميل...</div>
      </div>
    </div>
  )

  const filtered = users.filter(u => {
    const matchSearch = !search || u.company_name_ar?.includes(search) || u.phone?.includes(search)
    if (tab === 'pending') return u.verification_status === 'pending' && matchSearch
    if (tab === 'verified') return u.verification_status === 'verified' && matchSearch
    if (tab === 'rejected') return u.verification_status === 'rejected' && matchSearch
    return matchSearch
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
            { label: 'إجمالي المستخدمين', value: stats.total, icon: '👥', bg: '#1B2D5B' },
            { label: 'مقاولون', value: stats.contractors, icon: '👷', bg: '#2a4a8a' },
            { label: 'موردون', value: stats.suppliers, icon: '🏪', bg: '#7c3aed' },
            { label: 'قيد المراجعة', value: stats.pending, icon: '⏳', bg: '#F5831F' },
            { label: 'موثقون', value: stats.verified, icon: '✅', bg: '#0F6E56' },
          ].map(({ label, value, icon, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base text-white" style={{ background: bg }}>{icon}</div>
                <div className="text-2xl font-bold" style={{ color: '#1B2D5B' }}>{value}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2 font-medium">{label}</div>
            </div>
          ))}
        </div>

        {msg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-3 animate-fade-in">{msg}</div>
        )}

        {/* Search + Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-5">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending', label: `قيد المراجعة (${stats.pending})` },
              { key: 'verified', label: `موثقون (${stats.verified})` },
              { key: 'rejected', label: 'مرفوضون' },
              { key: 'all', label: `الكل (${stats.total})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                style={tab === t.key ? { background: '#1B2D5B' } : {}}>
                {t.label}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input-field max-w-xs text-sm" placeholder="🔍 بحث بالاسم أو الجوال" />
        </div>

        {/* Users List */}
        {filtered.length === 0 ? (
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
                      <div className="font-bold" style={{ color: '#1B2D5B' }}>{u.company_name_ar}</div>
                      {u.company_name_en && <div className="text-xs text-gray-400">{u.company_name_en}</div>}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`badge text-[10px] ${u.role === 'contractor' ? 'badge-navy' : 'badge-gray'}`}>
                          {u.role === 'contractor' ? '👷 مقاول' : '🏪 مورد'}
                        </span>
                        <span className={`badge text-[10px] ${
                          u.verification_status === 'verified' ? 'badge-green' :
                          u.verification_status === 'rejected' ? 'badge-red' : 'badge-amber'
                        }`}>
                          {u.verification_status === 'verified' ? '✓ موثق' : u.verification_status === 'rejected' ? '✕ مرفوض' : '⏳ قيد المراجعة'}
                        </span>
                        {u.commercial_registration && (
                          <span className="text-[10px] text-gray-400">سجل: {u.commercial_registration}</span>
                        )}
                        {u.phone && <span className="text-[10px] text-gray-400">📞 {u.phone}</span>}
                        {u.region && <span className="text-[10px] text-gray-400">📍 {u.region}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* License Links */}
                    {u.license_url && (
                      <a href={u.license_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        📄 الرخصة
                      </a>
                    )}
                    {u.cr_url && (
                      <a href={u.cr_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all">
                        📋 السجل
                      </a>
                    )}

                    {/* Actions */}
                    {u.verification_status !== 'verified' && (
                      <button onClick={() => updateStatus(u.id, 'verified')}
                        disabled={actionLoading === u.id}
                        className="text-xs px-4 py-2 rounded-xl font-semibold text-white transition-all hover:shadow disabled:opacity-50"
                        style={{ background: '#0F6E56' }}>
                        {actionLoading === u.id ? '...' : '✓ موافقة'}
                      </button>
                    )}
                    {u.verification_status !== 'rejected' && (
                      <button onClick={() => updateStatus(u.id, 'rejected')}
                        disabled={actionLoading === u.id}
                        className="text-xs px-4 py-2 rounded-xl font-semibold text-white transition-all hover:shadow disabled:opacity-50 bg-red-500 hover:bg-red-600">
                        {actionLoading === u.id ? '...' : '✕ رفض'}
                      </button>
                    )}
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
    </div>
  )
}

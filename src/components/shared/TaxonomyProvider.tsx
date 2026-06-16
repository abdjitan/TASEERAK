'use client'

// Stage 3: يُرطّب شجرة التخصصات في الذاكرة من قاعدة البيانات على المتصفح.
//  • فوراً من الكاش المحلي (للزوار العائدين) — لا وميض ولا إعادة تركيب.
//  • ثم يحدّثها من الـDB في الخلفية ويخزّنها للكاش — فتظهر تعديلات الأدمن في
//    قوائم الواجهة عند أول تنقّل/تحديث بعدها (بدون نشر).
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hydrateTaxonomy } from '@/types'

const CACHE_KEY = 'taxonomy_cache_v1'

// ترطيب متزامن من الكاش وقت تحميل الموديول في المتصفح (قبل أول رسم للصفحات).
if (typeof window !== 'undefined') {
  try {
    const c = window.localStorage.getItem(CACHE_KEY)
    if (c) hydrateTaxonomy(JSON.parse(c))
  } catch {}
}

export default function TaxonomyProvider({ children }: { children: React.ReactNode }) {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.rpc('get_taxonomy')
        if (Array.isArray(data) && data.length) {
          hydrateTaxonomy(data)
          try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
        }
      } catch {}
    })()
  }, [])
  return <>{children}</>
}

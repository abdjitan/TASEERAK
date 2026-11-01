'use client'

// Stage 3: يُرطّب شجرة التخصصات في الذاكرة من قاعدة البيانات على المتصفح.
//  • فوراً من الكاش المحلي (للزوار العائدين) — لا وميض ولا إعادة تركيب.
//  • ثم يحدّثها من الـDB في الخلفية ويخزّنها للكاش — فتظهر تعديلات الأدمن في
//    قوائم الواجهة عند أول تنقّل/تحديث بعدها (بدون نشر).
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { hydrateTaxonomy, hydrateApprovedMaterials } from '@/types'
import { setLearnedSynonyms, resetProductSearchIndex } from '@/lib/productSearch'

const CACHE_KEY = 'taxonomy_cache_v1'
const LEARNED_KEY = 'learned_words_v1' // words the search learned from people (migration 142)
const MATERIALS_KEY = 'approved_materials_v1' // materials the admin approved (table materials)

// ترطيب متزامن من الكاش وقت تحميل الموديول في المتصفح (قبل أول رسم للصفحات).
if (typeof window !== 'undefined') {
  try {
    const c = window.localStorage.getItem(CACHE_KEY)
    if (c) hydrateTaxonomy(JSON.parse(c))
    const l = window.localStorage.getItem(LEARNED_KEY)
    if (l) setLearnedSynonyms(JSON.parse(l))
    const m = window.localStorage.getItem(MATERIALS_KEY)
    if (m) hydrateApprovedMaterials(JSON.parse(m))
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
        const [{ data }, { data: learned }, { data: mats }] = await Promise.all([
          supabase.rpc('get_taxonomy'), supabase.rpc('get_learned_synonyms'),
          supabase.from('materials').select('name, sector, sub_category').eq('is_active', true).limit(2000),
        ])
        if (Array.isArray(mats)) {
          if (hydrateApprovedMaterials(mats) > 0) resetProductSearchIndex()
          try { window.localStorage.setItem(MATERIALS_KEY, JSON.stringify(mats)) } catch {}
        }
        if (Array.isArray(data) && data.length) {
          hydrateTaxonomy(data)
          try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch {}
        }
        if (Array.isArray(learned)) {
          setLearnedSynonyms(learned)
          try { window.localStorage.setItem(LEARNED_KEY, JSON.stringify(learned)) } catch {}
        }
      } catch {}
    })()
  }, [])
  return <>{children}</>
}

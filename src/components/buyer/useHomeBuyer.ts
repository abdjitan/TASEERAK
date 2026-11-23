'use client'

// Home-buyer mode on any buyer page (round-3 UX-068). The device copy (storedBuyerType) answers at once;
// when it is missing (a deal link opened on a new device) the profile's buyer_type is read once and
// remembered, so rfqName/rfqRef and every page re-render in plain words instead of «RFQ-1045».
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { rememberBuyerType, storedBuyerType } from '@/lib/buyerType'

let fetching: Promise<void> | null = null

export function useHomeBuyer(): boolean {
  const [home, setHome] = useState(false)
  useEffect(() => {
    const sync = () => setHome(storedBuyerType() === 'individual')
    sync()
    window.addEventListener('tsk:buyer-type', sync)
    if (storedBuyerType() == null && !fetching) {
      fetching = (async () => {
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return
          const { data } = await supabase.from('profiles').select('buyer_type').eq('id', session.user.id).maybeSingle()
          if (data?.buyer_type) rememberBuyerType(data.buyer_type)
        } catch { /* stays business wording */ }
        finally { fetching = null }
      })()
    }
    return () => window.removeEventListener('tsk:buyer-type', sync)
  }, [])
  return home
}

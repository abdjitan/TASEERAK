// Server side of the learned search words (migration 142): the browser gets them through
// TaxonomyProvider; API routes that map text to the catalog (quick-request parse / identify) load
// them here so "ثيل" or "دينمو ماء" reach the same product on the server. Cached for 10 minutes.
import { setLearnedSynonyms } from '@/lib/productSearch'

let loadedAt = 0
let loading: Promise<void> | null = null

export async function ensureLearnedSynonyms(supabase: any): Promise<void> {
  if (Date.now() - loadedAt < 10 * 60 * 1000) return
  if (!loading) {
    loading = (async () => {
      try {
        const { data, error } = await supabase.rpc('get_learned_synonyms')
        if (!error && Array.isArray(data)) { setLearnedSynonyms(data); loadedAt = Date.now() }
      } catch { /* keep the previous words; matching still works without them */ }
      finally { loading = null }
    })()
  }
  await loading
}

'use client'
// The product spec fields load on demand (src/types/specGroups.ts, ~250 KB). A page that shows spec
// fields or order units calls this hook; it loads them once and re-renders the page when ready.
import { useEffect, useState } from 'react'
import { loadCatalogSpecs, catalogSpecsLoaded } from '@/types'

export function useCatalogSpecs(): boolean {
  const [ready, setReady] = useState(catalogSpecsLoaded())
  useEffect(() => {
    if (ready) return
    let alive = true
    loadCatalogSpecs().then(() => { if (alive) setReady(true) }, () => {})
    return () => { alive = false }
  }, [ready])
  return ready
}

'use client'
// The supplier page could not be loaded (network or server): a retry, never a «not found» (round-6 UX-138).
import { useRouter } from 'next/navigation'
import LoadError from '@/components/shared/LoadError'

export default function SupplierLoadFailed() {
  const router = useRouter()
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <LoadError onRetry={() => router.refresh()} />
    </main>
  )
}

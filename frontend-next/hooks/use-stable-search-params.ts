'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

import { useMounted } from '@/hooks/use-mounted'

export type StableSearchParams = {
  get: (key: string) => string | null
}

/**
 * Returns null during SSR and the first client paint so server HTML matches hydration.
 * After mount, mirrors the current URL search params.
 */
export function useStableSearchParams(): StableSearchParams | null {
  const mounted = useMounted()
  const searchParams = useSearchParams()
  return useMemo(() => {
    if (!mounted) return null
    return { get: (key: string) => searchParams.get(key) }
  }, [mounted, searchParams])
}

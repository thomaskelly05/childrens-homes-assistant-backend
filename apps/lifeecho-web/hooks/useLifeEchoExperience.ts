'use client'

import { useEffect, useState } from 'react'

import { fetchUnifiedExperience } from '@/lib/api'

export function useLifeEchoExperience(childId: string) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        const response = await fetchUnifiedExperience(childId)

        if (!mounted) {
          return
        }

        setData(response)
      } catch (err) {
        if (!mounted) {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load LifeEcho experience.',
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [childId])

  return {
    data,
    loading,
    error,
  }
}

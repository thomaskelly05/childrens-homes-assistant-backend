'use client'

import { ReactNode, useEffect, useState } from 'react'

type ClientOnlyProps = {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Renders fallback on server and first client paint, then children after mount.
 * Use for volatile browser-only UI (dates, counts) — not for whole-page shells.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted ? <>{children}</> : <>{fallback}</>
}

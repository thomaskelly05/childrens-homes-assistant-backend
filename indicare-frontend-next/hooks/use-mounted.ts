'use client'

import { useEffect, useState } from 'react'

/** True only after the component has mounted on the client (safe for hydration-stable guards). */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}

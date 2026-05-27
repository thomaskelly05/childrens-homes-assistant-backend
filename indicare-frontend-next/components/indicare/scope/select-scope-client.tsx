'use client'

import { useEffect, useState } from 'react'

import { HomeChildSelector } from '@/components/indicare/scope/home-child-selector'

export function SelectScopeClient() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        data-testid="select-scope-loading"
        className="mx-auto flex min-h-[40vh] w-full max-w-3xl flex-col items-center justify-center text-center"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Scope-first workspace</p>
        <p className="mt-4 text-sm font-bold text-slate-600">Loading home and child options…</p>
      </div>
    )
  }

  return <HomeChildSelector />
}

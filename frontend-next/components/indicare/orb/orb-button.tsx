'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { OrbModal } from './orb-modal'
import { OrbVisual } from './orb-visual'
import type { OrbContext } from '@/lib/orb/types'

export function OrbButton({
  context,
  role,
  placement = 'floating'
}: {
  context: OrbContext
  role?: string | null
  placement?: 'floating' | 'inline'
}) {
  const [open, setOpen] = useState(false)
  const button = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`group inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/95 px-4 py-3 text-sm font-black text-slate-800 shadow-xl shadow-blue-950/15 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        placement === 'floating' ? 'fixed bottom-24 right-5 z-50 md:bottom-7 md:right-7' : ''
      }`}
      aria-label="Open Orb voice assistant"
    >
      <OrbVisual state="idle" size="small" />
      <span className={placement === 'floating' ? 'hidden sm:inline' : ''}>
        <Sparkles className="mr-1 inline h-4 w-4 text-blue-600" aria-hidden />
        Orb
      </span>
    </button>
  )

  return (
    <>
      {button}
      <OrbModal open={open} onClose={() => setOpen(false)} context={context} role={role} />
    </>
  )
}


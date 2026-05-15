'use client'

import { X } from 'lucide-react'

import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import { EmbeddedOrbContextStrip } from './embedded-orb-context-strip'
import { EmbeddedOrbImmersiveToggle } from './embedded-orb-immersive-toggle'

export function EmbeddedOrbPanel({
  childName,
  onClose,
  onImmersive
}: {
  childName?: string
  onClose?: () => void
  onImmersive?: () => void
}) {
  const state = childName ? 'idle' : 'permission_denied'

  return (
    <section className="orb-embedded-panel fixed inset-x-3 bottom-24 z-[75] p-4 text-white md:left-auto md:right-7 md:w-[440px]" data-orb-state={state}>
      <div className="orb-screen-edge-pulse" data-orb-state={state} aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <EmbeddedOrbContextStrip childName={childName} />
        <div className="flex gap-2">
          <EmbeddedOrbImmersiveToggle onClick={onImmersive} />
          <button type="button" onClick={onClose} className="orb-quiet-action rounded-full p-3" aria-label="Close ORB">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-4">
        <OrbRenderer state={state} compact captionsEnabled caption={childName ? "I'm here if you need a hand." : 'Select a child before asking for records.'} />
      </div>
      <p className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-slate-300">
        Ask from the active child workspace using the docked ORB. Drafts and suggestions only; nothing is written without explicit confirmation.
      </p>
    </section>
  )
}


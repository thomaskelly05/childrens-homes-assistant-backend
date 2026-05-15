'use client'

import { X } from 'lucide-react'

import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import { EmbeddedOrbContextStrip } from './embedded-orb-context-strip'
import { EmbeddedOrbImmersiveToggle } from './embedded-orb-immersive-toggle'
import { embeddedOrbPrompts } from '@/lib/orb/content/prompts'

export function EmbeddedOrbPanel({
  childName,
  onClose,
  onImmersive
}: {
  childName?: string
  onClose?: () => void
  onImmersive?: () => void
}) {
  return (
    <section className="fixed inset-x-3 bottom-24 z-[75] rounded-[34px] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl shadow-slate-950/40 md:left-auto md:right-7 md:w-[440px]">
      <div className="flex items-center justify-between gap-3">
        <EmbeddedOrbContextStrip childName={childName} />
        <div className="flex gap-2">
          <EmbeddedOrbImmersiveToggle onClick={onImmersive} />
          <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-3" aria-label="Close ORB">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mt-4">
        <OrbRenderer state={childName ? 'idle' : 'permission_denied'} compact captionsEnabled caption={childName ? "I'm here if you need a hand." : 'Select a child before asking for records.'} />
      </div>
      <div className="mt-4 grid gap-2">
        {embeddedOrbPrompts.slice(0, 5).map((prompt) => (
          <button key={prompt} type="button" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-bold text-slate-100">
            {prompt}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">Drafts and suggestions only. Nothing is written without explicit confirmation.</p>
    </section>
  )
}


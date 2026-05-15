'use client'

import { useState } from 'react'

import { OrbSphere } from '@/components/orb-core/orb-sphere'
import { EmbeddedOrbPanel } from './embedded-orb-panel'

export function EmbeddedOrbDock({ childName }: { childName?: string }) {
  const [open, setOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-7 right-7 z-50 rounded-full border border-white/50 bg-slate-950/90 p-2 shadow-[0_0_54px_rgba(34,211,238,0.38)] backdrop-blur"
        aria-label="Open ORB operational companion"
      >
        <OrbSphere state={childName ? 'idle' : 'private_mode'} size="small" />
      </button>
      {open ? <EmbeddedOrbPanel childName={childName} onClose={() => setOpen(false)} onImmersive={() => setImmersive(true)} /> : null}
      {immersive ? (
        <div className="fixed inset-0 z-[90] bg-slate-950 p-4 text-white">
          <button type="button" onClick={() => setImmersive(false)} className="absolute right-6 top-6 rounded-full bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
          <div className="flex min-h-full items-center justify-center">
            <EmbeddedOrbPanel childName={childName} onClose={() => setImmersive(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}


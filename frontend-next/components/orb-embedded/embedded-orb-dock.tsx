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
        className="orb-embedded-dock fixed bottom-7 right-7 z-50 rounded-full p-2"
        data-orb-state={childName ? 'idle' : 'private_mode'}
        aria-label="Open ORB operational companion"
      >
        <OrbSphere state={childName ? 'idle' : 'private_mode'} size="small" />
      </button>
      {open ? <EmbeddedOrbPanel childName={childName} onClose={() => setOpen(false)} onImmersive={() => setImmersive(true)} /> : null}
      {immersive ? (
        <div className="orb-standalone-atmosphere fixed inset-0 z-[90] p-4 text-white">
          <div className="orb-screen-edge-pulse" data-orb-state="idle" aria-hidden />
          <button type="button" onClick={() => setImmersive(false)} className="orb-primary-action absolute right-6 top-6 rounded-full px-4 py-3 text-sm font-black">Close</button>
          <div className="flex min-h-full items-center justify-center">
            <EmbeddedOrbPanel childName={childName} onClose={() => setImmersive(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}


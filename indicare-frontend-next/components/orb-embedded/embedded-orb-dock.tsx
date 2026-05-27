'use client'

import { useState } from 'react'

import { OrbSphere } from '@/components/orb-core/orb-sphere'
import { EmbeddedOrbPanel } from './embedded-orb-panel'

export function EmbeddedOrbDock({ childName }: { childName?: string }) {
  const [open, setOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)

  return (
    <>
      <div className="pointer-events-none fixed bottom-7 right-7 z-50">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="orb-embedded-dock pointer-events-auto rounded-full p-2"
          data-orb-state={childName ? 'idle' : 'private_mode'}
          aria-label="Open ORB operational companion"
        >
          <OrbSphere state={childName ? 'idle' : 'private_mode'} size="small" />
        </button>
      </div>
      {open ? <EmbeddedOrbPanel childName={childName} onClose={() => setOpen(false)} onImmersive={() => setImmersive(true)} /> : null}
      {immersive ? (
        <div
          className="orb-overlay-shell orb-standalone-atmosphere fixed inset-0 z-[90] p-4 text-white"
          onClick={(event) => {
            if (event.target === event.currentTarget) setImmersive(false)
          }}
        >
          <div className="orb-screen-edge-pulse" data-orb-state="idle" aria-hidden />
          <button type="button" onClick={() => setImmersive(false)} className="orb-overlay-interactive orb-primary-action absolute right-6 top-6 rounded-full px-4 py-3 text-sm font-black">Close</button>
          <div className="orb-overlay-interactive flex min-h-full items-center justify-center">
            <EmbeddedOrbPanel childName={childName} onClose={() => setImmersive(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}


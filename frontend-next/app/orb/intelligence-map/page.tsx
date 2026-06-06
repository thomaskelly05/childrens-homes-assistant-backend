'use client'

import { useState } from 'react'
import Link from 'next/link'

import { OrbAuthGate } from '@/components/orb-residential/orb-auth-gate'
import { OrbIntelligenceMapPanel } from '@/components/orb-standalone/orb-intelligence-map-panel'

export default function OrbIntelligenceMapPage() {
  const [open, setOpen] = useState(true)

  return (
    <OrbAuthGate mode="product">
    <div className="min-h-screen bg-[#05070d] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link href="/orb" className="text-sm font-semibold text-cyan-200 hover:underline">
          ← Back to ORB
        </Link>
        <h1 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Intelligence Map</h1>
      </header>
      <OrbIntelligenceMapPanel open={open} onClose={() => setOpen(false)} />
      {!open ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold"
          >
            Open map
          </button>
        </div>
      ) : null}
    </div>
    </OrbAuthGate>
  )
}

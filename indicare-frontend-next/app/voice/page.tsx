import Link from 'next/link'
import { Mic, ShieldCheck, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, PageHeader, SectionHeader } from '@/components/indicare/ui'
import { OrbVisual } from '@/components/indicare/orb/orb-visual'

const voiceCards: Array<[LucideIcon, string, string]> = [
  [Mic, 'Speak or type', 'Use the floating Orb control for live voice or typed conversation.'],
  [ShieldCheck, 'Scoped context', 'Child records stay locked to the active child and permitted home.'],
  [Sparkles, 'Recover calmly', 'If realtime audio is unavailable, Orb keeps typed conversation open.']
]

export default function VoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice"
        title="Orb voice workspace"
        description="Orb voice is available through the global Orb button and assistant workspace. This page keeps voice navigation controlled while full-screen voice tools are completed."
        action={<Link href="/assistant" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">Open Orb</Link>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <SectionHeader eyebrow="Controlled limitation" title="Use Orb from the OS shell" />
          <div className="grid gap-3 md:grid-cols-3">
            {voiceCards.map(([Icon, title, body]) => (
              <article key={String(title)} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <Icon className="h-5 w-5 text-blue-600" aria-hidden />
                <h2 className="mt-3 text-sm font-black text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </Card>

        <Card className="text-center">
          <OrbVisual state="idle" />
          <h2 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">Orb is present</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Open Orb from the shell or update voice preferences in settings.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/assistant" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">Assistant</Link>
            <Link href="/settings/orb" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Settings</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

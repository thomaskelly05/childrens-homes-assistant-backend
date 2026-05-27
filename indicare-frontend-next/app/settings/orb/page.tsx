import Link from 'next/link'
import { Mic, ShieldCheck, Sparkles, Volume2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { OrbSetup } from '@/components/indicare/orb/orb-setup'

const foundations = [
  ['Voice provider abstraction', 'OpenAI realtime env-gated with typed recovery', 'Operational'],
  ['Wake phrase', 'Hey IndiCare placeholder foundation', 'Foundation'],
  ['Record writing safety', 'Draft preview and confirmation before save', 'Operational'],
  ['Transcript privacy', 'No raw audio storage by default', 'Operational'],
  ['Seven brains', 'Care, Inspector, General, Web Research, Productivity, Report Writer and Voice Recording routing', 'Operational']
]

const conceptCards: Array<[LucideIcon, string, string]> = [
  [Sparkles, 'Presence layer', 'Available across OS, standalone assistant, shift, handover and quick recording foundations.'],
  [Mic, 'Interruptible voice', 'Listening, thinking, speaking, interrupted, muted, private, recording and dictation states.'],
  [ShieldCheck, 'Care safe', 'Orb drafts and asks before saving. Safeguarding conclusions require evidence and review.'],
  [Volume2, 'British synthetic profile', 'Default calm British synthetic provider voice; no real-person cloning.']
]

export default function OrbSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Orb powered by IndiCare"
        title="Voice assistant settings"
        description="Configure Orb voice, privacy, activation and the human-in-the-loop safety controls for care recording."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow="Concept" title="Calm voice and presence layer" />
          <div className="grid gap-3 md:grid-cols-2">
            {conceptCards.map(([Icon, title, text]) => (
              <div key={String(title)} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <Icon className="h-5 w-5 text-blue-600" aria-hidden />
                <h3 className="mt-3 text-sm font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Setup" title="Voice onboarding" />
          <p className="text-sm leading-6 text-slate-600">Complete the Siri-style onboarding flow to test microphone permission, choose voice preferences and save activation options.</p>
          <Link href="/settings/orb/setup" className="mt-5 inline-flex rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">
            Start Orb setup
          </Link>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Runtime" title="Architecture foundations" />
        <div className="space-y-4">
          {foundations.map(([label, value, status]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-slate-100 bg-slate-50/70 p-5">
              <div>
                <h3 className="text-sm font-black text-slate-950">{label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{value}</p>
              </div>
              <StatusBadge value={status} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Quick setup" title="Core preferences" />
        <OrbSetup compact />
      </Card>
    </div>
  )
}


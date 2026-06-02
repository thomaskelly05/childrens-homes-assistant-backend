'use client'

import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { OrbCapabilityCard } from '@/components/orb-residential/ui/orb-capability-card'
import { OrbGlowHero } from '@/components/orb-residential/ui/orb-glow-hero'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import { personalisedEmptyHeading } from '@/lib/orb/orb-personalised-greeting'

const SUGGESTED_PROMPTS = [
  'Review an incident',
  'Create a risk assessment',
  'Prepare for Ofsted',
  'Create a template',
  'Explain Regulation 44',
  'Create a 5-minute learning session',
  'Help with a locality risk assessment'
]

const CAPABILITY_LINKS = [
  { title: 'Review This', href: '/orb/review' },
  { title: 'Templates', href: '/orb/templates' },
  { title: 'Learn', href: '/orb/learn' },
  { title: 'Saved Outputs', href: '/orb/saved' }
]

export function OrbResidentialChatHome() {
  const router = useRouter()
  const account = useOrbAccountState()
  const [prompt, setPrompt] = useState('')

  const greeting = useMemo(
    () => personalisedEmptyHeading(account.adultProfile) || 'How can I help today?',
    [account.adultProfile]
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const text = prompt.trim()
    if (!text) return
    const params = new URLSearchParams({ q: text })
    router.push(`/orb/ask?${params.toString()}`)
  }

  return (
    <OrbShell
      headerRight={
        <Link href="/orb/profile" className="text-xs text-slate-400 hover:text-white">
          Profile
        </Link>
      }
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center py-8" data-orb-home>
        <OrbGlowHero compact />
        <h1 className="mt-2 text-center text-2xl font-semibold text-white sm:text-3xl">{greeting}</h1>
        <form onSubmit={handleSubmit} className="mt-8 w-full">
          <label className="sr-only" htmlFor="orb-home-prompt">
            Ask ORB
          </label>
          <textarea
            id="orb-home-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Ask ORB anything about recording, safeguarding, Ofsted or practice…"
            className="w-full resize-none rounded-3xl border border-white/10 bg-white/[0.05] px-5 py-4 text-base text-white placeholder:text-slate-500 focus:border-sky-400/40 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            data-orb-home-input
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 py-3 text-sm font-semibold text-slate-950"
          >
            Ask ORB
          </button>
        </form>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPrompt(item)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:border-sky-400/30 hover:text-white"
              data-orb-suggested-prompt
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {CAPABILITY_LINKS.map((cap) => (
            <OrbCapabilityCard key={cap.title} title={cap.title} href={cap.href} subtle />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-600">
          Full chat with history and tools:{' '}
          <Link href="/orb/ask" className="text-sky-400/90 hover:text-sky-300">
            Open ORB workspace
          </Link>
        </p>
      </div>
    </OrbShell>
  )
}

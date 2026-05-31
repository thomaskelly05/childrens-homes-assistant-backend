'use client'

import Link from 'next/link'

import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { OrbGlowHero } from '@/components/orb-residential/ui/orb-glow-hero'
import { orbElectricGlow, orbGlassCard, orbNavyGradient, orbNavyPage } from '@/components/orb-residential/ui/orb-theme'

const EXAMPLE_HINTS = [
  { label: 'Review incidents', href: '/orb?station=review' },
  { label: 'Create templates', href: '/orb?station=templates' },
  { label: 'Ask about Ofsted', href: '/orb?q=What%20should%20we%20prepare%20for%20Ofsted%3F' },
  { label: 'Learn in minutes', href: '/orb?station=learn' }
]

export function OrbFrontDoor() {
  return (
    <div
      className={`${orbNavyPage} ${orbNavyGradient} flex h-[100dvh] flex-col overflow-hidden`}
      data-orb-front-door
    >
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between px-6 py-5">
        <Link href="/" className="flex flex-col gap-0.5" data-orb-brand>
          <span className="text-sm font-semibold tracking-tight text-white">ORB Residential</span>
          <span className="text-[11px] font-medium text-sky-300/80">Powered by IndiCare Intelligence</span>
        </Link>
        <Link href="/os" className="text-xs font-medium text-slate-400 transition hover:text-sky-300" data-orb-os-link>
          IndiCare OS
        </Link>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-6">
        <div className={`grid items-center gap-6 lg:grid-cols-[0.95fr_1.05fr] ${orbElectricGlow}`}>
          <div className="flex justify-center lg:justify-end">
            <div className="scale-[0.68] sm:scale-[0.78] lg:scale-[0.88]">
              <OrbGlowHero compact />
            </div>
          </div>

          <div className={`${orbGlassCard} px-6 py-6 sm:px-8 sm:py-8`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-300/80">ORB Residential</p>
            <p className="mt-2 text-xs text-slate-400">Powered by IndiCare Intelligence</p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-4xl sm:leading-tight">
              The Professional AI Copilot for Children&apos;s Homes
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Ask questions.
              <br />
              Write better records.
              <br />
              Review practice.
              <br />
              Stay inspection ready.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <OrbButton href="/orb/login?returnUrl=/orb" data-testid="orb-cta-trial">
                Start Free Trial
              </OrbButton>
              <OrbButton variant="secondary" href="/orb/login" data-testid="orb-cta-sign-in">
                Sign In
              </OrbButton>
            </div>

            <p className="mt-4 text-xs text-slate-500">7 day free trial. Then £9.99/month.</p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {EXAMPLE_HINTS.map((hint) => (
                <li key={hint.label}>
                  <Link
                    href={hint.href}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-500 transition hover:border-sky-400/25 hover:text-slate-300"
                    data-orb-front-door-example
                  >
                    {hint.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl shrink-0 px-6 pb-5">
        <p className="text-center text-[10px] leading-5 text-slate-600">
          ORB supports professional judgement. It does not replace safeguarding procedures, managers, emergency
          services or local protocols.
        </p>
      </footer>
    </div>
  )
}

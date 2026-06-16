'use client'

import Link from 'next/link'

import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { useOrbResidentialThemeSync } from '@/components/orb-residential/use-orb-residential-theme-sync'
import { orbElectricGlow, orbGlassCard, orbNavyGradient, orbNavyPage } from '@/components/orb-residential/ui/orb-theme'

const EXAMPLE_HINTS = [
  { label: 'Review incidents', href: '/orb?station=review' },
  { label: 'Create templates', href: '/orb?station=templates' },
  { label: 'Prepare for inspection', href: '/orb?q=Help%20me%20prepare%20for%20inspection%20readiness' },
  { label: 'Learn in minutes', href: '/orb?station=learn' }
]

export function OrbFrontDoor() {
  useOrbResidentialThemeSync()

  return (
    <div
      className={`orb-residential-root ${orbNavyPage} ${orbNavyGradient} flex h-[100dvh] flex-col overflow-hidden`}
      data-orb-front-door
      data-orb-residential="true"
    >
      <header className="mx-auto flex w-full max-w-[68rem] shrink-0 items-center justify-between px-6 py-5 lg:px-8">
        <Link href="/" className="flex flex-col gap-0.5" data-orb-brand>
          <span className="text-sm font-semibold tracking-tight text-white">ORB Residential</span>
          <span className="text-[11px] font-medium text-[var(--orb-brand-navy,#0B1F3A)]" data-orb-powered-indicare>Powered by IndiCare Intelligence</span>
        </Link>
        <Link href="/os" className="text-xs font-medium text-slate-400 transition hover:text-sky-300" data-orb-os-link>
          IndiCare OS
        </Link>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[68rem] flex-1 flex-col justify-center px-6 pb-6 lg:px-8">
        <div
          className={`grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 ${orbElectricGlow}`}
          data-orb-front-door-hero
        >
          <div className="flex justify-center lg:justify-end">
            <OrbHeroSphere className="scale-90 sm:scale-100 lg:scale-110" />
          </div>

          <div className={`${orbGlassCard} px-7 py-7 sm:px-9 sm:py-9`} data-orb-front-door-card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-300/80">ORB Residential</p>
            <p className="mt-2 text-xs text-slate-400">Powered by IndiCare Intelligence</p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[2rem] sm:leading-tight lg:text-[2.25rem]">
              The Professional AI Copilot for Children&apos;s Homes
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Ask questions.
              <br />
              Write better records.
              <br />
              Review practice.
              <br />
              support inspection evidence preparation.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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

      <footer className="mx-auto w-full max-w-[68rem] shrink-0 px-6 pb-5 lg:px-8">
        <p className="text-center text-[10px] leading-5 text-slate-600">
          ORB supports professional judgement. It does not replace safeguarding procedures, managers, emergency
          services or local protocols.
        </p>
      </footer>
    </div>
  )
}

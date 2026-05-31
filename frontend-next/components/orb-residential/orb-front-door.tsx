'use client'

import Link from 'next/link'

import { OrbCapabilityCard } from '@/components/orb-residential/ui/orb-capability-card'
import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { OrbGlowHero } from '@/components/orb-residential/ui/orb-glow-hero'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { orbElectricGlow } from '@/components/orb-residential/ui/orb-theme'

const CAPABILITIES = [
  { title: 'Review This', href: '/orb/review' },
  { title: 'Templates', href: '/orb/templates' },
  { title: 'Learn', href: '/orb/learn' },
  { title: 'Saved Outputs', href: '/orb/saved' },
  { title: 'Ofsted Lens', href: '/orb?lens=ofsted' },
  { title: 'Safeguarding Lens', href: '/orb?lens=safeguarding' },
  { title: 'Locality Risk', href: '/orb?lens=locality' }
]

export function OrbFrontDoor() {
  return (
    <OrbShell>
      <section className="flex flex-col items-center pt-4 text-center sm:pt-8" data-orb-front-door>
        <OrbGlowHero />
        <div className={`mx-auto max-w-3xl ${orbElectricGlow}`}>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-tight">
            The Professional AI Copilot for Children&apos;s Homes
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Write better records.
            <br />
            Strengthen safeguarding.
            <br />
            Create templates.
            <br />
            Stay inspection ready.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <OrbButton href="/orb/login?returnUrl=/orb/setup" data-testid="orb-cta-trial">
              Start Free Trial
            </OrbButton>
            <OrbButton variant="secondary" href="/orb/login" data-testid="orb-cta-sign-in">
              Sign In
            </OrbButton>
          </div>
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-2">
            <OrbButton variant="secondary" href="/orb/login?returnUrl=/orb/setup&provider=microsoft" className="w-full">
              Continue with Microsoft
            </OrbButton>
            <OrbButton variant="ghost" href="/orb/login?returnUrl=/orb/setup&provider=google" className="w-full text-sm">
              Continue with Google · Apple · Email
            </OrbButton>
          </div>
          <p className="mt-6 text-sm text-slate-500">7 Day Free Trial. Then £9.99/month.</p>
          <p className="mx-auto mt-8 max-w-2xl text-xs leading-relaxed text-slate-500">
            ORB supports professional judgement. It does not replace safeguarding procedures, managers, emergency
            services or local protocols.
          </p>
        </div>
        <div className="mt-14 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {CAPABILITIES.map((cap, index) => (
            <OrbCapabilityCard key={cap.title} title={cap.title} href={cap.href} subtle={index >= 4} />
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-slate-600">
          Already using IndiCare OS?{' '}
          <Link href="/os" className="text-sky-400/90 hover:text-sky-300">
            Open OS workspace
          </Link>
        </p>
      </section>
    </OrbShell>
  )
}

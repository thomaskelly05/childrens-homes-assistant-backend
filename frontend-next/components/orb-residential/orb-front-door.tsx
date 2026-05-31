'use client'

import Link from 'next/link'

import { OrbCapabilityCard } from '@/components/orb-residential/ui/orb-capability-card'
import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { OrbGlowHero } from '@/components/orb-residential/ui/orb-glow-hero'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { orbElectricGlow, orbGlassCard } from '@/components/orb-residential/ui/orb-theme'

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
      <section className="flex min-h-[calc(100vh-8rem)] flex-col justify-center gap-5 pb-2 pt-1 text-center" data-orb-front-door>
        <div className={`mx-auto grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[0.92fr_1.08fr] ${orbElectricGlow}`}>
          <div className="order-1 flex justify-center lg:order-2">
            <div className="scale-[0.72] sm:scale-[0.82] lg:scale-90">
              <OrbGlowHero compact />
            </div>
          </div>

          <div className={`order-2 ${orbGlassCard} px-5 py-5 sm:px-8 sm:py-7 lg:order-1 lg:text-left`}>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-sky-300/80">
              ORB Residential
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-tight">
              The Professional AI Copilot for Children&apos;s Homes
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 lg:mx-0 sm:text-base">
              Write better records. Strengthen safeguarding. Create templates. Stay inspection ready.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row lg:justify-start justify-center">
              <OrbButton href="/orb/login?returnUrl=/orb/setup" data-testid="orb-cta-trial">
                Start Free Trial
              </OrbButton>
              <OrbButton variant="secondary" href="/orb/login" data-testid="orb-cta-sign-in">
                Sign In
              </OrbButton>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <OrbButton variant="secondary" href="/orb/login?returnUrl=/orb/setup&provider=microsoft" className="w-full text-sm">
                Continue with Microsoft
              </OrbButton>
              <OrbButton variant="ghost" href="/orb/login?returnUrl=/orb/setup&provider=google" className="w-full text-sm">
                Google / Apple / Email
              </OrbButton>
            </div>

            <div className="mt-5 grid gap-1 text-xs leading-5 text-slate-500 sm:grid-cols-[1fr_1.5fr]">
              <p>7 Day Free Trial. Then £9.99/month.</p>
              <p>ORB supports professional judgement and local safeguarding procedures.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CAPABILITIES.map((cap, index) => (
            <OrbCapabilityCard key={cap.title} title={cap.title} href={cap.href} subtle={index >= 4} />
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-600">
          Already using IndiCare OS?{' '}
          <Link href="/os" className="text-sky-400/90 hover:text-sky-300">
            Open OS workspace
          </Link>
        </p>
      </section>
    </OrbShell>
  )
}

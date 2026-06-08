import Link from 'next/link'

import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { orbProductCopy } from '@/lib/orb/content/copy'

const TRUST_POINTS = [
  'Human review required',
  'Data protection controls',
  'Provider AI settings',
  "Designed for children's homes"
] as const

/** Desktop/tablet left hero — brand, ORB visual, tagline, copy and trust points. */
export function OrbLoginDesktopHero() {
  return (
    <div
      className="orb-login-hero relative hidden flex-col justify-start lg:flex lg:px-4 xl:px-8"
      data-orb-login-hero-top-aligned
      data-orb-login-desktop-hero
    >
      <div className="orb-login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="orb-login-hero-inner relative flex flex-col justify-start">
        <div className="orb-login-hero-brand" data-orb-login-hero-brand>
          <Link href="/orb" className="orb-login-brand-link text-sm font-semibold" data-orb-login-brand>
            ORB Residential
          </Link>
          <p className="orb-login-tagline mt-1 text-xs" data-orb-login-engine-line>
            Powered by IndiCare Intelligence
          </p>
        </div>

        <div className="orb-login-hero-visual mt-5" data-orb-login-hero-visual>
          <div className="orb-login-hero-sphere-wrap flex justify-center" data-orb-login-hero-sphere>
            <OrbHeroSphere />
          </div>
          <p className="orb-login-brand-tag text-xs tracking-wide" data-orb-login-brand-tag>
            {orbProductCopy.brandLine}
          </p>
        </div>

        <h1
          className="orb-login-headline mt-5 max-w-md text-3xl font-semibold tracking-tight xl:text-[2rem]"
          data-orb-login-title
        >
          AI support for residential children&apos;s homes
        </h1>
        <p className="orb-login-lead mt-3 max-w-md text-base leading-relaxed">
          Record better. Reflect faster. Respond safer.
        </p>
        <ul className="orb-login-trust mt-5 max-w-md space-y-2 text-sm" data-orb-login-trust-points>
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--orb-res-primary,#1677ff)]"
                aria-hidden
              />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

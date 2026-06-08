import Link from 'next/link'

import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'

const VALUE_CHIPS = [
  'Safeguarding-aware support',
  'Recording and reporting help',
  'Human review required',
  'Data protection controls',
  'Built for residential teams',
  'Powered by IndiCare Intelligence'
] as const

/** Desktop/tablet left hero — ORB visual, product story and trust chips. */
export function OrbLoginDesktopHero() {
  return (
    <div
      className="orb-login-hero relative hidden flex-col justify-center lg:flex lg:px-4 xl:px-8"
      data-orb-login-hero-top-aligned
      data-orb-login-desktop-hero
    >
      <div className="orb-login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="orb-login-hero-inner relative flex flex-col justify-start">
        <div className="orb-login-hero-heading-stack" data-orb-login-hero-heading-stack>
          <div className="orb-login-hero-visual" data-orb-login-hero-visual>
            <div className="orb-login-hero-sphere-wrap" data-orb-login-hero-sphere>
              <OrbHeroSphere />
            </div>
          </div>

          <div className="orb-login-hero-brand" data-orb-login-hero-brand>
          <Link href="/orb" className="orb-login-brand-link text-sm font-semibold tracking-wide" data-orb-login-brand>
            ORB Residential
          </Link>
          <p className="orb-login-tagline mt-0.5 text-xs" data-orb-login-engine-line>
            Powered by IndiCare Intelligence
          </p>
        </div>
        </div>

        <h1
          className="orb-login-headline max-w-lg text-[2rem] font-semibold leading-tight tracking-tight xl:text-[2.25rem]"
          data-orb-login-title
        >
          AI support for residential children&apos;s homes
        </h1>
        <p className="orb-login-lead mt-3 max-w-lg text-base leading-relaxed">
          Record better. Reflect faster. Respond safer.
        </p>

        <ul
          className="orb-login-trust mt-5 grid max-w-lg gap-2 text-sm sm:grid-cols-2"
          data-orb-login-trust-points
        >
          {VALUE_CHIPS.map((point) => (
            <li
              key={point}
              className="orb-login-value-chip flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/25 bg-[var(--orb-surface-elevated)]/35 px-3 py-2"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--orb-res-primary,#818cf8)]"
                aria-hidden
              />
              {point}
            </li>
          ))}
        </ul>

        <p className="orb-login-trust-statement mt-5 max-w-lg text-sm font-medium leading-relaxed" data-orb-login-trust-note>
          Designed for adults working in and around children&apos;s homes.
        </p>

        <p className="orb-login-muted mt-3 max-w-lg text-xs leading-relaxed">
          ORB Residential does not replace professional judgement, safeguarding procedures or legal advice.
        </p>
      </div>
    </div>
  )
}

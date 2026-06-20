import Link from 'next/link'

import { OrbHeroSphere } from '@/components/orb-residential/ui/orb-hero-sphere'
import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import { ORB_DEMO_BEFORE_TRIAL_COPY } from '@/lib/orb/orb-user-facing-names'
import {
  ORB_LOGIN_ENTERPRISE_FOUNDER_LINE,
  ORB_LOGIN_ENTERPRISE_SUBHEADLINE,
  ORB_LOGIN_ENTERPRISE_SUPPORTING,
  ORB_LOGIN_ENTERPRISE_TITLE,
  ORB_LOGIN_ENTERPRISE_TRUST_PILLS
} from '@/lib/orb/orb-convergence-phase-1h-copy'

/** Desktop/tablet left hero — dark luminous brand panel with ORB identity. */
export function OrbLoginDesktopHero() {
  return (
    <div
      className="orb-login-hero orb-login-shell__brand relative hidden flex-col justify-center lg:flex lg:px-4 xl:px-8"
      data-orb-login-hero-top-aligned
      data-orb-login-desktop-hero
      data-orb-login-brand-panel
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
              {ORB_LOGIN_ENTERPRISE_TITLE}
            </Link>
            <p className="orb-login-tagline mt-0.5 text-xs" data-orb-login-engine-line>
              Powered by IndiCare Intelligence
            </p>
          </div>
        </div>

        <h1
          className="orb-login-headline orb-login-headline--showstopper max-w-lg font-semibold leading-tight tracking-tight"
          data-orb-login-title
        >
          {ORB_LOGIN_ENTERPRISE_TITLE}
        </h1>
        <p className="orb-login-lead orb-login-lead--showstopper mt-2 max-w-lg leading-relaxed" data-orb-login-subheadline>
          {ORB_LOGIN_ENTERPRISE_SUBHEADLINE}
        </p>
        <p className="orb-login-lead orb-login-lead--showstopper mt-3 max-w-lg leading-relaxed" data-orb-login-supporting>
          {ORB_LOGIN_ENTERPRISE_SUPPORTING}
        </p>

        <ul
          className="orb-login-trust mt-5 flex max-w-lg flex-wrap gap-2"
          data-orb-login-trust-points
        >
          {ORB_LOGIN_ENTERPRISE_TRUST_PILLS.map((point) => (
            <li key={point} className="orb-login-trust-pill">
              {point}
            </li>
          ))}
        </ul>

        <p className="orb-login-founder-line mt-5 max-w-lg leading-relaxed" data-orb-login-founder-line>
          {ORB_LOGIN_ENTERPRISE_FOUNDER_LINE}
        </p>

        <p className="orb-login-muted mt-3 max-w-lg text-xs leading-relaxed opacity-80">
          ORB Residential supports professional judgement. It does not replace safeguarding procedures or local policy.
        </p>

        <div className="orb-login-demo-card" data-orb-login-demo-path>
          <p className="text-xs leading-relaxed opacity-90">{ORB_DEMO_BEFORE_TRIAL_COPY}</p>
          <p className="mt-2">
            <OrbRequestDemoLink
              surface="login"
              className="inline-flex min-h-[2.25rem] items-center rounded-full border border-slate-500/40 bg-slate-900/40 px-4 py-1.5 text-sm font-semibold text-slate-100 underline-offset-2 hover:bg-slate-900/60 hover:underline"
            />
          </p>
        </div>
      </div>
    </div>
  )
}

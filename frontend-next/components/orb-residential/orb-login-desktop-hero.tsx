import Link from 'next/link'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import {
  ORB_LOGIN_ENTERPRISE_SUBHEADLINE,
  ORB_LOGIN_ENTERPRISE_SUPPORTING,
  ORB_LOGIN_ENTERPRISE_TITLE
} from '@/lib/orb/orb-convergence-phase-1h-copy'
import {
  ORB_LOGIN_FOUNDER_LINE,
  ORB_LOGIN_PRODUCT_EXPLANATION,
  ORB_LOGIN_STATION_DESCRIPTIONS
} from '@/lib/orb/orb-login-stations-copy'

/** Desktop/tablet left hero — calm brand panel with ORB identity. */
export function OrbLoginDesktopHero() {
  return (
    <div
      className="orb-login-hero orb-login-shell__brand relative hidden flex-col justify-center lg:flex lg:px-4 xl:px-8"
      data-orb-login-hero-top-aligned
      data-orb-login-desktop-hero
      data-orb-login-brand-panel
    >
      <div className="orb-login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="orb-login-hero-inner relative mx-auto flex w-full max-w-lg flex-col justify-center">
        <div className="orb-login-hero-visual mb-6" data-orb-login-hero-visual>
          <div className="orb-login-hero-sphere-wrap flex justify-center" data-orb-login-hero-sphere>
            <GlassOrbMark size="lg" pulse data-orb-login-brand-mark />
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

        <p className="orb-login-founder-line mt-4 max-w-lg text-sm font-medium leading-relaxed" data-orb-login-founder-line>
          {ORB_LOGIN_FOUNDER_LINE}
        </p>

        <h1
          className="orb-login-headline orb-login-headline--showstopper mt-5 max-w-lg font-semibold leading-tight tracking-tight"
          data-orb-login-title
        >
          {ORB_LOGIN_ENTERPRISE_TITLE}
        </h1>
        <p className="orb-login-lead orb-login-lead--showstopper mt-3 max-w-lg leading-relaxed" data-orb-login-subheadline>
          {ORB_LOGIN_ENTERPRISE_SUBHEADLINE}
        </p>
        <p className="orb-login-supporting mt-4 max-w-lg text-sm leading-relaxed text-slate-300" data-orb-login-supporting>
          {ORB_LOGIN_ENTERPRISE_SUPPORTING}
        </p>
        <p className="orb-login-product-explainer mt-4 max-w-lg text-sm leading-relaxed text-slate-200" data-orb-login-product-explainer>
          {ORB_LOGIN_PRODUCT_EXPLANATION}
        </p>

        <div className="orb-login-stations mt-6 space-y-2.5" data-orb-login-stations>
          {ORB_LOGIN_STATION_DESCRIPTIONS.map((station) => (
            <div key={station.id} className="orb-login-station-row" data-orb-login-station={station.id}>
              <p className="text-sm font-semibold text-slate-100">{station.label}</p>
              <p className="text-xs leading-relaxed text-slate-300">{station.description}</p>
            </div>
          ))}
        </div>

        <p className="orb-login-muted mt-6 max-w-lg text-sm leading-relaxed opacity-90">
          ORB supports professional judgement. It does not replace safeguarding procedures or local policy.
        </p>

        <p className="orb-login-demo-link mt-6 text-sm" data-orb-login-demo-path>
          <OrbRequestDemoLink
            surface="login"
            className="font-semibold text-slate-100 underline-offset-2 hover:underline"
          />
        </p>
      </div>
    </div>
  )
}

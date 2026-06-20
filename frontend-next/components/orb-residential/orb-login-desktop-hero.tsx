import Link from 'next/link'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import { ORB_LOGIN_ENTERPRISE_TITLE, ORB_LOGIN_ENTERPRISE_SUBHEADLINE, ORB_LOGIN_ENTERPRISE_SUPPORTING } from '@/lib/orb/orb-residential-shell-copy'
import {
  ORB_LOGIN_FOUNDER_LINE,
  ORB_LOGIN_PRODUCT_EXPLANATION,
  ORB_LOGIN_STATION_DESCRIPTIONS
} from '@/lib/orb/orb-login-stations-copy'

/** Desktop/tablet left hero — compact product entrance above the fold. */
export function OrbLoginDesktopHero() {
  return (
    <div
      className="orb-login-hero orb-login-shell__brand relative hidden flex-col justify-center lg:flex lg:px-4 xl:px-8"
      data-orb-login-hero-top-aligned
      data-orb-login-desktop-hero
      data-orb-login-brand-panel
    >
      <div className="orb-login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="orb-login-hero-inner relative mx-auto flex w-full max-w-lg flex-col justify-center py-6 lg:max-h-[100dvh] lg:overflow-y-auto lg:overscroll-contain">
        <div className="flex flex-col items-start gap-3" data-orb-login-hero-visual>
          <div className="orb-login-hero-sphere-wrap shrink-0" data-orb-login-hero-sphere>
            <GlassOrbMark size="md" pulse data-orb-login-brand-mark />
          </div>
          <div className="min-w-0" data-orb-login-hero-brand>
            <Link href="/orb" className="orb-login-brand-link text-sm font-semibold tracking-wide" data-orb-login-brand>
              {ORB_LOGIN_ENTERPRISE_TITLE}
            </Link>
            <p className="orb-login-tagline mt-0.5 text-xs" data-orb-login-engine-line>
              Powered by IndiCare Intelligence
            </p>
          </div>
        </div>

        <p
          className="orb-login-headline--showstopper mt-4 text-base font-semibold leading-snug text-slate-100"
          data-orb-login-title
          data-orb-login-subheadline
        >
          {ORB_LOGIN_ENTERPRISE_SUBHEADLINE}
        </p>

        <p className="orb-login-supporting mt-2 text-sm leading-relaxed text-slate-200" data-orb-login-supporting>
          {ORB_LOGIN_ENTERPRISE_SUPPORTING}
        </p>

        <p className="orb-login-founder-line mt-4 text-sm font-medium leading-relaxed" data-orb-login-founder-line>
          {ORB_LOGIN_FOUNDER_LINE}
        </p>

        <p className="orb-login-product-explainer mt-3 text-sm leading-relaxed text-slate-200" data-orb-login-product-explainer>
          {ORB_LOGIN_PRODUCT_EXPLANATION}
        </p>

        <div className="orb-login-stations mt-5" data-orb-login-stations>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">ORB stations</p>
          <div
            className="orb-login-stations-scroll grid max-h-[min(12rem,28dvh)] gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2"
            data-orb-login-stations-scroll
          >
            {ORB_LOGIN_STATION_DESCRIPTIONS.map((station) => (
              <div key={station.id} className="orb-login-station-row min-w-0" data-orb-login-station={station.id}>
                <p className="text-sm font-semibold text-slate-100">{station.label}</p>
                <p className="text-[11px] leading-relaxed text-slate-300">{station.description}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="orb-login-muted mt-4 text-xs leading-relaxed opacity-90">
          ORB supports professional judgement. It does not replace safeguarding procedures or local policy.
        </p>

        <p className="orb-login-demo-link mt-4 text-sm" data-orb-login-demo-path>
          <OrbRequestDemoLink
            surface="login"
            className="font-semibold text-slate-100 underline-offset-2 hover:underline"
          />
        </p>
      </div>
    </div>
  )
}

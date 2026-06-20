import Link from 'next/link'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbRequestDemoLink } from '@/components/orb-residential/orb-request-demo-link'
import {
  ORB_LOGIN_ENTERPRISE_SUBHEADLINE,
  ORB_LOGIN_ENTERPRISE_SUPPORTING,
  ORB_LOGIN_ENTERPRISE_TITLE
} from '@/lib/orb/orb-residential-shell-copy'
import {
  ORB_LOGIN_CAPABILITY_GROUPS,
  ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE,
  ORB_LOGIN_FOUNDER_LINE,
  ORB_LOGIN_PRODUCT_EXPLANATION,
  ORB_LOGIN_PROFESSIONAL_BOUNDARY
} from '@/lib/orb/orb-login-stations-copy'

/** Desktop/tablet left hero — premium single product entrance above the fold. */
export function OrbLoginDesktopHero() {
  return (
    <div
      className="orb-login-entrance orb-login-hero orb-login-shell__brand orb-login-brand-panel relative hidden flex-col justify-center lg:flex lg:px-4 xl:px-8"
      data-orb-login-entrance
      data-orb-login-hero-top-aligned
      data-orb-login-desktop-hero
      data-orb-login-brand-panel
      data-orb-login-premium-entrance
    >
      <div className="orb-login-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="orb-login-hero-inner relative mx-auto flex w-full max-w-2xl flex-col justify-center py-3 lg:max-h-[100dvh] lg:overflow-visible"
        data-orb-login-above-fold
      >
        <div className="orb-login-brand-orb-field orb-login-brand-orb flex flex-col items-start gap-2.5" data-orb-login-hero-visual data-orb-login-luminous-orb>
          <div className="orb-login-hero-sphere-wrap shrink-0" data-orb-login-hero-sphere>
            <GlassOrbMark variant="hero" pulse data-orb-login-brand-mark />
          </div>
          <div className="min-w-0" data-orb-login-hero-brand>
            <Link href="/orb" className="orb-login-brand-link text-sm font-semibold tracking-wide" data-orb-login-brand>
              {ORB_LOGIN_ENTERPRISE_TITLE}
            </Link>
            <p className="orb-login-tagline mt-0.5 text-xs" data-orb-login-engine-line>
              Powered by IndiCare Intelligence
            </p>
            <p className="orb-login-ethical-line mt-1 text-sm font-medium text-slate-200/95" data-orb-login-brand-promise>
              {ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE}
            </p>
          </div>
        </div>

        <p
          className="orb-login-headline--showstopper mt-3 text-2xl font-semibold leading-tight text-slate-100 xl:text-[1.65rem]"
          data-orb-login-title
          data-orb-login-subheadline
        >
          {ORB_LOGIN_ENTERPRISE_SUBHEADLINE}
        </p>

        <p className="orb-login-supporting mt-2 text-[0.9375rem] leading-relaxed text-slate-200" data-orb-login-supporting>
          {ORB_LOGIN_ENTERPRISE_SUPPORTING}
        </p>

        <p className="orb-login-founder-line mt-3 text-sm font-medium leading-relaxed text-slate-300/95" data-orb-login-founder-line>
          {ORB_LOGIN_FOUNDER_LINE}
        </p>

        <p className="orb-login-product-explainer mt-2.5 max-w-xl text-sm leading-relaxed text-slate-300/90" data-orb-login-product-explainer>
          {ORB_LOGIN_PRODUCT_EXPLANATION}
        </p>

        <div className="orb-login-capability-grid mt-4 space-y-2.5" data-orb-login-capability-groups>
          {ORB_LOGIN_CAPABILITY_GROUPS.map((group) => (
            <article
              key={group.id}
              className="orb-login-capability min-w-0"
              data-orb-login-capability={group.id}
            >
              <p className="text-sm font-semibold text-slate-100">{group.label}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-300/90">{group.description}</p>
            </article>
          ))}
        </div>

        <p
          className="orb-login-boundary orb-login-professional-boundary mt-4 rounded-xl border border-slate-400/20 bg-slate-900/25 px-3 py-2.5 text-xs leading-relaxed text-slate-200"
          data-orb-login-professional-boundary
        >
          {ORB_LOGIN_PROFESSIONAL_BOUNDARY}
        </p>

        <p className="orb-login-demo-route mt-3 text-sm" data-orb-login-demo-path data-orb-login-demo-route>
          Not using ORB yet?{' '}
          <OrbRequestDemoLink
            surface="login"
            className="font-semibold text-slate-100 underline-offset-2 hover:underline"
          />
        </p>
      </div>
    </div>
  )
}

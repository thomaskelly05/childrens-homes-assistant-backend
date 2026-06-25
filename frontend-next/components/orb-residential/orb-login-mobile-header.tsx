'use client'

import Link from 'next/link'
import { useState } from 'react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import {
  ORB_LOGIN_ENTERPRISE_SUBHEADLINE,
  ORB_LOGIN_ENTERPRISE_SUPPORTING,
  ORB_LOGIN_ENTERPRISE_TITLE
} from '@/lib/orb/orb-residential-shell-copy'
import { ORB_LOGIN_CAPABILITY_GROUPS, ORB_LOGIN_FOUNDER_LINE } from '@/lib/orb/orb-login-stations-copy'

/** Mobile login brand and product promise — calm, focused single-column entrance. */
export function OrbLoginMobileHeader() {
  const [whyExpanded, setWhyExpanded] = useState(false)

  return (
    <header
      className="orb-login-mobile-header mb-2 space-y-1.5 text-left lg:hidden"
      data-orb-login-mobile-brand
      data-orb-login-mobile-layout
      data-orb-login-entrance
    >
      <div className="flex items-center gap-2.5">
        <div className="orb-login-mobile-mark orb-login-brand-orb shrink-0" data-orb-login-mobile-mark aria-hidden>
          <GlassOrbMark size="sm" pulse className="orb-login-mobile-mark-orb" />
        </div>
        <div className="min-w-0 flex-1">
          <Link href="/orb" className="orb-login-brand-link text-sm font-semibold" data-orb-login-brand>
            {ORB_LOGIN_ENTERPRISE_TITLE}
          </Link>
          <p className="orb-login-tagline mt-0.5 text-xs leading-snug" data-orb-login-engine-line>
            Powered by IndiCare Intelligence
          </p>
        </div>
      </div>

      <p className="orb-login-mobile-hero text-base font-semibold leading-snug text-[var(--orb-foreground)]" data-orb-login-subheadline>
        {ORB_LOGIN_ENTERPRISE_SUBHEADLINE}
      </p>
      <p className="orb-login-mobile-subcopy text-sm leading-snug text-[var(--orb-muted)]" data-orb-login-supporting>
        {ORB_LOGIN_ENTERPRISE_SUPPORTING}
      </p>

      <div className="orb-login-why-orb" data-orb-login-why-orb>
        <button
          type="button"
          className="orb-login-why-orb-toggle text-xs font-medium text-[var(--orb-muted)] underline-offset-2 hover:text-[var(--orb-foreground)] hover:underline"
          onClick={() => setWhyExpanded((open) => !open)}
          aria-expanded={whyExpanded}
          data-orb-login-why-orb-toggle
        >
          Why ORB?
        </button>
        {whyExpanded ? (
          <div className="orb-login-why-orb-panel mt-2 space-y-2" data-orb-login-why-orb-panel>
            <p className="text-sm font-medium leading-snug text-[var(--orb-foreground)]" data-orb-login-founder-line>
              {ORB_LOGIN_FOUNDER_LINE}
            </p>
            <div className="orb-login-capability-grid space-y-1.5" data-orb-login-capability-groups>
              {ORB_LOGIN_CAPABILITY_GROUPS.map((group) => (
                <article key={group.id} className="orb-login-capability" data-orb-login-capability={group.id}>
                  <p className="orb-login-capability-label text-sm font-semibold text-[var(--orb-foreground)]">{group.label}</p>
                  <p className="orb-login-capability-promise mt-0.5 text-xs leading-snug text-[var(--orb-muted)]">{group.description}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="orb-login-capability-grid hidden" data-orb-login-capability-groups data-orb-login-capability-groups-collapsed aria-hidden />
        )}
      </div>
    </header>
  )
}

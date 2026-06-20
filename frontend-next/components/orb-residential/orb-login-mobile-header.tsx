import Link from 'next/link'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import {
  ORB_LOGIN_ENTERPRISE_SUBHEADLINE,
  ORB_LOGIN_ENTERPRISE_SUPPORTING,
  ORB_LOGIN_ENTERPRISE_TITLE
} from '@/lib/orb/orb-residential-shell-copy'
import {
  ORB_LOGIN_CAPABILITY_GROUPS,
  ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE,
  ORB_LOGIN_FOUNDER_LINE,
  ORB_LOGIN_PROFESSIONAL_BOUNDARY
} from '@/lib/orb/orb-login-stations-copy'

/** Mobile login brand and product promise — single-column entrance. */
export function OrbLoginMobileHeader() {
  return (
    <header className="orb-login-mobile-header mb-4 space-y-2.5 text-left lg:hidden" data-orb-login-mobile-brand data-orb-login-mobile-layout data-orb-login-entrance>
      <div className="flex items-center gap-3">
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
          <p className="orb-login-ethical-line mt-1 text-xs font-medium text-[var(--orb-muted)]" data-orb-login-brand-promise>
            {ORB_LOGIN_ETHICAL_INTELLIGENCE_LINE}
          </p>
        </div>
      </div>

      <p className="text-lg font-semibold leading-snug text-[var(--orb-foreground)]" data-orb-login-subheadline>
        {ORB_LOGIN_ENTERPRISE_SUBHEADLINE}
      </p>
      <p className="text-sm leading-snug text-[var(--orb-muted)]" data-orb-login-supporting>
        {ORB_LOGIN_ENTERPRISE_SUPPORTING}
      </p>

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

      <p className="orb-login-boundary rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 px-3 py-2 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-login-professional-boundary>
        {ORB_LOGIN_PROFESSIONAL_BOUNDARY}
      </p>
    </header>
  )
}

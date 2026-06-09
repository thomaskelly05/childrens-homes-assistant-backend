import Link from 'next/link'

import { PremiumMobileOrb } from '@/components/orb-residential/ui/premium-mobile-orb'

/** Compact mobile login brand — small ORB mark with left-aligned product lines. */
export function OrbLoginMobileHeader() {
  return (
    <header
      className="orb-login-mobile-header mb-5 flex items-center gap-3 text-left lg:hidden"
      data-orb-login-mobile-brand
      data-orb-login-mobile-layout
    >
      <div className="orb-login-mobile-mark shrink-0" data-orb-login-mobile-mark aria-hidden>
        <PremiumMobileOrb variant="mobile" label="" className="orb-login-mobile-mark-orb" />
      </div>
      <div className="min-w-0 flex-1">
        <Link href="/orb" className="orb-login-brand-link text-sm font-semibold" data-orb-login-brand>
          ORB Residential
        </Link>
        <p className="orb-login-tagline mt-0.5 text-xs leading-snug" data-orb-login-engine-line>
          Powered by IndiCare Intelligence
        </p>
      </div>
    </header>
  )
}

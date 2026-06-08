import Link from 'next/link'

import { PremiumMobileOrb } from '@/components/orb-residential/ui/premium-mobile-orb'

/** Compact mobile login header — brand lines and a small ORB mark (no large hero sphere). */
export function OrbLoginMobileHeader() {
  return (
    <header
      className="orb-login-mobile-header mb-4 text-center lg:hidden"
      data-orb-login-mobile-brand
      data-orb-login-mobile-layout
    >
      <Link href="/orb" className="orb-login-brand-link text-sm font-semibold" data-orb-login-brand>
        ORB Residential
      </Link>
      <p className="orb-login-tagline mt-0.5 text-xs" data-orb-login-engine-line>
        Powered by IndiCare Intelligence
      </p>
      <div className="orb-login-mobile-mark mx-auto mt-3 flex justify-center" data-orb-login-mobile-mark>
        <PremiumMobileOrb variant="mobile" label="" className="orb-login-mobile-mark-orb scale-[0.72]" />
      </div>
    </header>
  )
}

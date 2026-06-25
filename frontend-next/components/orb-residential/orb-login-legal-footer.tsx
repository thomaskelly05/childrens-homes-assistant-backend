import { OrbLegalLinks, type OrbLegalPaths } from '@/components/orb-residential/orb-legal-links'

/** Shared legal disclaimer and support links for the login card footer. */
export function OrbLoginLegalFooter({
  legalPaths,
  compactMobile = false
}: {
  legalPaths?: Partial<OrbLegalPaths>
  compactMobile?: boolean
}) {
  return (
    <footer
      className="orb-login-footer mt-4 border-t border-[var(--orb-line)]/20 pt-3 text-[10px] leading-relaxed text-[var(--orb-muted)] lg:mt-6 lg:border-[var(--orb-line)]/30 lg:pt-4"
      data-orb-login-safe-bottom
    >
      <p className={compactMobile ? 'hidden lg:block' : undefined} data-orb-login-disclaimer>
        ORB Residential does not replace professional judgement, safeguarding procedures or legal advice.
      </p>
      <OrbLegalLinks
        className="orb-login-legal-links mt-2 justify-start lg:mt-4"
        linkClassName="orb-login-link font-semibold"
        testId="orb-login-legal-links"
        variant="auth"
        legalPaths={legalPaths}
      />
    </footer>
  )
}

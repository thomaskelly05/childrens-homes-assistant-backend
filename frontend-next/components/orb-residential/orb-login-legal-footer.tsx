import { OrbLegalLinks, type OrbLegalPaths } from '@/components/orb-residential/orb-legal-links'

/** Shared legal disclaimer and support links for the login card footer. */
export function OrbLoginLegalFooter({ legalPaths }: { legalPaths?: Partial<OrbLegalPaths> }) {
  return (
    <footer
      className="orb-login-footer mt-8 border-t border-[var(--orb-line)]/40 pt-6 text-[10px] leading-relaxed text-[var(--orb-muted)]"
      data-orb-login-safe-bottom
    >
      <p data-orb-login-disclaimer>
        ORB Residential does not replace professional judgement, safeguarding procedures or legal advice.
      </p>
      <OrbLegalLinks
        className="orb-login-legal-links mt-4 justify-start"
        linkClassName="orb-login-link font-semibold"
        testId="orb-login-legal-links"
        variant="auth"
        legalPaths={legalPaths}
      />
    </footer>
  )
}

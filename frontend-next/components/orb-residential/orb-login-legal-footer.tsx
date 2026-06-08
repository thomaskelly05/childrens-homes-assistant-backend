import { OrbLegalLinks } from '@/components/orb-residential/orb-legal-links'

/** Shared legal disclaimer and public support links for the login card footer. */
export function OrbLoginLegalFooter() {
  return (
    <footer
      className="orb-login-footer mt-8 border-t border-[var(--orb-line)]/40 pt-6 text-[10px] leading-relaxed text-[var(--orb-muted)]"
      data-orb-login-safe-bottom
    >
      <p data-orb-login-disclaimer>
        ORB supports professional judgement and does not replace safeguarding procedures, managers, emergency
        services or legal advice.
      </p>
      <OrbLegalLinks
        className="mt-4 justify-start gap-4"
        linkClassName="orb-login-link font-semibold"
        testId="orb-login-legal-links"
        publicUrls
      />
    </footer>
  )
}

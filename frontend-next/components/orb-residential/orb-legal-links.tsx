import Link from 'next/link'

const ORB_PUBLIC_LEGAL_URLS = {
  privacy: 'https://www.indicare.co.uk/privacy',
  terms: 'https://www.indicare.co.uk/terms',
  cookies: 'https://www.indicare.co.uk/cookies',
  support: 'https://www.indicare.co.uk/support'
} as const

type OrbLegalLinksProps = {
  className?: string
  linkClassName?: string
  testId?: string
  /** Use public www.indicare.co.uk URLs (login footer). Default: in-app /privacy and /terms. */
  publicUrls?: boolean
}

/** Shared Privacy and Terms links for ORB Residential surfaces. */
export function OrbLegalLinks({
  className = 'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs',
  linkClassName = 'font-medium text-[var(--orb-res-primary,#1677ff)] underline-offset-2 hover:underline',
  testId = 'orb-legal-links',
  publicUrls = false
}: OrbLegalLinksProps) {
  if (publicUrls) {
    return (
      <nav className={className} aria-label="Legal and support" data-testid={testId}>
        <a
          href={ORB_PUBLIC_LEGAL_URLS.privacy}
          className={linkClassName}
          data-orb-privacy-link
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy
        </a>
        <a
          href={ORB_PUBLIC_LEGAL_URLS.terms}
          className={linkClassName}
          data-orb-terms-link
          target="_blank"
          rel="noopener noreferrer"
        >
          Terms
        </a>
        <a
          href={ORB_PUBLIC_LEGAL_URLS.cookies}
          className={linkClassName}
          data-orb-cookies-link
          target="_blank"
          rel="noopener noreferrer"
        >
          Cookies
        </a>
        <a
          href={ORB_PUBLIC_LEGAL_URLS.support}
          className={linkClassName}
          data-orb-support-link
          target="_blank"
          rel="noopener noreferrer"
        >
          Support
        </a>
      </nav>
    )
  }

  return (
    <nav className={className} aria-label="Legal" data-testid={testId}>
      <Link href="/privacy" className={linkClassName} data-orb-privacy-link>
        Privacy
      </Link>
      <Link href="/terms" className={linkClassName} data-orb-terms-link>
        Terms
      </Link>
    </nav>
  )
}

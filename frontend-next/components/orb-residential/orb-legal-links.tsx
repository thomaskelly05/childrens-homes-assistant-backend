import Link from 'next/link'

export const ORB_DEFAULT_LEGAL_PATHS = {
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  support: '/support'
} as const

export type OrbLegalPaths = typeof ORB_DEFAULT_LEGAL_PATHS

type OrbLegalLinksProps = {
  className?: string
  linkClassName?: string
  testId?: string
  /** Auth/login footer: all four links with separators. In-app: privacy + terms only. */
  variant?: 'auth' | 'in-app'
  legalPaths?: Partial<OrbLegalPaths>
}

const AUTH_LINKS: Array<{ key: keyof OrbLegalPaths; label: string; testId: string }> = [
  { key: 'privacy', label: 'Privacy', testId: 'orb-privacy-link' },
  { key: 'terms', label: 'Terms', testId: 'orb-terms-link' },
  { key: 'cookies', label: 'Cookies', testId: 'orb-cookies-link' },
  { key: 'support', label: 'Support', testId: 'orb-support-link' }
]

/** Shared Privacy, Terms, Cookies and Support links for ORB Residential surfaces. */
export function OrbLegalLinks({
  className = 'orb-legal-links flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs',
  linkClassName = 'font-medium text-[var(--orb-res-primary,#1677ff)] underline-offset-2 hover:underline',
  testId = 'orb-legal-links',
  variant = 'in-app',
  legalPaths
}: OrbLegalLinksProps) {
  const paths = { ...ORB_DEFAULT_LEGAL_PATHS, ...legalPaths }

  if (variant === 'auth') {
    return (
      <nav className={className} aria-label="Legal and support" data-testid={testId}>
        <ul className="flex list-none flex-wrap items-center gap-x-1 gap-y-1 p-0 m-0">
          {AUTH_LINKS.map((item, index) => (
            <li key={item.key} className="inline-flex items-center">
              {index > 0 ? (
                <span className="orb-legal-links-separator mx-2 text-[var(--orb-muted)]" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href={paths[item.key]}
                className={linkClassName}
                data-orb={item.testId}
                data-orb-legal-link={item.key}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <nav className={className} aria-label="Legal" data-testid={testId}>
      <Link href={paths.privacy} className={linkClassName} data-orb-privacy-link>
        Privacy
      </Link>
      <Link href={paths.terms} className={linkClassName} data-orb-terms-link>
        Terms
      </Link>
    </nav>
  )
}

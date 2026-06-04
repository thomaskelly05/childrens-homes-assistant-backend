import Link from 'next/link'

type OrbLegalLinksProps = {
  className?: string
  linkClassName?: string
  testId?: string
}

/** Shared Privacy and Terms links for ORB Residential surfaces. */
export function OrbLegalLinks({
  className = 'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs',
  linkClassName = 'font-medium text-[var(--orb-res-primary,#1677ff)] underline-offset-2 hover:underline',
  testId = 'orb-legal-links'
}: OrbLegalLinksProps) {
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

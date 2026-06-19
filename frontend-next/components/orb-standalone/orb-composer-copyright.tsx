'use client'

import { ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY, ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY } from '@/lib/orb/orb-residential-safety-copy'

/** Subtle professional judgement line under the ORB composer. */
export const ORB_COMPOSER_COPYRIGHT_LINE = `© 2026 IndiCare Intelligence. ${ORB_SUPPORTS_PROFESSIONAL_JUDGEMENT_COPY} ${ORB_DOES_NOT_REPLACE_SAFEGUARDING_COPY}`

export function OrbComposerCopyright({ className = '' }: { className?: string }) {
  return (
    <p
      className={`orb-composer-copyright text-center text-[10px] leading-4 text-[var(--orb-muted)]/75 ${className}`.trim()}
      data-orb-composer-copyright
    >
      {ORB_COMPOSER_COPYRIGHT_LINE}
    </p>
  )
}

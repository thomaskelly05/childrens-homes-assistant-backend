'use client'

/** Subtle professional judgement line under the ORB composer. */
export const ORB_COMPOSER_COPYRIGHT_LINE =
  '© 2026 IndiCare Intelligence. ORB supports professional judgement and does not replace safeguarding procedures.'

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

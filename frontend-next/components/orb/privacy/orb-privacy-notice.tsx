'use client'

import { Shield } from 'lucide-react'

import type { OrbPrivacySurface } from '@/lib/orb/privacy/orb-privacy-types'
import { getOrbDataClassificationNotice } from '@/lib/orb/privacy/orb-data-classification'
import { OrbPrivacyClassificationLink } from './orb-privacy-classification-link'

const SURFACE_TEST_IDS: Record<OrbPrivacySurface, string> = {
  chat: 'orb-chat-privacy-notice',
  voice: 'orb-voice-privacy-notice',
  dictate: 'orb-dictate-context-privacy-notice',
  write: 'orb-write-privacy-notice',
  export: 'orb-export-privacy-notice',
  'privacy-page': 'orb-privacy-page-notice'
}

/** Compact in-context privacy and classification notice for ORB surfaces. */
export function OrbPrivacyNotice({
  surface,
  showClassificationLink = true,
  className = ''
}: {
  surface: OrbPrivacySurface
  showClassificationLink?: boolean
  className?: string
}) {
  const notice = getOrbDataClassificationNotice(surface)

  return (
    <div
      className={`flex flex-wrap items-start gap-x-2 gap-y-1 rounded-lg border border-[var(--orb-line)]/35 bg-[var(--orb-surface)]/50 px-2.5 py-1.5 text-[11px] leading-4 text-[var(--orb-muted)] ${className}`.trim()}
      data-orb-privacy-notice={surface}
      data-testid={SURFACE_TEST_IDS[surface]}
    >
      <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--orb-primary)]" aria-hidden />
      <span className="min-w-0 flex-1">{notice}</span>
      {showClassificationLink ? (
        <span className="shrink-0">
          <OrbPrivacyClassificationLink />
        </span>
      ) : null}
    </div>
  )
}

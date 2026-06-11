'use client'

import { Shield } from 'lucide-react'

import { OrbPrivacyClassificationLink } from '@/components/orb/privacy/orb-privacy-classification-link'
import { getOrbDataClassificationNotice } from '@/lib/orb/privacy/orb-data-classification'
import { ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

const TRUST_STRIP =
  'Session-only transcript · No child profile stored · Adult review required'
const DICTATE_NOTICE = getOrbDataClassificationNotice('dictate')

export function OrbDictatePrivacyStrip() {
  return (
    <div
      className="orb-dictate-privacy-strip shrink-0 rounded-lg border border-[var(--orb-line)]/35 bg-[var(--orb-surface)]/50 px-2.5 py-1"
      data-orb-dictate-privacy-strip
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--orb-muted)]">
        <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--orb-primary)]" aria-hidden />
        <span data-orb-dictate-privacy-trust>{TRUST_STRIP}</span>
        <details className="ml-auto" data-orb-dictate-privacy-detail>
          <summary className="cursor-pointer text-[10px] font-medium text-[var(--orb-primary)] hover:underline">
            View privacy detail
          </summary>
          <div
            className="mt-2 space-y-1 rounded-md border border-[var(--orb-line)]/30 bg-[var(--orb-surface-elevated)]/80 p-2.5 text-[10px] leading-relaxed text-[var(--orb-muted)]"
            data-orb-dictate-privacy-banner
          >
            <p data-orb-dictate-privacy-notice>{DICTATE_NOTICE}</p>
            <p data-orb-dictate-safety-review>{ORB_WRITE_SAFETY_COPY.review}</p>
            <p data-orb-dictate-safety-judgement>{ORB_WRITE_SAFETY_COPY.judgement}</p>
            <p data-orb-dictate-safety-responsibility>{ORB_WRITE_SAFETY_COPY.responsibility}</p>
            <p className="pt-1">
              <OrbPrivacyClassificationLink />
              {' · '}
              <a href="/orb/privacy" className="font-medium text-[var(--orb-primary)] hover:underline" data-orb-dictate-privacy-page-link>
                Full privacy notice
              </a>
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}

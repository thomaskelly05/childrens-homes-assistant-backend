'use client'

import { Shield } from 'lucide-react'

import { OrbPrivacyClassificationLink } from '@/components/orb/privacy/orb-privacy-classification-link'
import { ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP } from '@/lib/orb/orb-residential-copy'

/** Full-width adult-responsibility strip for the Voice station — spans station width, not a boxed card. */
export function OrbVoiceResponsibilityStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`orb-voice-responsibility-strip flex shrink-0 items-center gap-3 border-t border-[var(--orb-line)]/30 px-4 py-2.5 md:px-6 ${className}`.trim()}
      data-orb-voice-responsibility-strip
      data-orb-voice-privacy-strip
      data-orb-voice-privacy
    >
      <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--orb-primary)]" aria-hidden />
      <p
        className="min-w-0 flex-1 text-[10px] leading-relaxed text-[var(--orb-muted)]"
        data-orb-voice-privacy-note
      >
        {ORB_RESIDENTIAL_VOICE_PRIVACY_STRIP}
      </p>
      <OrbPrivacyClassificationLink className="shrink-0 text-[10px] font-medium text-[var(--orb-primary,#1677ff)] hover:underline" />
    </div>
  )
}

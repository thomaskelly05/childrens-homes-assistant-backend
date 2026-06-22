'use client'

import type { ReactNode } from 'react'

import type { OrbVoiceLiveRailTab } from '@/lib/orb/voice-v2/orb-voice-v2-one-screen-workspace.ts'
import type { OrbVoiceV2Intent, OrbVoiceV2Turn } from '@/lib/orb/voice-v2/orb-voice-v2-types.ts'
import {
  ORB_VOICE_V2_ADULT_REVIEW_LABEL,
  ORB_VOICE_V2_SAFETY_FOOTER,
  ORB_VOICE_V2_TRANSCRIPT_LABEL,
  ORB_VOICE_V2_TRANSCRIPT_NOTE
} from '@/lib/orb/voice-v2/orb-voice-v2-copy.ts'

const RAIL_TABS: Array<{ id: OrbVoiceLiveRailTab; label: string }> = [
  { id: 'transcript', label: 'Live transcript' },
  { id: 'summary', label: 'Summary' },
  { id: 'tools', label: 'Recording tools' },
  { id: 'setup', label: 'Voice setup' }
]

export function OrbVoiceLiveRail({
  activeTab,
  onTabChange,
  turns,
  partialTranscript,
  acknowledgement,
  lastIntent,
  specialistActive,
  summaryPanel,
  toolsPanel,
  setupPanel,
  emptyTranscriptHint
}: {
  activeTab: OrbVoiceLiveRailTab
  onTabChange: (tab: OrbVoiceLiveRailTab) => void
  turns: OrbVoiceV2Turn[]
  partialTranscript?: string | null
  acknowledgement?: string | null
  lastIntent?: OrbVoiceV2Intent | null
  specialistActive?: boolean
  summaryPanel?: ReactNode
  toolsPanel?: ReactNode
  setupPanel?: ReactNode
  emptyTranscriptHint?: string
}) {
  return (
    <aside
      className="orb-voice-live-rail orb-voice-live-rail--glass orb-premium-glass orb-premium-rail flex h-full min-h-0 w-full flex-col"
      data-orb-voice-live-rail
      data-orb-voice-live-rail-mounted
    >
      <div
        className="orb-voice-live-rail__tabs flex flex-wrap gap-1.5 px-3 pb-2 pt-3"
        role="tablist"
        aria-label="Voice workspace rail"
      >
        {RAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`orb-voice-live-rail__tab rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide transition ${
              activeTab === tab.id
                ? 'bg-[var(--orb-primary-blue,#168bff)]/10 text-[var(--orb-foreground)]'
                : 'text-[var(--orb-muted)] hover:bg-[var(--orb-line)]/10 hover:text-[var(--orb-foreground)]'
            }`}
            onClick={() => onTabChange(tab.id)}
            data-orb-voice-live-rail-tab={tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="orb-voice-live-rail__body min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">
        {activeTab === 'transcript' ? (
          <section data-orb-voice-conversation-panel data-orb-voice-v2-transcript>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-[var(--orb-foreground)]">{ORB_VOICE_V2_TRANSCRIPT_LABEL}</p>
              {specialistActive ? (
                <span
                  className="rounded-full bg-[var(--orb-primary-blue,#168bff)]/8 px-2 py-0.5 text-[9px] font-medium text-[var(--orb-muted)]"
                  data-orb-voice-intent-badge
                  data-orb-voice-specialist-badge
                >
                  Residential childcare brain
                </span>
              ) : null}
              {lastIntent ? (
                <span
                  className="rounded-full border border-[var(--orb-line)]/40 px-2 py-0.5 text-[9px] text-[var(--orb-muted)]"
                  data-orb-voice-intent-label={lastIntent}
                >
                  {lastIntent.replace(/_/g, ' ')}
                </span>
              ) : null}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-[var(--orb-muted)]">{ORB_VOICE_V2_TRANSCRIPT_NOTE}</p>
            <div className="space-y-4" data-orb-voice-turns>
              {turns.length === 0 && !acknowledgement ? (
                <p className="text-sm leading-relaxed text-[var(--orb-muted)]" data-orb-voice-transcript-empty>
                  {emptyTranscriptHint ?? 'Your conversation will appear here as you talk with ORB.'}
                </p>
              ) : null}
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  data-orb-voice-turn={turn.role}
                  data-orb-voice-turn-interrupted={turn.interrupted ? true : undefined}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    {turn.role === 'adult' ? 'Adult' : 'ORB'}
                    {turn.interrupted ? ' · interrupted' : ''}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--orb-foreground)] whitespace-pre-wrap">{turn.text}</p>
                </div>
              ))}
              {partialTranscript ? (
                <div data-orb-voice-turn="adult" data-orb-voice-partial-transcript>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Adult · live</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--orb-foreground)] opacity-80 whitespace-pre-wrap">
                    {partialTranscript}
                  </p>
                </div>
              ) : null}
              {acknowledgement ? (
                <div data-orb-voice-turn="orb" data-orb-voice-acknowledgement-rail>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">ORB</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--orb-foreground)] italic">{acknowledgement}</p>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-[var(--orb-muted)]" data-orb-voice-safety-note>
              {ORB_VOICE_V2_SAFETY_FOOTER}
            </p>
          </section>
        ) : null}

        {activeTab === 'summary' ? (
          <section data-orb-voice-summary-panel data-orb-voice-summary-integrated>
            {summaryPanel ?? (
              <p className="text-xs text-[var(--orb-muted)]">
                End and summarise when you are ready. Summary appears here for adult review.
              </p>
            )}
            <p
              className="mt-3 inline-flex rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]"
              data-orb-voice-adult-review-label
            >
              {ORB_VOICE_V2_ADULT_REVIEW_LABEL}
            </p>
          </section>
        ) : null}

        {activeTab === 'tools' ? <div data-orb-voice-recording-tools>{toolsPanel}</div> : null}

        {activeTab === 'setup' ? (
          <section data-orb-voice-setup-rail data-orb-voice-setup-panel>
            {setupPanel ?? (
              <p className="text-sm leading-relaxed text-[var(--orb-muted)]">
                Choose purpose, voice and personality for this session.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </aside>
  )
}

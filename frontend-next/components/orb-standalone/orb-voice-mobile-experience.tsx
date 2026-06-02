'use client'

import { useState } from 'react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import { isOrbVoiceDebugMode } from '@/lib/orb/orb-voice-debug'
import {
  ORB_VOICE_MODES,
  ORB_VOICE_PRESETS,
  type OrbVoiceModeId,
  type OrbVoicePresetId,
  type VoiceTurn
} from '@/lib/orb/voice/orb-voice-types'
import { orbVoiceUnavailablePresentation } from '@/lib/orb/voice/orb-voice-user-messages'

export function OrbVoiceMobileExperience({
  orbVisualClassName,
  pulseOrb,
  mobileStatus,
  unavailableDetail,
  showRealtimeUnavailable,
  showAllowMicrophone,
  onAllowMicrophone,
  transcriptAvailable,
  turns,
  voiceDebug,
  developerMode,
  onTestMicrophone,
  voiceSessionLive,
  voiceStarting,
  mobilePrimaryLabel,
  startDisabled,
  onPrimaryClick,
  onOpenDictate,
  onTypeInstead,
  onClose,
  voiceMode,
  onVoiceModeChange,
  voicePresetId,
  onVoicePresetChange,
  onNewConversation,
  dictateRealtimeReady,
  sessionDetail
}: {
  orbVisualClassName: string
  pulseOrb: boolean
  mobileStatus: string
  unavailableDetail: string
  showRealtimeUnavailable: boolean
  showAllowMicrophone: boolean
  onAllowMicrophone: () => void
  transcriptAvailable: boolean
  turns: VoiceTurn[]
  voiceDebug: boolean
  developerMode: boolean
  onTestMicrophone: () => void
  voiceSessionLive: boolean
  voiceStarting: boolean
  mobilePrimaryLabel: string
  startDisabled: boolean
  onPrimaryClick: () => void
  onOpenDictate?: (transcript: string) => void
  onTypeInstead?: () => void
  onClose: () => void
  voiceMode: OrbVoiceModeId
  onVoiceModeChange: (mode: OrbVoiceModeId) => void
  voicePresetId: OrbVoicePresetId
  onVoicePresetChange: (preset: OrbVoicePresetId) => void
  onNewConversation: () => void
  dictateRealtimeReady?: boolean
  sessionDetail?: string | null
}) {
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false)
  const unavailableCopy = orbVoiceUnavailablePresentation({
    debug: voiceDebug,
    dictateRealtimeReady: dictateRealtimeReady
  })
  const postSession = transcriptAvailable && !voiceSessionLive && !showRealtimeUnavailable

  return (
    <div className="orb-voice-mobile flex min-h-0 flex-1 flex-col md:hidden" data-orb-voice-mobile>
      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden px-4 pt-4 pb-2">
        <GlassOrbMark size="voiceMobile" pulse={pulseOrb} className={orbVisualClassName} />

        <button
          type="button"
          className="mt-4 rounded-full border border-[var(--orb-mobile-line,var(--orb-line))]/50 px-3 py-1 text-[10px] text-[var(--orb-muted)]"
          onClick={() => setVoiceSettingsOpen((o) => !o)}
          data-orb-voice-settings-chip
          aria-expanded={voiceSettingsOpen}
        >
          Voice settings
        </button>
        {voiceSettingsOpen ? (
          <div className="mt-2 flex w-full max-w-xs flex-wrap justify-center gap-2" data-orb-voice-settings-panel>
            <select
              value={voiceMode}
              onChange={(e) => onVoiceModeChange(e.target.value as OrbVoiceModeId)}
              className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-mobile-card,var(--orb-surface-elevated))] px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              aria-label="Voice mode"
            >
              {ORB_VOICE_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </select>
            <select
              value={voicePresetId}
              onChange={(e) => onVoicePresetChange(e.target.value as OrbVoicePresetId)}
              className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-mobile-card,var(--orb-surface-elevated))] px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
              aria-label="Voice profile"
            >
              {ORB_VOICE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <p className="mt-4 text-center text-sm font-medium text-[var(--orb-text,var(--orb-foreground))]" data-orb-voice-status-label>
          {showRealtimeUnavailable ? unavailableCopy.headline : mobileStatus}
        </p>
        <p className="mt-1 text-center text-xs text-[var(--orb-muted)]" data-orb-voice-detail>
          {showRealtimeUnavailable ? unavailableCopy.detail : sessionDetail || unavailableDetail}
        </p>

        {showAllowMicrophone ? (
          <button
            type="button"
            onClick={onAllowMicrophone}
            className="mt-3 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-800 dark:text-sky-100"
            data-orb-voice-allow-mic
          >
            Allow microphone
          </button>
        ) : null}

        {transcriptAvailable ? (
          <div className="orb-voice-transcript mt-5 w-full max-w-md space-y-2" data-orb-voice-transcript>
            {turns
              .filter((line) => line.role === 'user' || line.role === 'assistant')
              .map((line) => (
                <div
                  key={line.id}
                  className={`rounded-2xl border px-3 py-2.5 ${
                    line.role === 'user'
                      ? 'ml-6 border-[var(--orb-line)]/40 bg-[var(--orb-primary-soft)]/40'
                      : 'mr-6 border-[var(--orb-line)]/40 bg-[var(--orb-mobile-card,var(--orb-surface-elevated))]'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#168bff]">
                    {line.role === 'user' ? 'You' : 'ORB'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--orb-foreground)]">{line.text}</p>
                </div>
              ))}
          </div>
        ) : null}

        {developerMode || voiceDebug ? (
          <button
            type="button"
            className="mt-3 text-[10px] text-[var(--orb-muted)] underline"
            onClick={onTestMicrophone}
            data-orb-voice-diagnostics
          >
            Diagnostics · test microphone
          </button>
        ) : null}
      </div>

      <div
        className="orb-voice-mobile__controls shrink-0 space-y-2 border-t border-[var(--orb-line)]/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        data-orb-voice-mobile-controls
      >
        {showRealtimeUnavailable ? (
          <div className="flex flex-col gap-2" data-orb-voice-fallbacks>
            {onOpenDictate ? (
              <button
                type="button"
                data-orb-voice-open-dictate
                onClick={() => onOpenDictate('')}
                className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white"
              >
                Open Dictate
              </button>
            ) : null}
            <button
              type="button"
              data-orb-voice-type-instead
              onClick={() => {
                onTypeInstead?.()
                onClose()
              }}
              className="w-full rounded-full border border-[var(--orb-line)] py-2.5 text-sm text-[var(--orb-muted)]"
            >
              Type instead
            </button>
          </div>
        ) : postSession ? (
          <div className="flex flex-col gap-2" data-orb-voice-post-session>
            {onOpenDictate ? (
              <button
                type="button"
                data-orb-voice-to-dictate
                className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm text-[var(--orb-primary)]"
                onClick={() =>
                  onOpenDictate(
                    turns
                      .filter((t) => t.role === 'user' || t.role === 'assistant')
                      .map((t) => `${t.role === 'user' ? 'You' : 'ORB'}: ${t.text.trim()}`)
                      .join('\n\n')
                  )
                }
              >
                Send transcript to Dictate
              </button>
            ) : null}
            <button
              type="button"
              data-orb-voice-copy-transcript
              className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm text-[var(--orb-foreground)]"
              onClick={() =>
                void copyTextToClipboard(
                  turns
                    .filter((t) => t.role === 'user' || t.role === 'assistant')
                    .map((t) => `${t.role === 'user' ? 'You' : 'ORB'}: ${t.text.trim()}`)
                    .join('\n\n')
                )
              }
            >
              Copy transcript
            </button>
            <button
              type="button"
              data-orb-voice-new-conversation
              className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white"
              onClick={onNewConversation}
            >
              New conversation
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-orb-voice-primary-action
            disabled={voiceStarting || (mobilePrimaryLabel === 'Start' && startDisabled)}
            onClick={onPrimaryClick}
            className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-50"
          >
            {voiceStarting ? 'Connecting…' : mobilePrimaryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

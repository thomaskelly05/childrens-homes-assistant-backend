'use client'

import { useCallback, useMemo, useState } from 'react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbVoiceStationContent } from '@/components/orb-standalone/orb-voice-station-content'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import {
  ORB_VOICE_PANEL_MOBILE_SUBTITLE,
  ORB_VOICE_PANEL_SUBTITLE,
  ORB_VOICE_PANEL_TITLE
} from '@/lib/orb/voice/orb-voice-launch-mode'
import { createOrbSavedOutput } from '@/lib/orb/standalone-client'
import {
  ORB_VOICE_V2_ADULT_REVIEW_LABEL,
  ORB_VOICE_V2_CONTINUE_CONVERSATION,
  ORB_VOICE_V2_CONTINUE_WITHOUT_VOICE,
  ORB_VOICE_V2_MODES,
  ORB_VOICE_V2_MODE_PROMPT,
  ORB_VOICE_V2_SAFETY_FOOTER,
  ORB_VOICE_V2_SEND_TYPED,
  ORB_VOICE_V2_TRANSCRIPT_LABEL,
  ORB_VOICE_V2_TRANSCRIPT_NOTE,
  ORB_VOICE_V2_TYPE_INSTEAD,
  ORB_VOICE_V2_TYPE_PLACEHOLDER
} from '@/lib/orb/voice-v2/orb-voice-v2-copy.ts'
import { mapOrbVoiceV2ToCompanionState, orbVoiceV2PrimaryLabel } from '@/lib/orb/voice-v2/orb-voice-v2-state.ts'
import { useOrbVoiceV2 } from '@/lib/orb/voice-v2/use-orb-voice-v2.ts'

export function OrbVoiceStation({
  open,
  onClose,
  isSignedIn = true,
  onSignIn,
  onOpenDictate,
  onOpenWrite,
  onOpenVoiceSettings
}: {
  open: boolean
  onClose: () => void
  isSignedIn?: boolean
  onSignIn?: () => void
  onOpenDictate?: (
    transcript: string,
    noteType?: import('@/lib/orb/dictate/orb-dictate-types').OrbDictateNoteType,
    opts?: { studio?: boolean }
  ) => void
  onOpenWrite?: (content: string, opts?: { title?: string; recordTypeId?: string }) => void
  onOpenVoiceSettings?: () => void
}) {
  const isMobileViewport = useOrbMobileViewport()
  const voice = useOrbVoiceV2(open)
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const conversationLive = voice.state !== 'idle' && voice.state !== 'summary_ready'
  const workspaceMode =
    voice.state === 'summary_ready' ? 'after_call' : conversationLive ? 'live' : 'idle'

  const companionState = mapOrbVoiceV2ToCompanionState(voice.state)
  const statusLine = voice.autoResumeBlocked
    ? ORB_VOICE_V2_CONTINUE_CONVERSATION
    : orbVoiceV2PrimaryLabel(voice.state)
  const primaryDisabled =
    !isSignedIn ||
    voice.state === 'requesting_microphone' ||
    voice.state === 'transcribing' ||
    voice.state === 'thinking'

  const handleClose = useCallback(() => {
    voice.resetLiveSession()
    onClose()
  }, [onClose, voice])

  const handlePrimary = useCallback(() => {
    if (!isSignedIn) {
      onSignIn?.()
      return
    }
    if (voice.autoResumeBlocked) {
      void voice.continueConversation()
      return
    }
    if (voice.state === 'idle' || voice.state === 'summary_ready') {
      void voice.startConversation()
      return
    }
    if (voice.state === 'paused') {
      void voice.continueConversation()
    }
  }, [isSignedIn, onSignIn, voice])

  const handleCopySummary = useCallback(async () => {
    if (!voice.summary) return
    try {
      await navigator.clipboard.writeText(voice.summary)
      setSaveNotice('Summary copied.')
    } catch {
      setSaveNotice('Could not copy summary.')
    }
  }, [voice.summary])

  const handleSaveReflection = useCallback(async () => {
    if (!voice.summary || !voice.handoffPayload) return
    setSaving(true)
    setSaveNotice(null)
    try {
      await createOrbSavedOutput({
        title: 'ORB Voice reflection',
        type: 'voice_transcript',
        content_markdown: voice.summary,
        metadata: { ...voice.handoffPayload },
        created_from: 'orb_voice_v2'
      })
      setSaveNotice('Reflection saved.')
    } catch {
      setSaveNotice('Could not save reflection.')
    } finally {
      setSaving(false)
    }
  }, [voice.handoffPayload, voice.summary])

  const modeSelector = (
    <div className="w-full max-w-sm" data-orb-voice-mode-selector>
      <label className="block text-xs font-medium text-[var(--orb-muted)]" htmlFor="orb-voice-v2-mode">
        {ORB_VOICE_V2_MODE_PROMPT}
      </label>
      <select
        id="orb-voice-v2-mode"
        className="mt-1 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
        value={voice.mode}
        disabled={conversationLive}
        onChange={(event) => voice.setMode(event.target.value as (typeof ORB_VOICE_V2_MODES)[number]['id'])}
        data-orb-voice-v2-mode-select
      >
        {ORB_VOICE_V2_MODES.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
    </div>
  )

  const transcriptPanel = useMemo(() => {
    if (voice.turns.length === 0 && voice.state !== 'summary_ready') return null
    return (
      <section className="space-y-3" data-orb-voice-conversation-panel data-orb-voice-v2-transcript>
        <div>
          <p className="text-sm font-semibold text-[var(--orb-foreground)]">{ORB_VOICE_V2_TRANSCRIPT_LABEL}</p>
          <p className="text-xs text-[var(--orb-muted)]">{ORB_VOICE_V2_TRANSCRIPT_NOTE}</p>
        </div>
        <div className="space-y-3 rounded-2xl border border-[var(--orb-line)]/50 p-3" data-orb-voice-turns>
          {voice.turns.map((turn) => (
            <div key={turn.id} data-orb-voice-turn={turn.role}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                {turn.role === 'adult' ? 'Adult' : 'ORB'}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--orb-foreground)] whitespace-pre-wrap">{turn.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--orb-muted)]" data-orb-voice-safety-note>
          {ORB_VOICE_V2_SAFETY_FOOTER}
        </p>
      </section>
    )
  }, [voice.state, voice.turns])

  const summaryPanel =
    voice.state === 'summary_ready' && voice.summary ? (
      <section className="space-y-4" data-orb-voice-summary-panel data-orb-voice-summary-ready>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]" data-orb-voice-adult-review-label>
          {ORB_VOICE_V2_ADULT_REVIEW_LABEL}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--orb-foreground)]">{voice.summary}</p>
        {saveNotice ? (
          <p className="text-xs text-[var(--orb-muted)]" role="status">
            {saveNotice}
          </p>
        ) : null}
        <div className="flex flex-col gap-2" data-orb-voice-summary-actions>
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium"
            onClick={() => void handleCopySummary()}
            data-orb-voice-copy-summary
          >
            Copy summary
          </button>
          {onOpenDictate ? (
            <button
              type="button"
              className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-2.5 text-sm font-semibold text-white"
              onClick={() => onOpenDictate(voice.summary ?? '', undefined, { studio: false })}
              data-orb-voice-send-to-dictate
            >
              Send to Dictate
            </button>
          ) : null}
          {onOpenWrite ? (
            <button
              type="button"
              className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium"
              onClick={() => onOpenWrite(voice.summary ?? '', { title: 'ORB Voice reflection summary' })}
              data-orb-voice-open-write
            >
              Open in ORB Write
            </button>
          ) : null}
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={() => void handleSaveReflection()}
            disabled={saving}
            data-orb-voice-save-reflection
          >
            {saving ? 'Saving…' : 'Save reflection'}
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm font-medium"
            onClick={() => {
              voice.resetLiveSession()
              setSaveNotice(null)
            }}
            data-orb-voice-start-new
          >
            Start new conversation
          </button>
        </div>
      </section>
    ) : null

  const sidePanel = summaryPanel ?? transcriptPanel

  const secondaryControls =
    conversationLive || voice.state === 'paused' || voice.autoResumeBlocked ? (
      <div className="flex flex-wrap items-center justify-center gap-2" data-orb-voice-secondary-controls>
        {voice.state === 'paused' || voice.autoResumeBlocked ? (
          <button
            type="button"
            className="orb-liquid-button rounded-full px-4 py-2 text-xs"
            onClick={() => void voice.continueConversation()}
            data-orb-voice-resume
            data-orb-voice-continue-conversation
          >
            {voice.autoResumeBlocked ? ORB_VOICE_V2_CONTINUE_CONVERSATION : 'Resume'}
          </button>
        ) : (
          <button type="button" className="orb-liquid-button rounded-full px-4 py-2 text-xs" onClick={voice.pauseConversation} data-orb-voice-pause>
            Pause
          </button>
        )}
        <button type="button" className="orb-liquid-button rounded-full px-4 py-2 text-xs" onClick={voice.stopOrbAudio} data-orb-voice-stop-orb>
          Stop ORB
        </button>
        <button type="button" className="orb-liquid-button rounded-full px-4 py-2 text-xs" onClick={voice.resetLiveSession} data-orb-voice-reset>
          Reset
        </button>
        <button type="button" className="orb-liquid-button rounded-full px-4 py-2 text-xs" onClick={voice.endAndSummarise} data-orb-voice-end-summarise>
          End and summarise
        </button>
        {onOpenVoiceSettings ? (
          <button type="button" className="orb-liquid-button rounded-full px-4 py-2 text-xs" onClick={onOpenVoiceSettings} data-orb-voice-settings-chip>
            Voice settings
          </button>
        ) : null}
      </div>
    ) : null

  return (
    <OrbAppModal
      open={open}
      title={ORB_VOICE_PANEL_TITLE}
      subtitle={isMobileViewport ? ORB_VOICE_PANEL_MOBILE_SUBTITLE : ORB_VOICE_PANEL_SUBTITLE}
      onClose={handleClose}
      panelId="voice"
      size="wide"
      presentation="workspace"
      headerActions={
        onOpenVoiceSettings ? (
          <button
            type="button"
            onClick={onOpenVoiceSettings}
            className="orb-liquid-button rounded-full border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)]"
            data-orb-voice-settings-chip
          >
            Voice settings
          </button>
        ) : null
      }
    >
      <div
        className="orb-voice-room pointer-events-auto flex min-h-0 flex-1 flex-col"
        data-orb-voice-station
        data-orb-voice-v2
        data-orb-voice-ui-state={voice.state}
        data-orb-voice-permission-state={voice.permissionState}
        data-orb-voice-auto-resume-blocked={voice.autoResumeBlocked ? true : undefined}
      >
        <OrbVoiceStationContent
          companionState={companionState}
          statusLine={statusLine}
          detailLine={voice.detailLine}
          workspaceMode={workspaceMode}
          sidePanel={sidePanel}
          secondaryControls={secondaryControls}
          controls={
            workspaceMode === 'after_call' ? null : (
              <div className="flex w-full max-w-sm flex-col items-center gap-2">
                {voice.voicePreparingSkipAvailable && voice.voicePreparing ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--orb-primary-blue,#168bff)] underline"
                    onClick={voice.continueWithoutVoice}
                    data-orb-voice-continue-without-voice
                  >
                    {ORB_VOICE_V2_CONTINUE_WITHOUT_VOICE}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="orb-liquid-button w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={primaryDisabled}
                  onClick={handlePrimary}
                  data-orb-voice-primary
                  data-orb-voice-start-conversation={voice.autoResumeBlocked ? undefined : true}
                  data-orb-voice-continue-conversation={voice.autoResumeBlocked ? true : undefined}
                >
                  {statusLine}
                </button>
              </div>
            )
          }
        >
          {workspaceMode === 'idle' ? modeSelector : null}
        </OrbVoiceStationContent>

        {voice.showTypeFallback ? (
          <div className="mx-auto w-full max-w-lg px-4 pb-4" data-orb-voice-type-fallback>
            <p className="text-xs font-medium text-[var(--orb-muted)]">{ORB_VOICE_V2_TYPE_INSTEAD}</p>
            <textarea
              className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] p-3 text-sm"
              rows={3}
              placeholder={ORB_VOICE_V2_TYPE_PLACEHOLDER}
              value={voice.typedDraft}
              onChange={(event) => voice.setTypedDraft(event.target.value)}
              data-orb-voice-type-input
            />
            <button
              type="button"
              className="mt-2 rounded-full bg-[var(--orb-primary-blue,#168bff)] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => void voice.sendTypedTurn()}
              data-orb-voice-type-send
            >
              {ORB_VOICE_V2_SEND_TYPED}
            </button>
          </div>
        ) : null}
      </div>
    </OrbAppModal>
  )
}

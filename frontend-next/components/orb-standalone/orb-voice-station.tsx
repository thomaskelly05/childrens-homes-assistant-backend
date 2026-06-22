'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbVoiceLiveRail } from '@/components/orb-standalone/orb-voice-live-rail'
import { OrbVoiceStationContent } from '@/components/orb-standalone/orb-voice-station-content'
import { OrbVoiceV2Carousel } from '@/components/orb-standalone/orb-voice-v2-carousel'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import {
  ORB_VOICE_PANEL_MOBILE_SUBTITLE,
  ORB_VOICE_PANEL_SUBTITLE,
  ORB_VOICE_PANEL_TITLE
} from '@/lib/orb/voice/orb-voice-launch-mode'
import { createOrbSavedOutput } from '@/lib/orb/standalone-client'
import { buildSavedOutputCreateBody } from '@/lib/orb/orb-saved-output-adapters'
import {
  ORB_VOICE_V2_ADULT_REVIEW_LABEL,
  ORB_VOICE_V2_CONTINUE_CONVERSATION,
  ORB_VOICE_V2_CONTINUE_WITHOUT_VOICE,
  ORB_VOICE_V2_PLAY_ORB_VOICE,
  ORB_VOICE_V2_SAVE_FAILED,
  ORB_VOICE_V2_SAVE_TO_RECORDS,
  ORB_VOICE_V2_SEND_TYPED,
  ORB_VOICE_V2_SUMMARY_REVIEW_NOTE,
  ORB_VOICE_V2_SUMMARY_TITLE,
  ORB_VOICE_V2_TYPE_INSTEAD,
  ORB_VOICE_V2_TYPE_PLACEHOLDER
} from '@/lib/orb/voice-v2/orb-voice-v2-copy.ts'
import {
  isOrbVoiceV2SpecialistTier,
  orbVoiceV2PrimaryActionLabel,
  type OrbVoiceLiveRailTab
} from '@/lib/orb/voice-v2/orb-voice-v2-one-screen-workspace.ts'
import {
  ORB_VOICE_V2_PERSONALITY_OPTIONS,
  ORB_VOICE_V2_PURPOSE_MODES,
  ORB_VOICE_V2_VOICE_OPTIONS
} from '@/lib/orb/voice-v2/orb-voice-v2-showstopper.ts'
import type { OrbVoiceV2Mode, OrbVoiceV2PersonalityId, OrbVoiceV2VoiceId } from '@/lib/orb/voice-v2/orb-voice-v2-types.ts'
import { mapOrbVoiceV2ToCompanionState, ORB_VOICE_V2_STATUS_LABEL } from '@/lib/orb/voice-v2/orb-voice-v2-state.ts'
import { traceOrbVoiceV2StartClick } from '@/lib/orb/voice-v2/orb-voice-v2-click-trace.ts'
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
  const [railTab, setRailTab] = useState<OrbVoiceLiveRailTab>('transcript')
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false)

  const sessionStarted = voice.state !== 'idle'
  const conversationLive = voice.state !== 'idle' && voice.state !== 'summary_ready'
  const companionState = mapOrbVoiceV2ToCompanionState(voice.state)
  const statusLine = voice.autoResumeBlocked
    ? ORB_VOICE_V2_CONTINUE_CONVERSATION
    : ORB_VOICE_V2_STATUS_LABEL[voice.state] ?? 'Ready'
  const primaryLabel = orbVoiceV2PrimaryActionLabel(voice.state, {
    speaking: voice.state === 'speaking',
    voicePreparing: voice.voicePreparing,
    micRetry: voice.state === 'error' && voice.showTypeFallback
  })
  const primaryDisabled =
    voice.state === 'requesting_microphone' ||
    voice.state === 'transcribing' ||
    voice.state === 'thinking'
  const primaryIdleReady = voice.state === 'idle' && isSignedIn

  useEffect(() => {
    if (voice.state === 'summary_ready') setRailTab('summary')
  }, [voice.state])

  const handleClose = useCallback(() => {
    voice.resetLiveSession()
    onClose()
  }, [onClose, voice])

  const handlePrimary = useCallback(() => {
    traceOrbVoiceV2StartClick({
      currentState: voice.state,
      buttonDisabled: primaryDisabled,
      audioUnlocked: voice.audioUnlocked,
      permissionState: voice.permissionState
    })
    if (!isSignedIn) {
      onSignIn?.()
      return
    }
    if (voice.state === 'speaking' || voice.voicePreparing) {
      void voice.bargeIn('mic')
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
    if (voice.state === 'error' && voice.showTypeFallback) {
      void voice.retryMicrophone()
      return
    }
    if (voice.state === 'paused') {
      void voice.continueConversation()
    }
  }, [isSignedIn, onSignIn, primaryDisabled, voice])

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
    const packet = voice.reflectionPacket ?? voice.handoffPayload
    const sections = voice.reflectionPacket?.sections
    const sectionEntries = sections
      ? [
          ...(sections.whatHappened
            ? [
                { title: 'What happened', body: sections.whatHappened },
                { title: 'Child’s voice or presentation', body: sections.childVoiceOrPresentation ?? '—' },
                { title: 'Adult response', body: sections.adultResponse ?? '—' }
              ]
            : [
                { title: 'What was discussed', body: sections.whatWasDiscussed },
                { title: 'Key reflections', body: sections.keyReflections }
              ]),
          { title: 'What may need recording', body: sections.whatMayNeedRecording },
          { title: 'Follow-up / oversight', body: sections.followUpOrOversight }
        ]
      : undefined
    const body = buildSavedOutputCreateBody({
      title: 'Voice reflection',
      type: 'voice_transcript',
      summary: voice.summary.slice(0, 800),
      content_markdown: voice.summary,
      created_from: 'orb_voice_v2',
      extras: {
        source_feature: 'voice',
        adult_review_status: 'generated_for_adult_review',
        source_text: voice.handoffPayload.conversationTranscript,
        sections: sectionEntries
      }
    })
    try {
      await createOrbSavedOutput({
        ...body,
        metadata: {
          ...body.metadata,
          voice_reflection_packet: packet,
          ...voice.handoffPayload
        }
      })
      setSaveNotice('Saved to Records & Drafts.')
    } catch {
      setSaveNotice(ORB_VOICE_V2_SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }, [voice.handoffPayload, voice.reflectionPacket, voice.summary])

  const purposeLabel = ORB_VOICE_V2_PURPOSE_MODES.find((m) => m.id === voice.mode)?.label ?? 'Talk it through'
  const personalityLabel =
    ORB_VOICE_V2_PERSONALITY_OPTIONS.find((p) => p.id === voice.personality)?.label ?? 'Reflective'
  const voiceLabel = ORB_VOICE_V2_VOICE_OPTIONS.find((v) => v.id === voice.selectedVoice)?.label ?? 'Katherine'

  const preferenceBadges = sessionStarted ? (
    <div className="flex flex-wrap items-center justify-center gap-1.5" data-orb-voice-preference-badges>
      <span className="rounded-full border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]">
        {purposeLabel}
      </span>
      <span className="rounded-full border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]">
        {voiceLabel}
      </span>
      <span className="rounded-full border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]">
        {personalityLabel}
      </span>
      <button
        type="button"
        className="text-[10px] font-medium text-[var(--orb-primary-blue,#168bff)]"
        onClick={() => setVoiceSettingsOpen((current) => !current)}
        data-orb-voice-settings-toggle
      >
        {voiceSettingsOpen ? 'Hide setup' : 'Voice setup'}
      </button>
    </div>
  ) : (
    <div className="flex flex-wrap items-center justify-center gap-2" data-orb-voice-idle-preferences>
      <span
        className="rounded-full border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-2.5 py-0.5 text-[10px] text-[var(--orb-muted)]"
        data-orb-voice-purpose-badge
      >
        {purposeLabel}
      </span>
      <button
        type="button"
        className="rounded-full border border-[var(--orb-line)]/40 px-2.5 py-0.5 text-[10px] font-medium text-[var(--orb-primary-blue,#168bff)]"
        onClick={() => setVoiceSettingsOpen((current) => !current)}
        data-orb-voice-settings-toggle
      >
        {voiceSettingsOpen ? 'Hide voice setup' : 'Voice setup'}
      </button>
    </div>
  )

  const preferenceControls = voiceSettingsOpen ? (
    <div className="flex w-full max-w-sm flex-col gap-3" data-orb-voice-v2-preferences data-orb-voice-setup-panel>
      <OrbVoiceV2Carousel
        label="Purpose"
        items={ORB_VOICE_V2_PURPOSE_MODES}
        value={voice.mode}
        disabled={conversationLive}
        onChange={(id) => voice.setMode(id as OrbVoiceV2Mode)}
        dataAttr="purpose"
      />
      <OrbVoiceV2Carousel
        label="Voice"
        items={ORB_VOICE_V2_VOICE_OPTIONS.map((entry) => ({
          id: entry.id,
          label: entry.label,
          description: entry.configured ? entry.description : `${entry.description} (preference)`
        }))}
        value={voice.selectedVoice}
        disabled={conversationLive}
        onChange={(id) => voice.setSelectedVoice(id as OrbVoiceV2VoiceId)}
        dataAttr="voice"
      />
      <OrbVoiceV2Carousel
        label="Personality"
        items={ORB_VOICE_V2_PERSONALITY_OPTIONS}
        value={voice.personality}
        disabled={conversationLive}
        onChange={(id) => voice.setPersonality(id as OrbVoiceV2PersonalityId)}
        dataAttr="personality"
      />
    </div>
  ) : null

  const summaryBody = useMemo(() => {
    if (!voice.summary) return null
    return (
      <div className="space-y-3" data-orb-voice-summary-ready>
        <p className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-voice-summary-title>
          {ORB_VOICE_V2_SUMMARY_TITLE}
        </p>
        <p className="text-xs text-[var(--orb-muted)]" data-orb-voice-summary-review-note>
          {ORB_VOICE_V2_SUMMARY_REVIEW_NOTE}
        </p>
        {voice.reflectionPacket?.sections ? (
          <div className="space-y-3 rounded-xl border border-[var(--orb-line)]/40 p-2.5" data-orb-voice-summary-sections>
            {voice.reflectionPacket.sections.youngPeopleInvolved ? (
              <>
                <div data-orb-voice-summary-section="young-people-involved">
                  <p className="text-xs font-semibold">Young people involved</p>
                  <p className="mt-1 text-sm leading-6">{voice.reflectionPacket.sections.youngPeopleInvolved}</p>
                </div>
                <div data-orb-voice-summary-section="observed-reported">
                  <p className="text-xs font-semibold">What was observed or reported</p>
                  <p className="mt-1 text-sm leading-6">{voice.reflectionPacket.sections.observedOrReported}</p>
                </div>
              </>
            ) : voice.reflectionPacket.sections.whatHappened ? (
              <div data-orb-voice-summary-section="what-happened">
                <p className="text-xs font-semibold">What happened</p>
                <p className="mt-1 text-sm leading-6">{voice.reflectionPacket.sections.whatHappened}</p>
              </div>
            ) : null}
            <div data-orb-voice-summary-section="recording">
              <p className="text-xs font-semibold">What may need recording</p>
              <p className="mt-1 text-sm leading-6">{voice.reflectionPacket.sections.whatMayNeedRecording}</p>
            </div>
            <div data-orb-voice-summary-section="follow-up">
              <p className="text-xs font-semibold">Follow-up / oversight</p>
              <p className="mt-1 text-sm leading-6">{voice.reflectionPacket.sections.followUpOrOversight}</p>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6">{voice.summary}</p>
        )}
        <p
          className="inline-flex rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]"
          data-orb-voice-adult-review-label
        >
          {ORB_VOICE_V2_ADULT_REVIEW_LABEL}
        </p>
      </div>
    )
  }, [voice.reflectionPacket, voice.summary])

  const toolsPanel = (
    <div className="flex flex-col gap-2" data-orb-voice-tools-panel data-orb-voice-summary-actions>
      <button
        type="button"
        className="w-full rounded-full border border-[var(--orb-line)]/60 py-2 text-xs font-medium"
        onClick={voice.endAndSummarise}
        data-orb-voice-end-summarise
      >
        End and summarise
      </button>
      {voice.summary ? (
        <>
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2 text-xs font-medium"
            onClick={() => void handleCopySummary()}
            data-orb-voice-copy-summary
          >
            Copy summary
          </button>
          {onOpenDictate ? (
            <button
              type="button"
              className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-2 text-xs font-semibold text-white"
              onClick={() => onOpenDictate(voice.summary ?? '', undefined, { studio: false })}
              data-orb-voice-send-to-dictate
            >
              Send to Dictate
            </button>
          ) : null}
          {onOpenWrite ? (
            <button
              type="button"
              className="w-full rounded-full border border-[var(--orb-line)]/60 py-2 text-xs font-medium"
              onClick={() => onOpenWrite(voice.summary ?? '', { title: ORB_VOICE_V2_SUMMARY_TITLE })}
              data-orb-voice-open-write
            >
              Open in ORB Write
            </button>
          ) : null}
          <button
            type="button"
            className="w-full rounded-full border border-[var(--orb-line)]/60 py-2 text-xs font-medium disabled:opacity-50"
            onClick={() => void handleSaveReflection()}
            disabled={saving}
            data-orb-voice-save-reflection
            data-orb-voice-save-records-drafts
          >
            {saving ? 'Saving…' : ORB_VOICE_V2_SAVE_TO_RECORDS}
          </button>
        </>
      ) : null}
      {saveNotice ? (
        <p className="text-xs text-[var(--orb-muted)]" role="status" data-orb-voice-save-notice>
          {saveNotice}
        </p>
      ) : null}
      {onOpenVoiceSettings ? (
        <button
          type="button"
          className="w-full rounded-full border border-[var(--orb-line)]/60 py-2 text-xs font-medium"
          onClick={onOpenVoiceSettings}
          data-orb-voice-settings-chip
        >
          Voice settings
        </button>
      ) : null}
    </div>
  )

  const waveInterruptible = voice.state === 'speaking' || voice.voicePreparing

  const liveRail = (
    <OrbVoiceLiveRail
      activeTab={railTab}
      onTabChange={setRailTab}
      turns={voice.turns}
      partialTranscript={voice.partialTranscript}
      acknowledgement={voice.acknowledgement}
      lastIntent={voice.lastIntent}
      specialistActive={isOrbVoiceV2SpecialistTier(voice.lastBrainTier)}
      summaryPanel={summaryBody}
      toolsPanel={toolsPanel}
    />
  )

  const secondaryControls = sessionStarted ? (
    <div className="flex flex-wrap items-center justify-center gap-2" data-orb-voice-secondary-controls>
      {voice.state === 'paused' || voice.autoResumeBlocked ? (
        <button
          type="button"
          className="orb-liquid-button rounded-full px-4 py-2 text-xs"
          onClick={() => void voice.continueConversation()}
          data-orb-voice-resume
        >
          {voice.autoResumeBlocked ? ORB_VOICE_V2_CONTINUE_CONVERSATION : 'Resume'}
        </button>
      ) : conversationLive ? (
        <button
          type="button"
          className="orb-liquid-button rounded-full px-4 py-2 text-xs"
          onClick={voice.pauseConversation}
          data-orb-voice-pause
        >
          Pause
        </button>
      ) : null}
      {voice.state === 'speaking' || voice.voicePreparing ? (
        <button
          type="button"
          className="orb-liquid-button rounded-full px-4 py-2 text-xs"
          onClick={() => void voice.bargeIn('tap')}
          data-orb-voice-barge-in
        >
          Interrupt
        </button>
      ) : null}
      <button
        type="button"
        className="orb-liquid-button rounded-full px-4 py-2 text-xs"
        onClick={() => voice.stopOrbAudio()}
        data-orb-voice-stop-orb
      >
        Stop ORB
      </button>
      <button
        type="button"
        className="orb-liquid-button rounded-full px-4 py-2 text-xs"
        onClick={() => {
          voice.resetLiveSession()
          setRailTab('transcript')
          setSaveNotice(null)
        }}
        data-orb-voice-reset
      >
        Reset
      </button>
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
    >
      <div
        className="orb-voice-room pointer-events-auto flex min-h-0 flex-1 flex-col"
        data-orb-voice-station
        data-orb-voice-v2
        data-orb-voice-one-screen-workspace
        data-orb-voice-ui-state={voice.state}
        data-orb-voice-capture-active={conversationLive ? true : false}
        data-orb-voice-idle-ready={primaryIdleReady ? true : undefined}
        data-orb-voice-acknowledgement={voice.acknowledgement ?? undefined}
        data-orb-voice-realtime-mode={voice.realtimeMode}
      >
        <OrbVoiceStationContent
          companionState={companionState}
          voiceV2State={voice.state}
          statusLine={statusLine}
          detailLine={sessionStarted ? voice.detailLine : null}
          sessionStarted={sessionStarted}
          preferenceBadges={preferenceBadges}
          liveRail={liveRail}
          secondaryControls={secondaryControls}
          onWaveInterrupt={() => void voice.bargeIn('wave')}
          waveInterruptible={waveInterruptible}
          wakePhraseHint={voice.wakePhraseHint}
          controls={
            <div className="orb-voice-controls flex w-full max-w-sm flex-col items-center gap-2" data-orb-voice-controls>
              {voice.playbackBlocked ? (
                <button
                  type="button"
                  className="orb-liquid-button w-full rounded-full border border-[var(--orb-primary-blue,#168bff)]/50 bg-[var(--orb-primary-blue,#168bff)]/10 px-6 py-3 text-sm font-semibold"
                  onClick={() => void voice.playOrbVoice()}
                  data-orb-voice-play-orb-voice
                >
                  {ORB_VOICE_V2_PLAY_ORB_VOICE}
                </button>
              ) : null}
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
                data-orb-voice-primary-label={primaryLabel}
                data-orb-voice-primary-disabled={primaryDisabled ? true : undefined}
                data-orb-voice-continue-conversation={voice.autoResumeBlocked ? true : undefined}
                data-orb-voice-start-conversation={voice.state === 'idle' ? true : undefined}
              >
                {primaryLabel}
              </button>
            </div>
          }
        >
          {preferenceControls}
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

'use client'

import { useRef } from 'react'
import { Mic, Upload } from 'lucide-react'

import { OrbDictateBoundaryCopy } from '@/components/orb-standalone/orb-dictate-boundary-copy'
import { OrbDictateTemplateSelector } from '@/components/orb/dictate/OrbDictateTemplateSelector'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbDictateOutputTypeSelector } from '@/components/orb-standalone/orb-dictate-output-type-selector'
import {
  OrbDictateModeSelect,
  OrbDictateParticipantsPanel,
  OrbDictateTranscriptSegmentsEditor
} from '@/components/orb-standalone/orb-dictate-station-extras'
import { OrbDictateSpeakerLabelling } from '@/components/orb/dictate/OrbDictateSpeakerLabelling'
import { OrbDictateActionPointsPanel } from '@/components/orb/dictate/OrbDictateActionPointsPanel'
import { SOURCE_CHECK_COPY, TRANSCRIPT_ONLY_COPY } from '@/lib/orb/dictate/orb-dictate-source-check'
import type { DictateState } from '@/lib/orb/dictate/orb-dictate-state'
import {
  ORB_DICTATE_MODE_LABELS,
  type OrbDictateMode,
  type OrbDictateParticipant,
  type OrbDictateTranscriptSegment
} from '@/lib/orb/dictate/orb-dictate-speaker'
import {
  ORB_DICTATE_MOBILE_AI_ACTIONS,
  type DictateMobileAiActionId,
  type DictateRecordingUiState
} from '@/lib/orb/dictate/orb-dictate-mobile-copy'
import type { OrbDictateStudioTemplate } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import {
  ORB_DICTATE_PRODUCT_SUBTITLE,
  ORB_DICTATE_PRODUCT_TITLE,
  type OrbDictateGenerateResult,
  type OrbDictateNoteType,
  type OrbDictateStartMode
} from '@/lib/orb/dictate/orb-dictate-types'
import { ORB_DICTATE_CAPTURE_MODE_COPY } from '@/lib/orb/dictate/orb-dictate-capability-map'
import { isOrbVoiceDebugMode } from '@/lib/orb/orb-voice-debug'

type OutputTab = 'professional' | 'summary' | 'actions' | 'transcript' | 'evidence'

export function OrbDictateMobileExperience({
  orbClass,
  mobileStatusLine,
  mobilePrimaryLabel,
  captureStarting,
  recordingActive,
  timerSec,
  formatTimer,
  showRealtimeReadyHint,
  uploadingAudio,
  needsConsent,
  consentConfirmed,
  onPrimaryAction,
  showCapturedCard,
  liveTranscript,
  effectiveInputText,
  onTranscriptChange,
  segments,
  participants,
  onSegmentsChange,
  onParticipantsChange,
  onImportParticipants,
  mobileAdvancedOpen,
  onToggleAdvanced,
  onClearTranscript,
  onPasteTranscript,
  onAudioUpload,
  generating,
  onAiAction,
  onGenerate,
  mobileRecordingOpen,
  onToggleRecordingOptions,
  selectedTemplateId,
  onTemplateChange,
  dictateMode,
  onDictateModeChange,
  noteType,
  onNoteTypeChange,
  startMode,
  onSelectStartMode,
  pasteText,
  onPasteTextChange,
  onApplyPaste,
  output,
  outputTab,
  onOutputTabChange,
  editedNote,
  onEditedNoteChange,
  mobileOutputOpen,
  onToggleOutputPreview,
  onAskOrbImprove,
  developerMode,
  dictateState,
  recordingUiState
}: {
  orbClass: string
  mobileStatusLine: string
  mobilePrimaryLabel: string
  captureStarting: boolean
  recordingActive: boolean
  timerSec: number
  formatTimer: (seconds: number) => string
  showRealtimeReadyHint: boolean
  uploadingAudio: boolean
  needsConsent: boolean
  consentConfirmed: boolean
  onPrimaryAction: () => void
  showCapturedCard: boolean
  liveTranscript: string
  effectiveInputText: string
  onTranscriptChange: (value: string) => void
  segments: OrbDictateTranscriptSegment[]
  participants: OrbDictateParticipant[]
  onSegmentsChange: (segments: OrbDictateTranscriptSegment[]) => void
  onParticipantsChange: (participants: OrbDictateParticipant[]) => void
  onImportParticipants: () => void
  mobileAdvancedOpen: boolean
  onToggleAdvanced: () => void
  onClearTranscript: () => void
  onPasteTranscript: () => void
  onAudioUpload: (file: File) => void
  generating: boolean
  onAiAction: (action: DictateMobileAiActionId) => void
  onGenerate: () => void
  mobileRecordingOpen: boolean
  onToggleRecordingOptions: () => void
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
  dictateMode: OrbDictateMode
  onDictateModeChange: (mode: OrbDictateMode) => void
  noteType: OrbDictateNoteType
  onNoteTypeChange: (type: OrbDictateNoteType) => void
  startMode: OrbDictateStartMode | null
  onSelectStartMode: (mode: OrbDictateStartMode) => void
  pasteText: string
  onPasteTextChange: (value: string) => void
  onApplyPaste: () => void
  output: OrbDictateGenerateResult | null
  outputTab: OutputTab
  onOutputTabChange: (tab: OutputTab) => void
  editedNote: string
  onEditedNoteChange: (value: string) => void
  mobileOutputOpen: boolean
  onToggleOutputPreview: () => void
  onAskOrbImprove?: () => void
  developerMode: boolean
  dictateState: DictateState
  recordingUiState: DictateRecordingUiState
}) {
  const voiceDebug = isOrbVoiceDebugMode()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const orbListening = recordingActive || captureStarting || dictateState === 'listening'
  const orbReadyIdle = !showCapturedCard && !orbListening
  const showStartMicIcon =
    mobilePrimaryLabel === 'Start recording' || mobilePrimaryLabel === 'Record more'

  return (
    <div
      className="orb-dictate-mobile flex min-h-0 flex-1 flex-col"
      data-orb-dictate-mobile
      data-orb-dictate-capture-idle={showCapturedCard ? undefined : 'true'}
    >
      <header
        className="shrink-0 px-2 pb-1.5 pt-1 text-center"
        data-orb-dictate-header
        data-orb-dictate-title-spacing
      >
        <h2 className="text-base font-semibold text-[var(--orb-text,var(--orb-foreground))]" data-orb-dictate-title>
          {ORB_DICTATE_PRODUCT_TITLE}
        </h2>
        <p className="mt-0.5 text-[11px] text-[var(--orb-muted)]" data-orb-dictate-subtitle>
          {ORB_DICTATE_PRODUCT_SUBTITLE}
        </p>
        <p className="mt-1 text-[10px] text-[var(--orb-muted)]/90" data-orb-dictate-capture-mode>
          {ORB_DICTATE_CAPTURE_MODE_COPY}
        </p>
      </header>
      <div
        className={`flex min-h-0 flex-1 flex-col px-2 ${showCapturedCard ? 'shrink-0' : 'justify-center'}`}
        data-orb-dictate-idle-shell={showCapturedCard ? undefined : 'true'}
      >
      <section
        className={`flex shrink-0 flex-col items-center text-center ${
          showCapturedCard ? 'px-0 pt-2' : 'orb-dictate-mobile-capture-stage mx-auto w-full max-w-sm px-1 py-2'
        }`}
        data-orb-dictate-mobile-capture
        data-orb-dictate-capture-panel={showCapturedCard ? undefined : 'true'}
        data-orb-dictate-capture-stage={showCapturedCard ? undefined : 'true'}
      >
        {!showCapturedCard ? (
          <>
            <div
              className="orb-dictate-mobile-orb-wrap mb-3 flex shrink-0 items-center justify-center"
              data-orb-dictate-capture-orb
              data-orb-dictate-capture-orb-state={
                orbListening
                  ? 'listening'
                  : generating || recordingUiState === 'processing'
                    ? 'processing'
                    : output
                      ? 'review_ready'
                      : orbReadyIdle
                        ? 'ready'
                        : 'idle'
              }
              aria-hidden
            >
              <GlassOrbMark
                variant="dictate"
                className="orb-dictate-mobile-orb"
                state={orbListening ? 'listening' : generating ? 'thinking' : 'idle'}
                pulse={orbListening || orbReadyIdle || generating}
              />
            </div>
          </>
        ) : null}
        <p
          className={`font-semibold text-[var(--orb-text,var(--orb-foreground))] ${
            showCapturedCard ? 'text-sm' : 'text-xs tracking-wide text-[var(--orb-muted)]'
          }`}
          data-orb-dictate-status-line
        >
          {mobileStatusLine}
        </p>
        {recordingActive || captureStarting ? (
          <p className="mt-1 font-mono text-xs text-[var(--orb-muted)]" data-orb-dictate-timer>
            {formatTimer(timerSec)}
          </p>
        ) : showRealtimeReadyHint && (developerMode || voiceDebug) ? (
          <p className="mt-1 text-[11px] text-[var(--orb-muted)]" data-orb-dictate-realtime-hint>
            Realtime transcription ready
          </p>
        ) : null}
        <button
          type="button"
          data-orb-dictate-primary-action
          data-orb-dictate-speech-start={
            mobilePrimaryLabel === 'Start recording' || mobilePrimaryLabel === 'Record more' ? 'true' : undefined
          }
          className="mt-3 inline-flex min-h-[2.75rem] w-full max-w-xs items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] px-8 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            uploadingAudio ||
            captureStarting ||
            (needsConsent && !consentConfirmed && mobilePrimaryLabel === 'Start recording')
          }
          onClick={onPrimaryAction}
        >
          {showStartMicIcon ? <Mic className="h-4 w-4 shrink-0" aria-hidden /> : null}
          <span>{mobilePrimaryLabel}</span>
        </button>

        {!showCapturedCard ? (
          <div className="mt-2.5 w-full max-w-xs" data-orb-dictate-mobile-record-type>
            <OrbDictateTemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={onTemplateChange}
              variant="compact"
              appearance="capture"
            />
          </div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5" data-orb-dictate-mobile-secondary>
          {!showCapturedCard ? (
            <>
              <button
                type="button"
                data-orb-dictate-paste-secondary
                className="inline-flex min-h-[2.75rem] items-center rounded-full border border-[var(--orb-mobile-line,var(--orb-line))]/50 bg-[var(--orb-mobile-card,#fff)]/80 px-3.5 py-1.5 text-xs font-medium text-[var(--orb-text,var(--orb-foreground))] shadow-sm backdrop-blur-sm"
                onClick={onPasteTranscript}
              >
                Paste transcript
              </button>
              <button
                type="button"
                data-orb-dictate-upload-secondary
                className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-full border border-[var(--orb-mobile-line,var(--orb-line))]/50 bg-[var(--orb-mobile-card,#fff)]/80 px-3.5 py-1.5 text-xs font-medium text-[var(--orb-text,var(--orb-foreground))] shadow-sm backdrop-blur-sm"
                disabled={uploadingAudio}
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Upload audio
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="audio/*"
                className="sr-only"
                data-orb-dictate-upload-input
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onAudioUpload(file)
                  e.target.value = ''
                }}
              />
            </>
          ) : (
            <button
              type="button"
              data-orb-dictate-clear
              className="rounded-full border border-[var(--orb-line)]/60 px-3 py-1 text-xs text-[var(--orb-muted)]"
              onClick={onClearTranscript}
            >
              Clear
            </button>
          )}
        </div>
        <div
          className="mt-2 flex w-full max-w-xs flex-wrap items-center justify-center gap-2"
          data-orb-dictate-idle-disclosures
        >
          <OrbDictateBoundaryCopy compact collapsible />
          {!showCapturedCard ? (
            <>
              <button
                type="button"
                className="rounded-full border border-[var(--orb-mobile-line,var(--orb-line))]/60 bg-[var(--orb-mobile-card,var(--orb-surface-elevated))] px-3 py-1 text-xs font-medium text-[var(--orb-muted)]"
                onClick={onToggleRecordingOptions}
                data-orb-dictate-options-chip
                aria-expanded={mobileRecordingOpen}
              >
                Options
              </button>
              {mobileRecordingOpen ? (
                <div
                  className="w-full space-y-2 rounded-xl border border-[var(--orb-line)]/40 p-2 text-left"
                  data-orb-dictate-recording-options
                >
                  <OrbDictateModeSelect mode={dictateMode} onChange={onDictateModeChange} />
                  <OrbDictateTemplateSelector
                    selectedTemplateId={selectedTemplateId}
                    onTemplateChange={onTemplateChange}
                    variant="compact"
                  />
                  <OrbDictateOutputTypeSelector value={noteType} onChange={onNoteTypeChange} compact />
                  <OrbDictateParticipantsPanel
                    participants={participants}
                    onChange={onParticipantsChange}
                    transcript={effectiveInputText}
                    onImportFromTranscript={onImportParticipants}
                  />
                  {startMode === 'paste' ? (
                    <div>
                      <textarea
                        data-orb-dictate-paste
                        value={pasteText}
                        onChange={(e) => onPasteTextChange(e.target.value)}
                        rows={3}
                        placeholder="Paste transcript…"
                        className="w-full rounded-lg border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-2 py-2 text-sm"
                      />
                      <button type="button" className="mt-2 text-xs text-[var(--orb-primary)]" onClick={onApplyPaste}>
                        Use pasted text
                      </button>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['record_note', 'Record note'],
                        ['record_debrief', 'Record debrief'],
                        ['paste', 'Paste transcript'],
                        ['import_voice', 'Import voice']
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        data-orb-dictate-start={id}
                        className={`rounded-lg border px-2 py-2 text-left text-[11px] ${
                          startMode === id
                            ? 'border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)]'
                            : 'border-[var(--orb-line)]/50'
                        }`}
                        onClick={() => onSelectStartMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-28">
        {recordingActive ? (
          <div
            className="mt-3 rounded-2xl border border-[var(--orb-mobile-line,var(--orb-line))]/50 bg-[var(--orb-mobile-card,var(--orb-surface-elevated))] p-3 shadow-sm"
            data-orb-dictate-live-transcript
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Live transcript</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--orb-text,var(--orb-foreground))]">
              {liveTranscript || <span className="text-[var(--orb-muted)]">Your words will appear here…</span>}
            </p>
          </div>
        ) : null}

        {showCapturedCard ? (
          <section className="mt-3" data-orb-dictate-transcript-section data-orb-dictate-captured-card>
            <p className="text-xs font-semibold text-[var(--orb-text,var(--orb-foreground))]">Transcript</p>
            <textarea
              value={effectiveInputText}
              onChange={(e) => onTranscriptChange(e.target.value)}
              rows={7}
              className="mt-2 w-full resize-y rounded-2xl border border-[var(--orb-mobile-line,var(--orb-line))]/60 bg-[var(--orb-mobile-card,var(--orb-surface))] px-3 py-2.5 text-sm leading-6 text-[var(--orb-text,var(--orb-foreground))]"
              data-orb-dictate-captured-text
            />
            <p className="mt-1.5 text-[10px] text-[var(--orb-muted)]" data-orb-dictate-transcript-availability>
              {TRANSCRIPT_ONLY_COPY}
            </p>
            {segments.length ? (
              <div className="mt-2">
                <OrbDictateSpeakerLabelling
                  compact
                  segments={segments}
                  participants={participants}
                  onSegmentsChange={onSegmentsChange}
                  onParticipantsChange={onParticipantsChange}
                />
              </div>
            ) : null}
            <button
              type="button"
              className="mt-2 text-xs text-[var(--orb-primary)]"
              onClick={onToggleAdvanced}
              data-orb-dictate-advanced-toggle
              aria-expanded={mobileAdvancedOpen}
            >
              {mobileAdvancedOpen ? 'Hide advanced editing' : 'Advanced transcript editing'}
            </button>
            <div className="mt-3">
              <OrbDictateOutputTypeSelector value={noteType} onChange={onNoteTypeChange} compact />
            </div>
            {mobileAdvancedOpen ? (
              <div className="mt-2 space-y-2" data-orb-dictate-advanced-body>
                <OrbDictateTranscriptSegmentsEditor
                  segments={segments}
                  participants={participants}
                  onChange={onSegmentsChange}
                />
                <OrbDictateParticipantsPanel
                  participants={participants}
                  onChange={onParticipantsChange}
                  transcript={effectiveInputText}
                  onImportFromTranscript={onImportParticipants}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {showCapturedCard ? (
          <div className="mt-4 flex flex-wrap gap-2" data-orb-dictate-ai-actions>
            {ORB_DICTATE_MOBILE_AI_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                data-orb-dictate-ai={action.id}
                className="rounded-full border border-[var(--orb-mobile-line,var(--orb-line))]/60 bg-[var(--orb-mobile-card,var(--orb-surface-elevated))] px-3 py-1.5 text-xs text-[var(--orb-text,var(--orb-foreground))]"
                disabled={generating}
                onClick={() => onAiAction(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}

        {showCapturedCard ? (
          <div className="mt-4">
            <button
              type="button"
              className="rounded-full border border-[var(--orb-mobile-line,var(--orb-line))]/60 px-3 py-1 text-xs font-medium text-[var(--orb-muted)]"
              onClick={onToggleRecordingOptions}
              data-orb-dictate-options-chip
              aria-expanded={mobileRecordingOpen}
            >
              Options
            </button>
            {mobileRecordingOpen ? (
              <div className="mt-2 space-y-2 rounded-xl border border-[var(--orb-line)]/40 p-2" data-orb-dictate-recording-options>
                <OrbDictateModeSelect mode={dictateMode} onChange={onDictateModeChange} />
                <OrbDictateOutputTypeSelector value={noteType} onChange={onNoteTypeChange} compact />
                <OrbDictateParticipantsPanel
                  participants={participants}
                  onChange={onParticipantsChange}
                  transcript={effectiveInputText}
                  onImportFromTranscript={onImportParticipants}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {output ? (
          <div className="mt-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-[var(--orb-line)]/50 px-3 py-2 text-xs text-[var(--orb-muted)]"
              onClick={onToggleOutputPreview}
              data-orb-dictate-output-preview-toggle
              aria-expanded={mobileOutputOpen}
            >
              <span>Output preview</span>
              <span>{mobileOutputOpen ? '−' : '+'}</span>
            </button>
            {mobileOutputOpen ? (
              <div
                className="mt-2 overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]"
                data-orb-dictate-output-preview
                data-orb-dictate-generated-output
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    Generated output
                  </span>
                  {onAskOrbImprove ? (
                    <button
                      type="button"
                      data-orb-dictate-ask-orb-improve
                      className="text-[10px] font-medium text-[var(--orb-primary)]"
                      onClick={onAskOrbImprove}
                    >
                      Ask ORB to improve
                    </button>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1 border-b border-[var(--orb-line)]/40 p-2">
                  {(
                    [
                      ['professional', 'Professional note'],
                      ['summary', 'Summary'],
                      ['actions', 'Actions'],
                      ['transcript', 'Transcript'],
                      ['evidence', 'Evidence Ofsted']
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      data-orb-dictate-tab={id}
                      className={`rounded-lg px-2 py-1 text-[10px] ${
                        outputTab === id
                          ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                          : 'text-[var(--orb-muted)]'
                      }`}
                      onClick={() => onOutputTabChange(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="max-h-48 overflow-y-auto p-3 text-sm text-[var(--orb-foreground)]">
                  {outputTab === 'professional' ? (
                    <textarea
                      data-orb-dictate-output
                      value={editedNote}
                      onChange={(e) => onEditedNoteChange(e.target.value)}
                      rows={8}
                      className="w-full resize-y bg-transparent focus:outline-none"
                    />
                  ) : outputTab === 'summary' ? (
                    <p>{output.summary}</p>
                  ) : outputTab === 'actions' ? (
                    <OrbDictateActionPointsPanel
                      actions={output.actions}
                      structuredActions={output.structured_actions}
                      segments={segments}
                    />
                  ) : outputTab === 'transcript' ? (
                    <div className="space-y-2">
                      <p className="whitespace-pre-wrap">{output.transcript}</p>
                      <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-source-check-disclosure>
                        {SOURCE_CHECK_COPY}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {output.ofsted_lens ? <p>{output.ofsted_lens}</p> : null}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {developerMode || voiceDebug ? (
          <p className="mt-3 font-mono text-[10px] text-[var(--orb-muted)]" data-orb-dictate-debug>
            mobile dictate debug
          </p>
        ) : null}
      </div>

      {showCapturedCard ? (
        <div
          className="sticky bottom-0 shrink-0 border-t border-[var(--orb-line)]/40 bg-[var(--orb-mobile-bg,var(--orb-surface))] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          data-orb-dictate-generate-sticky
        >
          <button
            type="button"
            data-orb-dictate-generate
            disabled={generating || !effectiveInputText.trim()}
            className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onGenerate}
          >
            {generating ? 'Generating…' : 'Generate professional note'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

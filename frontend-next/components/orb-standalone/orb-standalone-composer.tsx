'use client'

import { FormEvent, useEffect, useRef, useState, type DragEvent } from 'react'
import { AudioLines, Camera, ChevronDown, FileText, Mic, MicOff, Plus, Send, Square, Wrench, X } from 'lucide-react'

import {
  OrbComposerPlusMenu,
  type OrbComposerPlusAction
} from '@/components/orb-standalone/orb-composer-plus-menu'
import { OrbPrivacyInputWarning } from '@/components/orb/privacy/orb-privacy-input-warning'
import { OrbPrivacyNotice } from '@/components/orb/privacy/orb-privacy-notice'
import {
  OrbResidentialPrivacyGuidanceIcon,
  OrbResidentialPrivacyGuidanceSheet
} from '@/components/orb-residential/orb-privacy-guidance-sheet'
import { OrbComposerCopyright } from '@/components/orb-standalone/orb-composer-copyright'
import { OrbFooter } from '@/components/orb-standalone/orb-footer'
import { logTapTarget } from '@/lib/interaction/mobile-tap-debug'
import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type PendingImageAttachment = {
  id: string
  dataUrl: string
  name: string
  previewUrl: string
}

function sendDisabledReason(pending: boolean, canSend: boolean): 'pending' | 'empty' | 'ready' {
  if (pending) return 'pending'
  if (!canSend) return 'empty'
  return 'ready'
}

export type OrbComposerLastSendStatus = 'idle' | 'sending' | 'success' | 'error'

export function OrbStandaloneComposer({
  value,
  pending,
  lastSendStatus = 'idle',
  mode,
  attachments,
  voiceListening,
  voiceSpeaking,
  voiceRecognitionAvailable,
  voiceStatusText,
  voiceCaptureEnabled = false,
  composerMicEnabled = true,
  composerMicRoute = 'dictate',
  composerMicReason = 'fallback',
  composerMicAriaLabel,
  composerMicTitle,
  transcriptReady,
  displayTranscript,
  autoSend,
  onChange,
  onSubmit,
  composerStateLength,
  onMicClick,
  onVoiceClick,
  voicePanelUnavailable = false,
  onCancelListening,
  onStopSpeaking,
  onSendTranscript,
  onRetryTranscript,
  onAddFiles,
  onRemoveAttachment,
  onPaste,
  onDrop,
  inputRef,
  documentAttached,
  documentTitle,
  onAttachDocumentClick,
  onAnalyseDocument,
  onDocumentActionPlan,
  onSummariseDocument,
  onAddDocumentToLibrary,
  onToolsClick,
  suggestions,
  agentLabel,
  onAgentSelectorClick,
  answering,
  onStopGenerating,
  residentialSurface = false,
  mobileViewport = false,
  chatHasMessages = false,
  onPlusMenuAction
}: {
  value: string
  pending: boolean
  lastSendStatus?: OrbComposerLastSendStatus
  mode: StandaloneOrbMode
  attachments: PendingImageAttachment[]
  voiceListening: boolean
  voiceSpeaking: boolean
  voiceRecognitionAvailable: boolean
  voiceStatusText: string
  voiceCaptureEnabled?: boolean
  /** When false, mic button is disabled (e.g. voice capture globally off). */
  composerMicEnabled?: boolean
  composerMicRoute?: 'dictate' | 'voice'
  composerMicReason?: string
  composerMicAriaLabel?: string
  composerMicTitle?: string
  transcriptReady: boolean
  displayTranscript: string
  autoSend: boolean
  onChange: (value: string) => void
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>
  composerStateLength?: number
  onMicClick: () => void
  onVoiceClick?: () => void
  /** When true, ORB Voice panel opens but browser speech is unavailable. */
  voicePanelUnavailable?: boolean
  onCancelListening: () => void
  onStopSpeaking: () => void
  onSendTranscript: () => void
  onRetryTranscript: () => void
  onAddFiles: (files: FileList | File[]) => void
  onRemoveAttachment: (id: string) => void
  onPaste: (event: React.ClipboardEvent) => void
  onDrop: (event: DragEvent) => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  documentAttached?: boolean
  documentTitle?: string | null
  onAttachDocumentClick?: () => void
  onAnalyseDocument?: () => void
  onDocumentActionPlan?: () => void
  onSummariseDocument?: () => void
  onAddDocumentToLibrary?: () => void
  onToolsClick?: () => void
  suggestions?: string[]
  agentLabel?: string
  onAgentSelectorClick?: () => void
  answering?: boolean
  onStopGenerating?: () => void
  residentialSurface?: boolean
  mobileViewport?: boolean
  chatHasMessages?: boolean
  onPlusMenuAction?: (action: OrbComposerPlusAction) => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const fallbackInputRef = useRef<HTMLTextAreaElement | null>(null)
  const trimmedMessage = value.trim()
  const stateLength = composerStateLength ?? trimmedMessage.length
  const canSend = trimmedMessage.length > 0 || attachments.length > 0
  const sendDisabled = pending || !canSend
  const disabledReason = sendDisabledReason(pending, canSend)
  const micDisabled = !composerMicEnabled || !voiceCaptureEnabled
  const micLabel =
    composerMicAriaLabel ??
    (voiceListening ? 'Stop voice input' : 'Open voice or dictate')
  const micHint =
    composerMicTitle ??
    (voiceListening
      ? 'Stop voice input'
      : voiceRecognitionAvailable
        ? 'Open ORB Voice or start voice input'
        : 'Open ORB Dictate to record or paste notes')

  function setInputNode(node: HTMLTextAreaElement | null) {
    fallbackInputRef.current = node
    if (inputRef && 'current' in inputRef) {
      ;(inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }
  }

  function syncMessage(next: string) {
    onChange(next)
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  function focusInput() {
    if (pending) return
    const input = inputRef?.current ?? fallbackInputRef.current
    if (!input) return
    input.focus({ preventScroll: true })
    const end = input.value.length
    try {
      input.setSelectionRange(end, end)
    } catch {
      // Safari can throw if selection is unavailable; focus still worked.
    }
  }

  function focusComposerInput(event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null
    if (target?.closest('button,input,textarea,a,[role="button"]')) return
    focusInput()
  }

  function syncComposerHeight() {
    const input = inputRef?.current ?? fallbackInputRef.current
    if (!input || !residentialSurface) return
    input.style.height = 'auto'
    const maxHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 140 : 220
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
  }

  useEffect(() => {
    syncComposerHeight()
  }, [value, residentialSurface])

  const compactResidential = residentialSurface
  const showMobilePrivacyIcon = compactResidential && mobileViewport && !chatHasMessages
  const [privacyGuidanceOpen, setPrivacyGuidanceOpen] = useState(false)
  const showComposerQuickActions = compactResidential && !mobileViewport

  return (
    <div
      className={`orb-chat-composer orb-composer-floating-wrap shrink-0 px-3 md:px-5 ${compactResidential ? 'orb-composer-zone' : ''}`}
      onDragOver={handleDragOver}
      onDrop={onDrop}
      data-orb-standalone-composer
      data-testid="orb-standalone-composer"
      data-pending={pending ? 'true' : 'false'}
      data-last-send-status={lastSendStatus}
    >
      <div className="mx-auto w-full max-w-[var(--orb-composer-max,53.125rem)]">
        {voiceCaptureEnabled && transcriptReady && displayTranscript ? (
          <div className="mb-3 rounded-3xl border border-teal-300/25 bg-white/80 px-4 py-3 shadow-lg shadow-cyan-100/40 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">I heard you say</p>
            <p className="mt-1 text-sm italic text-slate-700">&ldquo;{displayTranscript}&rdquo;</p>
            {!autoSend ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={onSendTranscript} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white">
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Send transcript
                </button>
                <button type="button" onClick={onRetryTranscript} className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600">
                  Try again
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <form
          className="w-full"
          data-testid="orb-standalone-message-form"
          data-composer-state-length={stateLength}
          onSubmit={(event) => {
            logTapTarget(event, 'orb-standalone-form-submit')
            void onSubmit(event)
          }}
        >
          <label htmlFor="orb-standalone-input" className="sr-only">
            Message ORB
          </label>

          {value.startsWith('/') ? (
            <p className="mb-2 px-3 text-[11px] font-medium text-sky-700" data-orb-composer-slash-hint>
              /record · /safeguard · /ofsted · /shift · /supervision · /whatamimissing · /therapeutic · /manager ·
              /reg44 · /policy · /agent · /clear
            </p>
          ) : null}

          {suggestions && suggestions.length > 0 && !value.trim() && !pending && !answering ? (
            <div className="mb-2 flex flex-wrap gap-1.5 px-1" data-orb-composer-suggestions>
              {suggestions.slice(0, 3).map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => syncMessage(suggestion)} className="rounded-full border border-sky-100 bg-white/75 px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50">
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {showComposerQuickActions ? (
            <div
              className="orb-composer-quick-actions mb-2 flex flex-wrap gap-2 px-0.5"
              data-orb-composer-quick-actions
            >
              <button
                type="button"
                onClick={onMicClick}
                disabled={micDisabled}
                aria-label={micLabel}
                title={micHint}
                className="inline-flex min-h-[2.75rem] min-w-[2.75rem] flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-4 text-xs font-semibold text-[var(--orb-foreground)] transition hover:bg-[var(--orb-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                data-orb-composer-quick-dictate
                data-orb-composer-mic
                data-orb-composer-mic-route={composerMicRoute}
              >
                <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Dictate
              </button>
              {onVoiceClick ? (
                <button
                  type="button"
                  onClick={onVoiceClick}
                  aria-label={voicePanelUnavailable ? 'Open ORB Voice (unavailable)' : 'Open ORB Voice'}
                  className={`inline-flex min-h-[2.75rem] min-w-[2.75rem] flex-1 items-center justify-center gap-1.5 rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-4 text-xs font-semibold transition hover:bg-[var(--orb-surface-hover)] ${voicePanelUnavailable ? 'text-[var(--orb-muted)] opacity-60' : 'text-[var(--orb-foreground)]'}`}
                  data-orb-composer-quick-voice
                  data-orb-composer-voice
                  data-orb-composer-voice-unavailable={voicePanelUnavailable ? 'true' : 'false'}
                >
                  <AudioLines className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Voice
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            className={`orb-composer-glass ${compactResidential ? 'orb-composer-glass--compact p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} ${answering ? 'orb-composer-answering orb-answering-pulse' : ''}`}
            onClick={focusComposerInput}
            onTouchEnd={focusComposerInput}
            data-orb-composer-answering={answering ? 'true' : 'false'}
            data-orb-composer-card
            data-orb-composer-compact={compactResidential ? 'true' : undefined}
          >
            {!compactResidential ? (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-0.5 pb-2"
              data-orb-composer-mode-row
            >
              {onAgentSelectorClick ? (
                <button type="button" onClick={onAgentSelectorClick} className="orb-composer-agent-selector inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50" data-orb-composer-agent-selector aria-label="Choose agent">
                  <span className="truncate">{agentLabel || mode || 'Ask ORB'}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                </button>
              ) : (
                <span className="inline-flex rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm">
                  {mode}
                </span>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {documentAttached ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 font-medium text-cyan-700">
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    {documentTitle || 'Document attached'}
                  </span>
                ) : null}
                {voiceListening ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
                    <Mic className="h-3.5 w-3.5" aria-hidden />
                    Listening
                  </span>
                ) : null}
              </div>
            </div>
            ) : null}

            {attachments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 px-1">
                {attachments.map((file) => (
                  <div key={file.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file.previewUrl} alt={file.name} className="h-16 w-16 rounded-2xl border border-white/80 object-cover shadow-sm" />
                    <button type="button" onClick={() => onRemoveAttachment(file.id)} className="absolute -right-1 -top-1 rounded-full border border-white bg-slate-950 p-0.5 text-white shadow-sm" aria-label={`Remove ${file.name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {documentAttached ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                {onAnalyseDocument ? <button type="button" onClick={onAnalyseDocument} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Analyse</button> : null}
                {onDocumentActionPlan ? <button type="button" onClick={onDocumentActionPlan} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Action plan</button> : null}
                {onSummariseDocument ? <button type="button" onClick={onSummariseDocument} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Summarise</button> : null}
                {onAddDocumentToLibrary ? <button type="button" onClick={onAddDocumentToLibrary} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">Add to library</button> : null}
              </div>
            ) : null}

            {compactResidential && (documentAttached || voiceListening) ? (
              <div className="mb-1 flex flex-wrap items-center gap-2 px-0.5 text-[10px] text-[var(--orb-muted)]">
                {documentAttached ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5">
                    <FileText className="h-3 w-3" aria-hidden />
                    {documentTitle || 'Document attached'}
                  </span>
                ) : null}
                {voiceListening ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5">
                    <Mic className="h-3 w-3" aria-hidden />
                    Listening
                  </span>
                ) : null}
              </div>
            ) : null}

            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/*" multiple className="hidden" onChange={(event) => { if (event.target.files?.length) onAddFiles(event.target.files); event.target.value = '' }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { if (event.target.files?.length) onAddFiles(event.target.files); event.target.value = '' }} />

            <div className={compactResidential ? 'flex items-end gap-1.5' : ''}>
            {compactResidential ? (
              <div className="orb-composer-action-rail flex shrink-0 items-center gap-0.5 pb-1">
                {mobileViewport ? (
                  <>
                    {showMobilePrivacyIcon ? (
                      <OrbResidentialPrivacyGuidanceIcon onOpen={() => setPrivacyGuidanceOpen(true)} />
                    ) : null}
                    <button
                      type="button"
                      onClick={onMicClick}
                      disabled={micDisabled}
                      aria-label={micLabel}
                      title={micHint}
                      className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${voiceListening ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]' : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'}`}
                      data-orb-composer-quick-dictate
                      data-orb-composer-mic
                      data-orb-composer-mic-route={composerMicRoute}
                    >
                      <Mic className="h-4 w-4" aria-hidden />
                    </button>
                    {onVoiceClick ? (
                      <button
                        type="button"
                        onClick={onVoiceClick}
                        aria-label={voicePanelUnavailable ? 'Open ORB Voice (unavailable)' : 'Open ORB Voice'}
                        className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full transition ${voicePanelUnavailable ? 'text-[var(--orb-muted)] opacity-60' : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'}`}
                        data-orb-composer-quick-voice
                        data-orb-composer-voice
                        data-orb-composer-voice-unavailable={voicePanelUnavailable ? 'true' : 'false'}
                      >
                        <AudioLines className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </>
                ) : null}
                {onPlusMenuAction ? (
                  <OrbComposerPlusMenu
                    onSelect={onPlusMenuAction}
                    onAttachFiles={() => fileInputRef.current?.click()}
                  />
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]" aria-label="Attach" data-orb-composer-attach>
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                )}
                {!mobileViewport && onAttachDocumentClick ? <button type="button" onClick={onAttachDocumentClick} className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)]" aria-label="Attach document" data-orb-composer-document><FileText className="h-4 w-4" aria-hidden /></button> : null}
                {!mobileViewport && onToolsClick ? <button type="button" onClick={onToolsClick} className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)]" aria-label="Tools" data-orb-composer-tools><Wrench className="h-4 w-4" aria-hidden /></button> : null}
              </div>
            ) : null}

            <textarea
              ref={setInputNode}
              id="orb-standalone-input"
              name="message"
              value={value}
              onFocus={() => document.body.setAttribute('data-orb-composer-focused', 'true')}
              onBlur={() => document.body.removeAttribute('data-orb-composer-focused')}
              onChange={(event) => {
                syncMessage(event.currentTarget.value)
                syncComposerHeight()
              }}
              onInput={(event) => {
                syncMessage(event.currentTarget.value)
                syncComposerHeight()
              }}
              onCompositionEnd={(event) => {
                syncMessage(event.currentTarget.value)
                syncComposerHeight()
              }}
              onPaste={onPaste}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return
                event.preventDefault()
                const form = event.currentTarget.form
                if (form && !sendDisabled) form.requestSubmit()
              }}
              rows={1}
              className={
                compactResidential
                  ? 'min-h-[2.5rem] max-h-[8.75rem] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-[0.9375rem] leading-6 text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)] md:max-h-[13.75rem]'
                  : 'mt-1.5 max-h-40 min-h-[3.25rem] w-full resize-none bg-transparent px-0.5 py-2 text-[0.9375rem] leading-6 text-[var(--orb-foreground)] outline-none focus:outline-none focus-visible:outline-none placeholder:text-slate-500'
              }
              placeholder={compactResidential ? 'Ask ORB anything...' : 'Ask anything'}
              data-orb-composer-placeholder={compactResidential ? 'ask-orb-anything' : 'ask-anything'}
              disabled={pending}
              aria-describedby="orb-standalone-status"
              autoCapitalize="sentences"
              autoComplete="off"
              autoCorrect="on"
              spellCheck="true"
              inputMode="text"
              data-orb-composer-input
              data-testid="orb-standalone-message-input"
              data-input-source="controlled"
            />

            {compactResidential ? (
              <div className="flex shrink-0 items-center gap-1.5 pb-1">
                {answering && onStopGenerating ? (
                  <button type="button" onClick={onStopGenerating} className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-rose-400/30 text-rose-300" aria-label="Stop generating" data-orb-composer-stop-generating>
                    <Square className="h-4 w-4 fill-current" aria-hidden />
                  </button>
                ) : null}
                <button type="submit" disabled={sendDisabled || (answering && Boolean(onStopGenerating))} aria-label="Send message" className="orb-composer-send inline-flex h-11 min-w-11 items-center justify-center rounded-full text-white transition disabled:opacity-35" data-orb-composer-send data-testid="orb-standalone-send-clickable">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            </div>

            {!compactResidential ? (
            <div className="mt-1 flex items-center justify-between gap-3 px-1">
              <div className="orb-composer-action-rail flex items-center gap-0.5 p-0.5">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Attach image" data-orb-composer-attach>
                  <Plus className="h-4.5 w-4.5" aria-hidden />
                </button>
                {onAttachDocumentClick ? <button type="button" onClick={onAttachDocumentClick} className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Attach document" data-orb-composer-document><FileText className="h-4.5 w-4.5" aria-hidden /></button> : null}
                {onToolsClick ? <button type="button" onClick={onToolsClick} className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Tools" data-orb-composer-tools><Wrench className="h-4.5 w-4.5" aria-hidden /></button> : null}
                <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:hidden" aria-label="Use camera">
                  <Camera className="h-4.5 w-4.5" aria-hidden />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {answering && onStopGenerating ? (
                  <button type="button" onClick={onStopGenerating} className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 text-rose-800 shadow-sm transition hover:bg-rose-100" aria-label="Stop generating" data-orb-composer-stop-generating>
                    <Square className="h-4 w-4 fill-current" aria-hidden />
                    <span className="hidden text-xs font-semibold sm:inline">Stop</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onMicClick}
                  disabled={micDisabled}
                  aria-label={micLabel}
                  title={micHint}
                  className={`pointer-events-auto inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 ${voiceListening ? 'bg-sky-100 text-sky-700 shadow-sm' : 'bg-white text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900'}`}
                  data-orb-composer-mic
                  data-orb-composer-mic-available={voiceRecognitionAvailable ? 'true' : 'false'}
                  data-orb-composer-mic-route={composerMicRoute}
                  data-orb-composer-mic-reason={composerMicReason}
                  data-no-navigation-rescue="true"
                >
                  {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button type="submit" disabled={sendDisabled || (answering && Boolean(onStopGenerating))} aria-label="Send message" onClick={(event) => logTapTarget(event, 'orb-standalone-send-click')} onPointerUp={(event) => { if (event.pointerType !== 'touch') return; logTapTarget(event, 'orb-standalone-send-pointer') }} className="orb-composer-send pointer-events-auto inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-white transition disabled:opacity-35" data-orb-composer-send data-testid="orb-standalone-send-clickable" data-send-disabled-reason={disabledReason} data-message-length={trimmedMessage.length} data-no-navigation-rescue="true">
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
            ) : null}
          </div>

          <div className={`orb-voice-status-slot mt-2 flex min-h-[1.25rem] flex-wrap items-center justify-between gap-2 px-2 ${compactResidential ? 'hidden' : ''}`}>
            {voiceStatusText ? (
              <p id="orb-standalone-status" className="text-[11px] leading-5 text-slate-500" role="status" data-orb-voice-status>{voiceStatusText}</p>
            ) : (
              <span id="orb-standalone-status" className="sr-only" data-orb-voice-status>Ready to type</span>
            )}
            {!compactResidential ? (
              <span className="hidden text-[10px] text-slate-400 md:inline" data-orb-composer-mode-label>
                Mode: {mode}
              </span>
            ) : null}
          </div>

          {voiceCaptureEnabled && voiceListening ? (
            <div className="mt-1.5 px-2">
              <button type="button" onClick={onCancelListening} className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500">Cancel listening</button>
            </div>
          ) : null}
          {voiceCaptureEnabled && voiceSpeaking ? (
            <div className="mt-1.5 px-2">
              <button type="button" onClick={onStopSpeaking} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-[11px] font-semibold text-amber-800">
                <Square className="h-3 w-3 fill-current" />
                Stop speaking
              </button>
            </div>
          ) : null}
        </form>

        <div className="mt-2 space-y-2 px-2" data-orb-composer-privacy-zone>
          <OrbPrivacyInputWarning text={value} />
          {!compactResidential || !mobileViewport ? <OrbPrivacyNotice surface="chat" /> : null}
        </div>

        {!compactResidential ? (
          <OrbFooter
            className="mt-2 px-2"
            disclaimer="ORB Residential can make mistakes. ORB Residential does not access IndiCare OS records."
            copyright=""
          />
        ) : compactResidential && !mobileViewport ? (
          <OrbComposerCopyright className="mt-2 px-2 pb-1" />
        ) : null}
      </div>
      {showMobilePrivacyIcon ? (
        <OrbResidentialPrivacyGuidanceSheet
          open={privacyGuidanceOpen}
          onClose={() => setPrivacyGuidanceOpen(false)}
        />
      ) : null}
    </div>
  )
}

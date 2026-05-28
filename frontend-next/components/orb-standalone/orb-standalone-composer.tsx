'use client'

import { FormEvent, useRef, type DragEvent } from 'react'
import { Camera, ChevronDown, FileText, Mic, MicOff, Plus, Send, Square, Wrench, X } from 'lucide-react'

import { logTapTarget } from '@/lib/interaction/mobile-tap-debug'
import { placeholderForMode } from '@/lib/orb/residential-agents'
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
  transcriptReady,
  displayTranscript,
  autoSend,
  onChange,
  onSubmit,
  composerStateLength,
  onMicClick,
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
  onStopGenerating
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
  transcriptReady: boolean
  displayTranscript: string
  autoSend: boolean
  onChange: (value: string) => void
  onSubmit: (event?: FormEvent<HTMLFormElement>) => void | Promise<void>
  composerStateLength?: number
  onMicClick: () => void
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
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const trimmedMessage = value.trim()
  const stateLength = composerStateLength ?? trimmedMessage.length
  const canSend = trimmedMessage.length > 0 || attachments.length > 0
  const sendDisabled = pending || !canSend
  const disabledReason = sendDisabledReason(pending, canSend)

  function syncMessage(next: string) {
    onChange(next)
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      className="orb-chat-composer orb-composer-floating-wrap shrink-0 px-3 md:px-5"
      onDragOver={handleDragOver}
      onDrop={onDrop}
      data-orb-composer
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
                <button
                  type="button"
                  onClick={onSendTranscript}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Send transcript
                </button>
                <button
                  type="button"
                  onClick={onRetryTranscript}
                  className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600"
                >
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
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => syncMessage(suggestion)}
                  className="rounded-full border border-sky-100 bg-white/75 px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <div
            className={`orb-composer-glass p-2.5 sm:p-3 ${answering ? 'orb-composer-answering orb-answering-pulse' : ''}`}
            data-orb-composer-answering={answering ? 'true' : 'false'}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-0.5 pb-2">
              {onAgentSelectorClick ? (
                <button
                  type="button"
                  onClick={onAgentSelectorClick}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  data-orb-composer-agent-selector
                  aria-label="Choose agent"
                >
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

            {attachments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 px-1">
                {attachments.map((file) => (
                  <div key={file.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file.previewUrl} alt={file.name} className="h-16 w-16 rounded-2xl border border-white/80 object-cover shadow-sm" />
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(file.id)}
                      className="absolute -right-1 -top-1 rounded-full border border-white bg-slate-950 p-0.5 text-white shadow-sm"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {documentAttached ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                {onAnalyseDocument ? (
                  <button type="button" onClick={onAnalyseDocument} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                    Analyse
                  </button>
                ) : null}
                {onDocumentActionPlan ? (
                  <button type="button" onClick={onDocumentActionPlan} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                    Action plan
                  </button>
                ) : null}
                {onSummariseDocument ? (
                  <button type="button" onClick={onSummariseDocument} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                    Summarise
                  </button>
                ) : null}
                {onAddDocumentToLibrary ? (
                  <button type="button" onClick={onAddDocumentToLibrary} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                    Add to library
                  </button>
                ) : null}
              </div>
            ) : null}

            <textarea
              ref={inputRef}
              id="orb-standalone-input"
              name="message"
              value={value}
              onChange={(event) => syncMessage(event.currentTarget.value)}
              onInput={(event) => syncMessage(event.currentTarget.value)}
              onCompositionEnd={(event) => syncMessage(event.currentTarget.value)}
              onPaste={onPaste}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey) return
                event.preventDefault()
                const form = event.currentTarget.form
                if (form && !sendDisabled) {
                  form.requestSubmit()
                }
              }}
              rows={1}
              className="mt-1.5 max-h-40 min-h-[3.25rem] w-full resize-none bg-transparent px-0.5 py-2 text-[0.9375rem] leading-6 text-[var(--orb-foreground)] outline-none focus:outline-none focus-visible:outline-none placeholder:text-slate-500 [touch-action:manipulation]"
              placeholder={placeholderForMode(mode)}
              disabled={pending}
              aria-describedby="orb-standalone-status"
              data-orb-composer-input
              data-testid="orb-standalone-message-input"
              data-input-source="controlled"
            />

            <div className="mt-1 flex items-center justify-between gap-3 px-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) onAddFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) onAddFiles(event.target.files)
                  event.target.value = ''
                }}
              />

              <div className="orb-composer-action-rail flex items-center gap-0.5 p-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Attach image"
                  data-orb-composer-attach
                >
                  <Plus className="h-4.5 w-4.5" aria-hidden />
                </button>
                {onAttachDocumentClick ? (
                  <button
                    type="button"
                    onClick={onAttachDocumentClick}
                    className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Attach document"
                    data-orb-composer-document
                  >
                    <FileText className="h-4.5 w-4.5" aria-hidden />
                  </button>
                ) : null}
                {onToolsClick ? (
                  <button
                    type="button"
                    onClick={onToolsClick}
                    className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Tools"
                    data-orb-composer-tools
                  >
                    <Wrench className="h-4.5 w-4.5" aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
                  aria-label="Use camera"
                >
                  <Camera className="h-4.5 w-4.5" aria-hidden />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {answering && onStopGenerating ? (
                  <button
                    type="button"
                    onClick={onStopGenerating}
                    className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 text-rose-800 shadow-sm transition hover:bg-rose-100"
                    aria-label="Stop generating"
                    data-orb-composer-stop-generating
                  >
                    <Square className="h-4 w-4 fill-current" aria-hidden />
                    <span className="hidden text-xs font-semibold sm:inline">Stop</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onMicClick}
                  disabled={voiceCaptureEnabled && !voiceRecognitionAvailable}
                  aria-label={
                    voiceCaptureEnabled
                      ? voiceListening
                        ? 'Stop listening'
                        : 'Start voice input'
                      : 'Voice mode coming next'
                  }
                  className={`inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                    voiceListening
                      ? 'bg-sky-100 text-sky-700 shadow-sm'
                      : 'bg-white text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  data-orb-composer-mic
                  data-no-navigation-rescue="true"
                >
                  {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  type="submit"
                  disabled={sendDisabled || (answering && Boolean(onStopGenerating))}
                  aria-label="Send message"
                  onClick={(event) => logTapTarget(event, 'orb-standalone-send-click')}
                  onPointerUp={(event) => {
                    if (event.pointerType !== 'touch') return
                    logTapTarget(event, 'orb-standalone-send-pointer')
                  }}
                  className="orb-composer-send pointer-events-auto inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full text-white transition disabled:opacity-35"
                  data-orb-composer-send
                  data-testid="orb-standalone-send-clickable"
                  data-send-disabled-reason={disabledReason}
                  data-message-length={trimmedMessage.length}
                  data-no-navigation-rescue="true"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="orb-voice-status-slot mt-2 flex min-h-[1.25rem] flex-wrap items-center justify-between gap-2 px-2">
            {voiceStatusText ? (
              <p id="orb-standalone-status" className="text-[11px] leading-5 text-slate-500" role="status" data-orb-voice-status>
                {voiceStatusText}
              </p>
            ) : (
              <span id="orb-standalone-status" className="sr-only" data-orb-voice-status>
                Ready to type
              </span>
            )}
            <span className="text-[10px] text-slate-400">Mode: {mode}</span>
          </div>

          {voiceCaptureEnabled && voiceListening ? (
            <div className="mt-1.5 px-2">
              <button
                type="button"
                onClick={onCancelListening}
                className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500"
              >
                Cancel listening
              </button>
            </div>
          ) : null}
          {voiceCaptureEnabled && voiceSpeaking ? (
            <div className="mt-1.5 px-2">
              <button
                type="button"
                onClick={onStopSpeaking}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-[11px] font-semibold text-amber-800"
              >
                <Square className="h-3 w-3 fill-current" />
                Stop speaking
              </button>
            </div>
          ) : null}
        </form>

        <p className="mt-2 px-2 text-center text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-composer-disclaimer>
          Standalone ORB can make mistakes. It does not access IndiCare OS records.
        </p>
      </div>
    </div>
  )
}

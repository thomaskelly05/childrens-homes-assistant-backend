'use client'

import { FormEvent, useRef, type DragEvent } from 'react'
import { Camera, FileText, Mic, MicOff, Plus, Send, Square, X } from 'lucide-react'

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

export function OrbStandaloneComposer({
  value,
  pending,
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
  onAddDocumentToLibrary
}: {
  value: string
  pending: boolean
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
  onSubmit: (event?: FormEvent | { preventDefault?: () => void }) => void
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
      className="orb-chat-composer shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-[#05070d] via-[#05070d]/98 to-transparent px-3 pt-2 md:px-4 md:pt-3"
      onDragOver={handleDragOver}
      onDrop={onDrop}
      data-orb-composer
      data-orb-standalone-composer
      data-testid="orb-standalone-composer"
    >
      <div className="mx-auto w-full max-w-[var(--orb-composer-max,53.125rem)]">
        {voiceCaptureEnabled && transcriptReady && displayTranscript ? (
          <div className="mb-3 rounded-2xl border border-teal-300/20 bg-teal-400/[0.06] px-4 py-3">
            <p className="text-xs font-semibold text-teal-200/90">I heard you say…</p>
            <p className="mt-1 text-sm italic text-slate-100">&ldquo;{displayTranscript}&rdquo;</p>
            {!autoSend ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSendTranscript}
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cyan-400/20 px-4 text-xs font-semibold text-cyan-50"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Send
                </button>
                <button
                  type="button"
                  onClick={onRetryTranscript}
                  className="inline-flex h-9 items-center rounded-full border border-white/12 px-4 text-xs font-medium text-slate-300"
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
            onSubmit(event)
          }}
        >
          <label htmlFor="orb-standalone-input" className="sr-only">
            Message ORB
          </label>
          <div className="rounded-[1.75rem] border border-white/10 bg-[#0c1018]/95 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.04] focus-within:border-cyan-300/30 focus-within:ring-cyan-300/20">
            {attachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2 px-1 pt-1">
                {attachments.map((file) => (
                  <div key={file.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={file.previewUrl} alt={file.name} className="h-14 w-14 rounded-xl border border-white/12 object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(file.id)}
                      className="absolute -right-1 -top-1 rounded-full border border-white/15 bg-slate-950 p-0.5 text-slate-300"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {documentAttached ? (
              <div className="mb-2 flex flex-wrap items-center gap-2 px-1 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  {documentTitle || 'Document attached'}
                </span>
                {onAnalyseDocument ? (
                  <button type="button" onClick={onAnalyseDocument} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.06]">
                    Analyse document
                  </button>
                ) : null}
                {onDocumentActionPlan ? (
                  <button type="button" onClick={onDocumentActionPlan} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.06]">
                    Create action plan
                  </button>
                ) : null}
                {onSummariseDocument ? (
                  <button type="button" onClick={onSummariseDocument} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.06]">
                    Summarise
                  </button>
                ) : null}
                {onAddDocumentToLibrary ? (
                  <button type="button" onClick={onAddDocumentToLibrary} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/[0.06]">
                    Add to Knowledge Library
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-end gap-1">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                aria-label="Attach image"
                data-orb-composer-attach
              >
                <Plus className="h-5 w-5" aria-hidden />
              </button>
              {onAttachDocumentClick ? (
                <button
                  type="button"
                  onClick={onAttachDocumentClick}
                  className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                  aria-label="Attach document"
                  data-orb-composer-document
                >
                  <FileText className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200 md:hidden"
                aria-label="Use camera"
              >
                <Camera className="h-5 w-5" aria-hidden />
              </button>
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
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    onSubmit(event)
                  }
                }}
                rows={1}
                className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-6 text-white outline-none placeholder:text-slate-500 [touch-action:manipulation]"
                placeholder="Message ORB…"
                disabled={pending}
                aria-describedby="orb-standalone-status"
                data-orb-composer-input
                data-testid="orb-standalone-message-input"
                data-input-source="controlled"
              />
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
                  voiceListening ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                }`}
                data-orb-composer-mic
                data-no-navigation-rescue="true"
              >
                {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="submit"
                disabled={sendDisabled}
                aria-label="Send message"
                onClick={(event) => logTapTarget(event, 'orb-standalone-send-click')}
                onPointerUp={(event) => {
                  if (event.pointerType !== 'touch') return
                  logTapTarget(event, 'orb-standalone-send-pointer')
                }}
                className="pointer-events-auto inline-flex h-11 min-h-11 min-w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-slate-100 disabled:opacity-35"
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

          <div className="orb-voice-status-slot mt-1.5 flex min-h-[1.25rem] flex-wrap items-center justify-between gap-2 px-2">
            {voiceStatusText ? (
              <p id="orb-standalone-status" className="text-[11px] leading-5 text-slate-500" role="status" data-orb-voice-status>
                {voiceStatusText}
              </p>
            ) : (
              <span id="orb-standalone-status" className="sr-only" data-orb-voice-status>
                Ready to type
              </span>
            )}
            <span className="sr-only">Mode: {mode}</span>
          </div>

          {voiceCaptureEnabled && voiceListening ? (
            <div className="mt-1.5 px-2">
              <button
                type="button"
                onClick={onCancelListening}
                className="inline-flex h-7 items-center rounded-full border border-white/10 px-3 text-[11px] font-medium text-slate-400"
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
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 text-[11px] font-semibold text-amber-50"
              >
                <Square className="h-3 w-3 fill-current" />
                Stop speaking
              </button>
            </div>
          ) : null}
        </form>

        <p className="mt-2 px-2 text-center text-[10px] leading-4 text-slate-600" data-orb-composer-disclaimer>
          Standalone ORB can make mistakes. It does not access IndiCare OS records.
        </p>
      </div>
    </div>
  )
}

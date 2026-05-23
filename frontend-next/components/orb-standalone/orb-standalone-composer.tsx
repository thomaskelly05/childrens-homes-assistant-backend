'use client'

import { FormEvent, useRef, type DragEvent } from 'react'
import { FileText, ImagePlus, Mic, MicOff, Send, Square, X } from 'lucide-react'

import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type PendingImageAttachment = {
  id: string
  dataUrl: string
  name: string
  previewUrl: string
}

export function OrbStandaloneComposer({
  input,
  pending,
  mode,
  attachments,
  voiceListening,
  voiceSpeaking,
  voiceRecognitionAvailable,
  voiceStatusText,
  voiceReplies,
  synthesisAvailable,
  transcriptReady,
  displayTranscript,
  autoSend,
  onInputChange,
  onSubmit,
  onMicClick,
  onCancelListening,
  onStopSpeaking,
  onToggleVoiceReplies,
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
  input: string
  pending: boolean
  mode: StandaloneOrbMode
  attachments: PendingImageAttachment[]
  voiceListening: boolean
  voiceSpeaking: boolean
  voiceRecognitionAvailable: boolean
  voiceStatusText: string
  voiceReplies: boolean
  synthesisAvailable: boolean
  transcriptReady: boolean
  displayTranscript: string
  autoSend: boolean
  onInputChange: (value: string) => void
  onSubmit: (event?: FormEvent | { preventDefault?: () => void }) => void
  onMicClick: () => void
  onCancelListening: () => void
  onStopSpeaking: () => void
  onToggleVoiceReplies: () => void
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

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      className="orb-chat-composer shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-[#05070d] via-[#05070d]/98 to-transparent px-3 pt-3 md:px-6 md:pt-4"
      onDragOver={handleDragOver}
      onDrop={onDrop}
    >
      <div className="mx-auto w-full max-w-[var(--orb-composer-max,53.125rem)]">
        {transcriptReady && displayTranscript ? (
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

        <form className="w-full" onSubmit={(event) => onSubmit(event)}>
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

            <div className="flex items-end gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) onAddFiles(event.target.files)
                  event.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                aria-label="Upload image"
              >
                <ImagePlus className="h-5 w-5" aria-hidden />
              </button>
              {onAttachDocumentClick ? (
                <button
                  type="button"
                  onClick={onAttachDocumentClick}
                  className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                  aria-label="Attach document"
                >
                  <FileText className="h-5 w-5" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onMicClick}
                disabled={!voiceRecognitionAvailable}
                aria-label={voiceListening ? 'Stop listening' : 'Start voice input'}
                className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                  voiceListening ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                }`}
              >
                {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <textarea
                ref={inputRef}
                id="orb-standalone-input"
                value={input}
                onChange={(event) => onInputChange(event.target.value)}
                onPaste={onPaste}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    onSubmit(event)
                  }
                }}
                rows={1}
                className="max-h-44 min-h-[3rem] flex-1 resize-none bg-transparent px-1 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-500"
                placeholder="Message ORB Care Companion…"
                disabled={pending}
                aria-describedby="orb-standalone-status"
              />
              <button
                type="button"
                disabled={pending || (!input.trim() && attachments.length === 0)}
                aria-label="Send message"
                onClick={() => onSubmit()}
                className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-slate-100 disabled:opacity-35"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2">
            <p id="orb-standalone-status" className="text-xs leading-5 text-slate-500" role="status">
              {voiceStatusText}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-500">{mode}</span>
              <button
                type="button"
                onClick={onToggleVoiceReplies}
                disabled={!synthesisAvailable}
                className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-500 disabled:opacity-40"
              >
                Voice replies: {voiceReplies ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {voiceListening || voiceSpeaking ? (
            <div className="mt-2 flex flex-wrap gap-2 px-2">
              {voiceListening ? (
                <button
                  type="button"
                  onClick={onCancelListening}
                  className="inline-flex h-8 items-center rounded-full border border-white/10 px-3 text-xs font-medium text-slate-400"
                >
                  Cancel listening
                </button>
              ) : null}
              {voiceSpeaking ? (
                <button
                  type="button"
                  onClick={onStopSpeaking}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-50"
                >
                  <Square className="h-3 w-3 fill-current" />
                  Stop speaking
                </button>
              ) : null}
            </div>
          ) : null}
        </form>

        <p className="mt-3 px-2 text-center text-[11px] leading-5 text-slate-500">
          Standalone ORB can make mistakes. It does not access IndiCare OS records.
        </p>
      </div>
    </div>
  )
}

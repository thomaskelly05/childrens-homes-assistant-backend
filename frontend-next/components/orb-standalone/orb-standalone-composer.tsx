'use client'

import { FormEvent, useRef, type DragEvent } from 'react'
import { ImagePlus, Mic, MicOff, Send, Square, X } from 'lucide-react'

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
  onDrop
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
  onSubmit: (event?: FormEvent) => void
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
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      className="orb-chat-composer shrink-0 border-t border-white/10 bg-[#0a0e16]/95 p-3 backdrop-blur-xl md:p-4"
      onDragOver={handleDragOver}
      onDrop={onDrop}
    >
      {transcriptReady && displayTranscript ? (
        <div className="mx-auto mb-3 max-w-3xl rounded-2xl border border-teal-300/25 bg-teal-300/8 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-200/90">I heard you say…</p>
          <p className="mt-1 text-sm italic text-slate-100">&ldquo;{displayTranscript}&rdquo;</p>
          {!autoSend ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onSendTranscript} disabled={pending} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cyan-300/20 px-4 text-xs font-black text-cyan-50">
                <Send className="h-3.5 w-3.5" aria-hidden />
                Send
              </button>
              <button type="button" onClick={onRetryTranscript} className="inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-xs font-bold text-slate-300">
                Try again
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mx-auto mb-3 flex max-w-3xl flex-wrap gap-2">
          {attachments.map((file) => (
            <div key={file.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.previewUrl} alt={file.name} className="h-16 w-16 rounded-xl border border-white/15 object-cover" />
              <button
                type="button"
                onClick={() => onRemoveAttachment(file.id)}
                className="absolute -right-1 -top-1 rounded-full border border-white/20 bg-slate-950 p-0.5 text-slate-300"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form className="mx-auto max-w-3xl" onSubmit={(event) => onSubmit(event)}>
        <label htmlFor="orb-standalone-input" className="sr-only">
          Message ORB
        </label>
        <div className="flex items-end gap-2 rounded-[28px] border border-white/12 bg-slate-950/90 p-2 shadow-lg shadow-black/20 focus-within:border-cyan-300/35 focus-within:ring-2 focus-within:ring-cyan-300/25">
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
            className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 hover:border-cyan-300/40"
            aria-label="Upload image"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onMicClick}
            disabled={!voiceRecognitionAvailable}
            aria-label={voiceListening ? 'Stop listening' : 'Start voice input'}
            className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${
              voiceListening ? 'border-cyan-300/60 bg-cyan-300/20 text-cyan-50' : 'border-white/15 bg-white/5 text-slate-200'
            }`}
          >
            {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <textarea
            id="orb-standalone-input"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onPaste={onPaste}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSubmit()
              }
            }}
            rows={1}
            className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-1 py-2.5 text-base text-white outline-none placeholder:text-slate-500"
            placeholder="Message ORB Care Companion…"
            disabled={pending}
            aria-describedby="orb-standalone-status"
          />
          <button
            type="submit"
            disabled={pending || (!input.trim() && attachments.length === 0)}
            aria-label="Send message"
            className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#67e8f9,#a78bfa)] text-slate-950 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p id="orb-standalone-status" className="text-xs leading-5 text-slate-400" role="status">
            {voiceStatusText}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400">{mode}</span>
            <button
              type="button"
              onClick={onToggleVoiceReplies}
              disabled={!synthesisAvailable}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-400 disabled:opacity-40"
            >
              Voice replies: {voiceReplies ? 'On' : 'Off'}
            </button>
          </div>
        </div>
        {voiceListening || voiceSpeaking ? (
          <div className="mt-2 flex flex-wrap gap-2 px-1">
            {voiceListening ? (
              <button type="button" onClick={onCancelListening} className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-xs font-bold text-slate-300">
                Cancel listening
              </button>
            ) : null}
            {voiceSpeaking ? (
              <button type="button" onClick={onStopSpeaking} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/15 px-3 text-xs font-black text-amber-50">
                <Square className="h-3 w-3 fill-current" />
                Stop speaking
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
      <p className="mx-auto mt-3 max-w-3xl px-1 text-[11px] leading-5 text-slate-500">
        ORB may make mistakes. Standalone mode — no IndiCare OS records accessed. ORB remembers this chat while stored on this device only.
      </p>
    </div>
  )
}

'use client'

import { Keyboard, Mic, MicOff, Pause, Send, ShieldCheck, Square, VolumeX } from 'lucide-react'

import type { OrbState } from '@/lib/orb/types'

export function OrbControls({
  state,
  microphone,
  input,
  loading,
  privateMode,
  muted,
  onInputChange,
  onSend,
  onRequestMicrophone,
  onInterrupt,
  onMute,
  onPrivateMode,
  onEnd
}: {
  state: OrbState
  microphone: string
  input: string
  loading: boolean
  privateMode: boolean
  muted: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  onRequestMicrophone: () => void
  onInterrupt: () => void
  onMute: (value: boolean) => void
  onPrivateMode: (value: boolean) => void
  onEnd: () => void
}) {
  const isSpeaking = state === 'speaking' || loading

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={onRequestMicrophone}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Mic className="mr-2 inline h-4 w-4" aria-hidden />
          {microphone === 'granted' ? 'Mic ready' : 'Grant mic'}
        </button>
        <button
          type="button"
          onClick={onInterrupt}
          disabled={!isSpeaking}
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
        >
          <Pause className="mr-2 inline h-4 w-4" aria-hidden />
          Interrupt
        </button>
        <button
          type="button"
          onClick={() => onMute(!muted)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
        >
          {muted ? <MicOff className="mr-2 inline h-4 w-4" aria-hidden /> : <VolumeX className="mr-2 inline h-4 w-4" aria-hidden />}
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          onClick={() => onPrivateMode(!privateMode)}
          className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
            privateMode ? 'border-purple-200 bg-purple-50 text-purple-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden />
          Private
        </button>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
      >
        <label className="sr-only" htmlFor="orb-text-input">Type to Orb</label>
        <input
          id="orb-text-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder='Try "Hey IndiCare, what needs manager review?"'
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <button disabled={!input.trim() || loading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only">Send</span>
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs leading-5 text-slate-500">
        <span><Keyboard className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Shortcut foundation: Ctrl+Shift+Space</span>
        <button type="button" onClick={onEnd} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 font-black text-slate-600 hover:bg-slate-200">
          <Square className="mr-1 h-3.5 w-3.5" aria-hidden />
          End session
        </button>
      </div>
    </div>
  )
}


'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

const VOICE_PRIVACY_COPY =
  'Voice conversations are processed to answer your request. Do not share emergency information if immediate action is required — follow your home\'s procedures.'

export function OrbVoiceStation({
  open,
  onClose,
  voice,
  onSendToOrb,
  pending = false
}: {
  open: boolean
  onClose: () => void
  voice: VoiceApi
  onSendToOrb: (text: string) => void | Promise<void>
  pending?: boolean
}) {
  const [active, setActive] = useState(false)
  const [transcriptLines, setTranscriptLines] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const lastSentRef = useRef('')

  const resetSession = useCallback(() => {
    setActive(false)
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.clearTranscript()
    lastSentRef.current = ''
  }, [voice])

  useEffect(() => {
    if (!open) resetSession()
  }, [open, resetSession])

  useEffect(() => {
    if (!active || !open) return
    const text = (voice.transcript || voice.displayTranscript || '').trim()
    if (!text || text === lastSentRef.current) return
    if (voice.phase !== 'transcript_ready' && !voice.transcript) return
    if (pending) return

    lastSentRef.current = text
    setTranscriptLines((lines) => [...lines, { role: 'user', text }])
    voice.clearTranscript()
    void Promise.resolve(onSendToOrb(text))
  }, [
    active,
    open,
    voice.transcript,
    voice.displayTranscript,
    voice.phase,
    pending,
    onSendToOrb,
    voice
  ])

  function handleStart() {
    if (!voice.recognitionAvailable) return
    setActive(true)
    voice.startListening()
  }

  function handleEnd() {
    resetSession()
    onClose()
  }

  return (
    <OrbAppModal
      open={open}
      title="ORB Voice"
      subtitle="Turn-based voice conversation with ORB Residential"
      onClose={() => {
        resetSession()
        onClose()
      }}
      panelId="orb-voice"
      size="standard"
    >
      <div className="flex flex-col items-center p-4 pb-6" data-orb-voice-station>
        <GlassOrbMark
          size="hero"
          pulse={pending || voice.speaking || voice.listening}
          className={pending || voice.speaking ? 'glass-orb-mark--thinking glass-orb-mark--voice' : 'glass-orb-mark--voice'}
        />

        <p className="mt-6 text-center text-sm font-medium text-[var(--orb-foreground)]">
          {active ? (voice.listening ? 'Listening…' : pending ? 'ORB is thinking…' : voice.speaking ? 'Speaking…' : 'Your turn') : 'Start voice conversation'}
        </p>

        <p className="mt-1 text-center text-xs text-[var(--orb-muted)]" data-orb-voice-mic-status>
          {voice.recognitionAvailable
            ? active
              ? 'Microphone active after you tapped Start'
              : 'Microphone starts only when you tap Start'
            : 'Voice input is not available in this browser — use text in chat.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {!active ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={!voice.recognitionAvailable}
              className="rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-50"
              data-orb-voice-start
            >
              Start
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => (voice.listening ? voice.cancelListening() : voice.startListening())}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]"
                data-orb-voice-mute-toggle
                aria-label={voice.listening ? 'Mute microphone' : 'Unmute microphone'}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {voice.listening ? 'Mute' : 'Speak'}
              </button>
              {voice.speaking ? (
                <button
                  type="button"
                  onClick={voice.cancelSpeaking}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 px-4 py-2 text-sm font-medium text-rose-200"
                  data-orb-voice-stop-speaking
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop speaking
                </button>
              ) : null}
            </>
          )}
          <button
            type="button"
            onClick={handleEnd}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
            data-orb-voice-end
          >
            End conversation
          </button>
        </div>

        {transcriptLines.length > 0 ? (
          <div
            className="mt-6 max-h-[min(32vh,16rem)] w-full overflow-y-auto rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-3 text-left"
            data-orb-voice-transcript
          >
            {transcriptLines.map((line, index) => (
              <p key={`${line.role}-${index}`} className="mb-2 text-xs leading-5 last:mb-0">
                <span className="font-semibold text-[#5ec8ff]">{line.role === 'user' ? 'You' : 'ORB'}: </span>
                <span className="text-[var(--orb-foreground)]">{line.text}</span>
              </p>
            ))}
          </div>
        ) : null}

        <p className="mt-6 max-w-md text-center text-[10px] leading-4 text-[var(--orb-muted)]">{VOICE_PRIVACY_COPY}</p>
      </div>
    </OrbAppModal>
  )
}

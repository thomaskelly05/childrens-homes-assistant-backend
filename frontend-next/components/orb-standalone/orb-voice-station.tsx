'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Save, Square } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { stripMarkdownForSpeech } from '@/lib/orb/orb-speech-text'
import type { OrbVoiceSessionResponse } from '@/lib/orb/voice/orb-voice-client'
import { OrbRealtimeVoiceClient } from '@/lib/orb/voice/orb-realtime-voice-client'
import { frameMessageForOrbVoice } from '@/lib/orb/voice/orb-voice-prompt'
import { saveVoiceTranscript } from '@/lib/orb/voice/save-voice-transcript'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { getOrbVoiceProfile, orbVoiceProfileLabel } from '@/lib/orb/voice/orb-voice-profiles'
import {
  ORB_VOICE_GREETING,
  ORB_VOICE_MODES,
  ORB_VOICE_PRESETS,
  type OrbVoiceModeId,
  type OrbVoicePresetId,
  type OrbVoiceSessionStatus,
  type VoiceTurn
} from '@/lib/orb/voice/orb-voice-types'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

const SAFETY_COPY =
  'ORB Voice supports professional judgement. If there is immediate risk, follow your home\'s procedures and contact emergency services where required.'

function newTurnId() {
  return `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function mapPhaseToStatus(
  phase: VoiceApi['phase'],
  pending: boolean,
  listening: boolean,
  speaking: boolean,
  realtimeState: OrbVoiceSessionStatus | null
): OrbVoiceSessionStatus {
  if (realtimeState && realtimeState !== 'idle') return realtimeState
  if (phase === 'error') return 'error'
  if (phase === 'interrupted') return 'interrupted'
  if (pending) return 'thinking'
  if (speaking) return 'speaking'
  if (phase === 'transcript_ready') return 'transcribing'
  if (listening) return 'listening'
  if (phase === 'listening' || phase === 'continuous_listening') return 'listening'
  return 'idle'
}

function orbVisualClass(status: OrbVoiceSessionStatus): string {
  switch (status) {
    case 'listening':
    case 'speech_detected':
    case 'connecting':
      return 'glass-orb-mark--voice glass-orb-mark--listening'
    case 'thinking':
    case 'transcribing':
      return 'glass-orb-mark--thinking glass-orb-mark--voice'
    case 'speaking':
      return 'glass-orb-mark--voice glass-orb-mark--speaking'
    case 'interrupted':
      return 'glass-orb-mark--voice glass-orb-mark--interrupted'
    case 'error':
      return 'glass-orb-mark--voice glass-orb-mark--error'
    default:
      return 'glass-orb-mark--voice glass-orb-mark--idle'
  }
}

function statusLabel(status: OrbVoiceSessionStatus, permissionDenied: boolean): string {
  if (permissionDenied) return 'Microphone access was denied. You can still type to ORB.'
  switch (status) {
    case 'requesting_permission':
      return 'Checking microphone…'
    case 'connecting':
      return 'Connecting voice…'
    case 'listening':
    case 'speech_detected':
      return 'Listening…'
    case 'transcribing':
      return 'Processing what you said…'
    case 'thinking':
      return 'ORB is thinking…'
    case 'speaking':
      return 'ORB is speaking…'
    case 'interrupted':
      return 'Interrupted — listening again'
    case 'error':
      return 'Voice unavailable — you can still type'
    case 'ended':
      return 'Voice session ended'
    default:
      return 'Ready when you press Start'
  }
}

function providerUserLabel(
  session: OrbVoiceSessionResponse | null,
  profileLabel: string
): string {
  if (!session) return profileLabel
  if (session.provider === 'openai_realtime') {
    return `${profileLabel} · OpenAI Realtime`
  }
  if (session.provider === 'websocket_realtime') {
    return `${profileLabel} · Realtime (WebSocket)`
  }
  if (session.provider === 'webrtc_realtime') {
    return `${profileLabel} · Realtime (WebRTC)`
  }
  if (session.fallback_reason) {
    return `${profileLabel} · Browser voice (realtime not configured)`
  }
  return `${profileLabel} · Browser voice`
}

export function OrbVoiceStation({
  open,
  onClose,
  voice,
  onSendToOrb,
  pending = false,
  assistantReply = null,
  assistantReplyKey = null
}: {
  open: boolean
  onClose: () => void
  voice: VoiceApi
  onSendToOrb: (text: string) => void | Promise<void>
  pending?: boolean
  assistantReply?: string | null
  assistantReplyKey?: string | null
}) {
  const [sessionActive, setSessionActive] = useState(false)
  const [turns, setTurns] = useState<VoiceTurn[]>([])
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [voiceSession, setVoiceSession] = useState<OrbVoiceSessionResponse | null>(null)
  const [realtimeUiState, setRealtimeUiState] = useState<OrbVoiceSessionStatus | null>(null)
  const [devEvents, setDevEvents] = useState<string[]>([])
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null)
  const realtimeRef = useRef<OrbRealtimeVoiceClient | null>(null)
  const lastSentRef = useRef('')
  const lastAssistantKeyRef = useRef<string | null>(null)
  const greetedRef = useRef(false)
  const developerMode = isOrbDeveloperMode()
  const permissionDenied = Boolean(voice.error?.toLowerCase().includes('microphone'))

  const status = mapPhaseToStatus(
    voice.phase,
    pending,
    voice.listening,
    voice.speaking,
    realtimeUiState
  )
  const { settings } = voice
  const selectedProfileLabel = orbVoiceProfileLabel(settings.voicePresetId)
  const providerLabel = providerUserLabel(voiceSession, selectedProfileLabel)
  const selectedProfile = getOrbVoiceProfile(settings.voicePresetId)

  const resetSession = useCallback(() => {
    setSessionActive(false)
    greetedRef.current = false
    realtimeRef.current?.stop()
    realtimeRef.current = null
    setVoiceSession(null)
    setRealtimeUiState(null)
    setDevEvents([])
    voice.cancelListening()
    voice.cancelSpeaking()
    voice.clearTranscript()
    lastSentRef.current = ''
    lastAssistantKeyRef.current = null
    voice.endVoiceSession()
  }, [voice])

  useEffect(() => {
    if (!open) resetSession()
  }, [open, resetSession])

  useEffect(() => {
    if (!sessionActive || !open) return
    const text = (voice.transcript || voice.displayTranscript || '').trim()
    if (!text || text === lastSentRef.current) return
    if (voice.phase !== 'transcript_ready' && !voice.transcript) return
    if (pending) return

    lastSentRef.current = text
    const userTurn: VoiceTurn = {
      id: newTurnId(),
      role: 'user',
      text,
      startedAt: new Date().toISOString(),
      mode: settings.voiceMode
    }
    setTurns((prev) => [...prev, userTurn])
    voice.clearTranscript()
    const framed = frameMessageForOrbVoice(text, {
      mode: settings.voiceMode,
      spokenAnswerLength: settings.spokenAnswerLength,
      voiceProfileId: settings.voicePresetId
    })
    void Promise.resolve(onSendToOrb(framed))
  }, [
    sessionActive,
    open,
    voice.transcript,
    voice.displayTranscript,
    voice.phase,
    pending,
    onSendToOrb,
    voice,
    settings.voiceMode,
    settings.spokenAnswerLength
  ])

  useEffect(() => {
    if (!sessionActive || !open || !assistantReply?.trim() || pending) return
    const key = assistantReplyKey ?? assistantReply
    if (key === lastAssistantKeyRef.current) return
    lastAssistantKeyRef.current = key

    const spoken = stripMarkdownForSpeech(assistantReply)
    const turn: VoiceTurn = {
      id: newTurnId(),
      role: 'assistant',
      text: assistantReply.trim(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      mode: settings.voiceMode
    }
    setTurns((prev) => [...prev, turn])

    if (settings.voiceReplies && voice.synthesisAvailable && spoken) {
      voice.speakAloud(spoken, () => {
        if (!settings.pushToTalk && sessionActive) {
          void voice.beginUserVoiceCapture()
        }
      })
    } else if (!settings.pushToTalk && sessionActive && voice.recognitionAvailable) {
      void voice.beginUserVoiceCapture()
    }
  }, [
    assistantReply,
    assistantReplyKey,
    pending,
    sessionActive,
    open,
    settings.voiceMode,
    settings.voiceReplies,
    settings.pushToTalk,
    voice
  ])

  async function handleStart() {
    if (!voice.recognitionAvailable) return
    voice.resumeVoiceSession()
    setSessionActive(true)
    greetedRef.current = true
    setSessionStartedAt(new Date().toISOString())
    setRealtimeUiState('connecting')

    const client = new OrbRealtimeVoiceClient({
      onStateChange: setRealtimeUiState,
      onProviderResolved: setVoiceSession,
      onFinalTranscript: (text) => {
        if (!text.trim()) return
        voice.clearTranscript()
        setTurns((prev) => [
          ...prev,
          {
            id: newTurnId(),
            role: 'user',
            text,
            startedAt: new Date().toISOString(),
            mode: settings.voiceMode,
            provider: voiceSession?.provider
          }
        ])
        const framed = frameMessageForOrbVoice(text, {
          mode: settings.voiceMode,
          spokenAnswerLength: settings.spokenAnswerLength,
          voiceProfileId: settings.voicePresetId
        })
        void Promise.resolve(onSendToOrb(framed))
      },
      onServerEvent: (event) => {
        if (developerMode) {
          setDevEvents((prev) => [`${event.type}`, ...prev].slice(0, 8))
        }
      },
      onError: () => {
        setRealtimeUiState('error')
      }
    })
    realtimeRef.current = client

    const session = await client.startSession({
      mode: settings.voiceMode,
      voice_id: settings.voicePresetId,
      transport: 'auto'
    })
    setVoiceSession(session)

    setTurns([
      {
        id: newTurnId(),
        role: 'system',
        text: ORB_VOICE_GREETING,
        startedAt: new Date().toISOString(),
        mode: settings.voiceMode,
        provider: session.provider
      }
    ])

    const beginBrowserCapture = () => {
      if (settings.voiceReplies && voice.synthesisAvailable) {
        voice.speakAloud(ORB_VOICE_GREETING, () => {
          void voice.beginUserVoiceCapture()
        })
      } else {
        void voice.beginUserVoiceCapture()
      }
    }

    if (client.usesWebSocket && session.capabilities.supportsStreamingStt) {
      await client.startMicrophone({
        vadEnabled: true,
        bargeInWhileSpeaking: settings.allowInterruption
      })
    } else {
      beginBrowserCapture()
    }
  }

  async function handleInterrupt() {
    setTurns((prev) => {
      if (!prev.length) return prev
      const last = prev[prev.length - 1]
      if (last.role !== 'assistant') return prev
      return [...prev.slice(0, -1), { ...last, interrupted: true }]
    })
    await realtimeRef.current?.interrupt()
    voice.interruptForListen()
  }

  function handleEnd() {
    resetSession()
    onClose()
  }

  async function handleSaveTranscript() {
    const result = await saveVoiceTranscript(
      turns.filter((t) => t.role === 'user' || t.role === 'assistant'),
      {
        mode: settings.voiceMode,
        provider: voiceSession?.provider ?? 'browser_fallback',
        startedAt: sessionStartedAt ?? undefined,
        endedAt: new Date().toISOString()
      }
    )
    setSaveNotice(result.message)
    window.setTimeout(() => setSaveNotice(null), 5000)
  }

  const showInterrupt =
    sessionActive && voice.speaking && settings.allowInterruption

  return (
    <OrbAppModal
      open={open}
      title="ORB Voice"
      subtitle="A conversational voice copilot for residential childcare."
      onClose={() => {
        resetSession()
        onClose()
      }}
      panelId="orb-voice"
      size="wide"
    >
      <div className="orb-voice-room flex flex-col items-center p-6 pb-8" data-orb-voice-station>
        <div className="flex w-full max-w-lg flex-wrap items-center justify-center gap-2">
          <label className="sr-only" htmlFor="orb-voice-mode-select">
            Voice mode
          </label>
          <select
            id="orb-voice-mode-select"
            value={settings.voiceMode}
            onChange={(e) => voice.setVoiceMode(e.target.value as OrbVoiceModeId)}
            className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
            data-orb-voice-mode-select
          >
            {ORB_VOICE_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="orb-voice-preset-select">
            Voice
          </label>
          <select
            id="orb-voice-preset-select"
            value={settings.voicePresetId}
            onChange={(e) => voice.setVoicePresetId(e.target.value as OrbVoicePresetId)}
            className="rounded-full border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)]/80 px-3 py-1.5 text-xs text-[var(--orb-foreground)]"
            data-orb-voice-preset-select
            aria-label="Voice profile"
          >
            {ORB_VOICE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {!sessionActive ? (
          <p className="mt-2 text-center text-[11px] text-[var(--orb-muted)]" data-orb-voice-selected-profile>
            Voice: {selectedProfile.label} — {selectedProfile.description}
          </p>
        ) : null}

        <GlassOrbMark
          size="hero"
          pulse={
            status === 'listening' ||
            status === 'speech_detected' ||
            status === 'connecting' ||
            status === 'thinking' ||
            status === 'speaking'
          }
          className={`mt-6 ${orbVisualClass(status)}`}
        />

        <p className="mt-6 text-center text-sm font-medium text-[var(--orb-foreground)]" data-orb-voice-status-label>
          {sessionActive ? statusLabel(status, permissionDenied) : 'Start a voice conversation'}
        </p>

        <p className="mt-2 text-center text-sm text-[var(--orb-muted)]" data-orb-voice-mic-status>
          {voice.recognitionAvailable
            ? sessionActive
              ? settings.pushToTalk
                ? 'Push-to-talk — use Speak when you are ready.'
                : 'Hands-free in this session — ORB will listen again after speaking.'
              : 'Voice starts only when you press Start.'
            : 'Voice input is not available in this browser.'}
        </p>

        {sessionActive && providerLabel ? (
          <p className="mt-1 text-center text-[10px] text-[var(--orb-muted)]" data-orb-voice-provider>
            {providerLabel}
          </p>
        ) : null}

        {developerMode && sessionActive && voiceSession ? (
          <div
            className="mt-2 max-w-md rounded-lg border border-dashed border-[var(--orb-line)]/50 px-3 py-2 text-left text-[10px] text-[var(--orb-muted)]"
            data-orb-voice-developer-details
          >
            <p>
              Provider: {voiceSession.provider} · profile: {voiceSession.selected_voice_profile ?? settings.voicePresetId}
              {voiceSession.provider_voice ? ` · OpenAI voice: ${voiceSession.provider_voice}` : ''}
            </p>
            <p>
              Status: {voiceSession.status} · latency: {voiceSession.capabilities.latencyClass}
            </p>
            {voiceSession.websocket_url ? <p>WebSocket: {voiceSession.websocket_url}</p> : null}
            {devEvents.length ? <p className="mt-1 truncate">Events: {devEvents.join(' · ')}</p> : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {!sessionActive ? (
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!voice.recognitionAvailable}
              className="rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 disabled:opacity-50"
              data-orb-voice-start
            >
              Start conversation
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  voice.listening ? voice.cancelListening() : void voice.beginUserVoiceCapture()
                }
                className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]"
                data-orb-voice-mute-toggle
                aria-label={voice.listening ? 'Mute microphone' : 'Speak'}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {voice.listening ? 'Mute' : 'Speak'}
              </button>
              {showInterrupt ? (
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100"
                  data-orb-voice-interrupt
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Interrupt
                </button>
              ) : voice.speaking ? (
                <button
                  type="button"
                  onClick={voice.cancelSpeaking}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-muted)]"
                  data-orb-voice-stop-speaking
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop speaking
                </button>
              ) : null}
              {settings.saveTranscript && turns.length > 1 ? (
                <button
                  type="button"
                  onClick={() => void handleSaveTranscript()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--orb-line)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)]"
                  data-orb-voice-save-transcript
                >
                  <Save className="h-4 w-4" />
                  Save transcript
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
            End
          </button>
        </div>

        {saveNotice ? (
          <p className="mt-3 text-center text-xs text-[#5ec8ff]" role="status">
            {saveNotice}
          </p>
        ) : null}

        {turns.length > 0 ? (
          <div
            className="orb-voice-transcript mt-6 max-h-[min(36vh,18rem)] w-full overflow-y-auto rounded-2xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/60 p-4 text-left backdrop-blur-md"
            data-orb-voice-transcript
          >
            {turns.map((line) => (
              <div
                key={line.id}
                className="mb-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2 last:mb-0"
                data-orb-voice-turn={line.role}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5ec8ff]/90">
                  {line.role === 'user' ? 'You' : line.role === 'assistant' ? 'ORB' : 'ORB'}
                  {line.interrupted ? ' · Interrupted' : ''}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--orb-foreground)]">{line.text}</p>
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-6 max-w-md text-center text-[10px] leading-4 text-[var(--orb-muted)]">{SAFETY_COPY}</p>
      </div>
    </OrbAppModal>
  )
}

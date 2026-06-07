'use client'

import { useEffect, useState } from 'react'

import { getActiveOrbRealtimeVoiceClient } from './orb-voice-session-registry'

function resolveAssistantAudioElement(
  audioElement?: HTMLAudioElement | null
): HTMLAudioElement | null {
  if (audioElement) return audioElement
  if (typeof window === 'undefined') return null
  return getActiveOrbRealtimeVoiceClient()?.getAssistantAudioElement() ?? null
}

function createAnalyserSource(
  audioContext: AudioContext,
  audio: HTMLAudioElement
): { source: AudioNode; cleanup: () => void } | null {
  const stream = audio.srcObject
  if (stream instanceof MediaStream) {
    const source = audioContext.createMediaStreamSource(stream)
    return {
      source,
      cleanup: () => {
        try {
          source.disconnect()
        } catch {
          /* already disconnected */
        }
      }
    }
  }

  try {
    const source = audioContext.createMediaElementSource(audio)
    return {
      source,
      cleanup: () => {
        try {
          source.disconnect()
        } catch {
          /* already disconnected */
        }
      }
    }
  } catch {
    return null
  }
}

/**
 * Samples ORB voice output amplitude (0–1) for mouth-light reactivity.
 * Falls back to 0 when no audio element is available — CSS keyframes handle speaking motion.
 */
export function useOrbVoiceSpeechEnergy(
  speaking: boolean,
  audioElement?: HTMLAudioElement | null
): number {
  const [energy, setEnergy] = useState(0)

  useEffect(() => {
    if (!speaking) {
      setEnergy(0)
      return
    }

    const audio = resolveAssistantAudioElement(audioElement)
    if (!audio) {
      setEnergy(0)
      return
    }

    let cancelled = false
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let sourceCleanup: (() => void) | null = null
    let raf = 0
    let samples: Uint8Array<ArrayBuffer> | null = null

    const start = async () => {
      try {
        audioContext = new AudioContext()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.72

        const wired = createAnalyserSource(audioContext, audio)
        if (!wired) return

        wired.source.connect(analyser)
        analyser.connect(audioContext.destination)
        sourceCleanup = wired.cleanup
        samples = new Uint8Array(analyser.frequencyBinCount)

        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }
        if (cancelled) return

        const tick = () => {
          if (!analyser || !samples || cancelled) return
          analyser.getByteTimeDomainData(samples)
          let sum = 0
          for (let i = 0; i < samples.length; i += 1) {
            const normalized = (samples[i] - 128) / 128
            sum += normalized * normalized
          }
          const rms = Math.sqrt(sum / samples.length)
          const next = Math.min(1, Math.max(0, rms * 5.2))
          setEnergy((current) => (Math.abs(current - next) < 0.01 ? current : next))
          raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)
      } catch {
        if (!cancelled) setEnergy(0)
      }
    }

    void start()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      sourceCleanup?.()
      analyser?.disconnect()
      void audioContext?.close()
      setEnergy(0)
    }
  }, [speaking, audioElement])

  return energy
}

import { isNotAllowedError } from './orb-voice-v2-permissions.ts'

export type OrbVoiceV2PlaybackState = 'idle' | 'playing' | 'blocked' | 'failed'

/** Minimal silent WAV — unlocks Safari autoplay without audible output. */
const SILENT_AUDIO_DATA_URL =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='

export type OrbVoiceV2PlaybackSession = {
  audio: HTMLAudioElement
  url: string
  blob: Blob
}

export async function unlockOrbVoiceV2AudioPlayback(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  try {
    const audio = new Audio(SILENT_AUDIO_DATA_URL)
    audio.volume = 0.001
    await audio.play()
    audio.pause()
    audio.currentTime = 0
    return true
  } catch {
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return false
      const ctx = new AudioContextCtor()
      if (ctx.state === 'suspended') await ctx.resume()
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      await ctx.close()
      return true
    } catch {
      return false
    }
  }
}

export function createOrbVoiceV2PlaybackSession(blob: Blob): OrbVoiceV2PlaybackSession {
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  return { audio, url, blob }
}

export function disposeOrbVoiceV2PlaybackSession(session: OrbVoiceV2PlaybackSession | null): void {
  if (!session) return
  try {
    session.audio.pause()
  } catch {
    /* ignore */
  }
  URL.revokeObjectURL(session.url)
}

export async function playOrbVoiceV2Audio(
  session: OrbVoiceV2PlaybackSession
): Promise<
  { ok: true; state: 'playing' } | { ok: false; state: 'blocked' | 'failed'; error: unknown }
> {
  try {
    await session.audio.play()
    return { ok: true, state: 'playing' }
  } catch (error) {
    if (isNotAllowedError(error)) {
      return { ok: false, state: 'blocked', error }
    }
    return { ok: false, state: 'failed', error }
  }
}

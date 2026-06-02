/**
 * Retains the active OrbRealtimeVoiceClient for the Voice station lifecycle.
 * Without a registry the client could be collected after begin() returns.
 */

import type { OrbRealtimeVoiceClient } from './orb-realtime-voice-client'
import type { OrbVoiceSessionResponse } from './orb-voice-client'

let activeClient: OrbRealtimeVoiceClient | null = null
let activeSession: OrbVoiceSessionResponse | null = null

export function registerActiveOrbRealtimeVoiceClient(
  client: OrbRealtimeVoiceClient,
  session: OrbVoiceSessionResponse
): void {
  activeClient?.stop()
  activeClient = client
  activeSession = session
}

export function clearActiveOrbRealtimeVoiceClient(): void {
  activeClient?.stop()
  activeClient = null
  activeSession = null
}

export function getActiveOrbRealtimeVoiceClient(): OrbRealtimeVoiceClient | null {
  return activeClient
}

export function getActiveOrbRealtimeVoiceSession(): OrbVoiceSessionResponse | null {
  return activeSession
}

'use client'

import type { OrbState } from '@/lib/orb/types'
import { cadenceForOrbState } from '@/lib/orb/state/emotional-cadence'
import { OrbSphere, type OrbRenderState } from '@/components/orb-core/orb-sphere'

const stateLabels: Record<OrbState, string> = {
  idle: 'Ready',
  connecting: 'Connecting',
  passive_listening: 'Wake word standby',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  interrupted: 'Interrupted',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  muted: 'Muted',
  unavailable: 'Unavailable',
  permission_denied: 'Microphone blocked',
  expired: 'Session expired',
  private: 'Private mode',
  recording: 'Recording',
  dictation: 'Dictation',
  safeguarding_sensitive: 'Safeguarding-sensitive',
  inspection: 'Inspection mode',
  error: 'Needs attention'
}

export function OrbVisual({ state, size = 'large' }: { state: OrbState; size?: 'small' | 'large' }) {
  const isSmall = size === 'small'
  const cadence = cadenceForOrbState(state)
  const renderState: OrbRenderState = state === 'listening' || state === 'recording' || state === 'dictation' || state === 'passive_listening'
    ? 'listening'
    : state === 'thinking' || state === 'connecting'
      ? 'thinking'
      : state === 'speaking'
        ? 'speaking'
        : state === 'interrupted'
          ? 'interrupted'
          : state === 'reconnecting'
            ? 'reconnecting'
            : state === 'offline' || state === 'unavailable' || state === 'expired' || state === 'error'
              ? 'offline'
              : state === 'permission_denied'
                ? 'permission_denied'
                : state === 'private' || state === 'muted'
                  ? 'private_mode'
                  : state === 'safeguarding_sensitive' || state === 'inspection'
                    ? 'safeguarding_cautious'
                    : 'idle'

  return (
    <div className="relative inline-flex items-center justify-center" aria-label={`Orb status: ${stateLabels[state]}`} role="img">
      <OrbSphere state={renderState} size={isSmall ? 'small' : 'medium'} />
      {!isSmall ? <p className="sr-only">{stateLabels[state]} - {cadence.label}</p> : null}
    </div>
  )
}

export function orbStateLabel(state: OrbState) {
  return stateLabels[state]
}


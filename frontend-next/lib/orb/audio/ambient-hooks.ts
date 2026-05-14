export type OrbAmbientHook = 'none' | 'soft_room_tone' | 'quiet_room_tone'

export function ambientHookForState(state: string, quietMode = false): OrbAmbientHook {
  if (state === 'speaking' || state === 'listening') return quietMode ? 'quiet_room_tone' : 'soft_room_tone'
  return 'none'
}

export function shouldPlayAmbientHook(hook: OrbAmbientHook) {
  return hook !== 'none'
}

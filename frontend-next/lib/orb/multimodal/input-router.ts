export type OrbInputKind = 'voice' | 'caption' | 'transcript' | 'typing' | 'touch' | 'keyboard'

export function routeOrbInput(kind: OrbInputKind, value?: string) {
  return {
    kind,
    requiresTextInput: false,
    fallbackKind: kind === 'voice' ? 'typing' : undefined,
    transcriptSafe: kind !== 'voice' || Boolean(value),
    value: value ?? ''
  }
}


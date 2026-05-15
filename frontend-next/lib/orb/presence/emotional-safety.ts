export type OrbEmotionalSafetySettings = {
  active: boolean
  responseLength: 'short' | 'concise'
  motion: 'reduced' | 'standard'
  visualIntensity: 'soft' | 'ambient'
  stepByStep: boolean
  groundingAvailable: boolean
}

export function emotionalSafetyForSignals(signals: { overload?: boolean; failedAttempts?: number; safeguarding?: boolean } = {}): OrbEmotionalSafetySettings {
  const active = Boolean(signals.overload || signals.safeguarding || (signals.failedAttempts ?? 0) >= 2)
  return {
    active,
    responseLength: active ? 'short' : 'concise',
    motion: active ? 'reduced' : 'standard',
    visualIntensity: active ? 'soft' : 'ambient',
    stepByStep: active,
    groundingAvailable: true
  }
}


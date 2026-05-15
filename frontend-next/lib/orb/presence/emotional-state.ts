export type OrbEmotionalState = {
  overloadDetected: boolean
  highIntensityWorkflow: boolean
  recommendedPacing: 'slow' | 'steady'
  recommendedResponseLength: 'short' | 'concise'
  safePhrase: string
}

export function assessOrbEmotionalState(signals: { failedAttempts?: number; helpRequests?: number; safeguarding?: boolean } = {}): OrbEmotionalState {
  const overloadDetected = (signals.failedAttempts ?? 0) >= 2 || (signals.helpRequests ?? 0) >= 2
  const highIntensityWorkflow = Boolean(signals.safeguarding)
  return {
    overloadDetected,
    highIntensityWorkflow,
    recommendedPacing: overloadDetected || highIntensityWorkflow ? 'slow' : 'steady',
    recommendedResponseLength: overloadDetected || highIntensityWorkflow ? 'short' : 'concise',
    safePhrase: overloadDetected ? "Let's take this one step at a time." : 'I can stay with the task.'
  }
}


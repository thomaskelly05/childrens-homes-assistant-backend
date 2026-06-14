export type OrbComposerPrimaryAction = 'voice' | 'send' | 'stop'

/** ChatGPT-style composer right control: voice when empty, send when ready, stop while listening. */
export function resolveComposerPrimaryAction(input: {
  voiceListening: boolean
  canSend: boolean
  pending?: boolean
}): OrbComposerPrimaryAction {
  if (input.voiceListening) return 'stop'
  if (input.canSend) return 'send'
  return 'voice'
}

export function composerPrimaryActionAriaLabel(action: OrbComposerPrimaryAction): string {
  if (action === 'stop') return 'Stop voice input'
  if (action === 'send') return 'Send message'
  return 'Start voice input'
}

export type OrbCaptionState = {
  enabled: boolean
  privacySensitive: boolean
  text: string
}

export function captionCopy(state: OrbCaptionState) {
  if (!state.enabled) return 'Captions are off.'
  if (state.privacySensitive && state.text) return 'Sensitive captions hidden until confirmed.'
  return state.text || 'Captions will appear here.'
}


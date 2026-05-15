export type OrbInteractionPreferences = {
  prefersBriefAnswers: boolean
  prefersStepByStep: boolean
  captions: boolean
  transcript: boolean
  reducedMotion: boolean
  highContrast: boolean
  largerText: boolean
  simplifiedLayout: boolean
  focusMode: boolean
}

export const defaultOrbInteractionPreferences: OrbInteractionPreferences = {
  prefersBriefAnswers: true,
  prefersStepByStep: false,
  captions: false,
  transcript: false,
  reducedMotion: false,
  highContrast: false,
  largerText: false,
  simplifiedLayout: false,
  focusMode: false
}

export function mergeOrbInteractionPreferences(partial?: Partial<OrbInteractionPreferences>): OrbInteractionPreferences {
  return { ...defaultOrbInteractionPreferences, ...(partial ?? {}) }
}


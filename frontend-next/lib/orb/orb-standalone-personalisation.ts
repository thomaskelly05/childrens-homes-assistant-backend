import type { OrbGreetingStyle } from './orb-personalised-greeting'

export type OrbProfessionalTone = 'therapeutic' | 'compliance' | 'balanced'

export type OrbStandalonePersonalisation = {
  preferredName: string
  greetingStyle: OrbGreetingStyle
  professionalTone: OrbProfessionalTone
}

export const ORB_STANDALONE_PERSONALISATION_KEY = 'orb-standalone-personalisation-v1'

export const defaultOrbStandalonePersonalisation: OrbStandalonePersonalisation = {
  preferredName: '',
  greetingStyle: 'calm',
  professionalTone: 'balanced'
}

export function loadOrbStandalonePersonalisation(): OrbStandalonePersonalisation {
  if (typeof window === 'undefined') return defaultOrbStandalonePersonalisation
  try {
    const raw = window.localStorage.getItem(ORB_STANDALONE_PERSONALISATION_KEY)
    if (!raw) return defaultOrbStandalonePersonalisation
    const parsed = JSON.parse(raw) as Partial<OrbStandalonePersonalisation>
    return {
      ...defaultOrbStandalonePersonalisation,
      ...parsed,
      greetingStyle: parsed.greetingStyle ?? defaultOrbStandalonePersonalisation.greetingStyle,
      professionalTone: parsed.professionalTone ?? defaultOrbStandalonePersonalisation.professionalTone
    }
  } catch {
    return defaultOrbStandalonePersonalisation
  }
}

export function saveOrbStandalonePersonalisation(settings: OrbStandalonePersonalisation): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ORB_STANDALONE_PERSONALISATION_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

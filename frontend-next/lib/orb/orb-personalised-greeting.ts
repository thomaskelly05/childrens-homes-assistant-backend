export type OrbTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'generic'

export type OrbGreetingStyle = 'calm' | 'direct' | 'supportive'

export function extractOrbFirstName(fullName: string | null | undefined): string | null {
  const trimmed = fullName?.trim()
  if (!trimmed) return null
  const [first] = trimmed.split(/\s+/)
  return first || null
}

export function orbTimeOfDayFromHour(hour: number): OrbTimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'generic'
}

export const ORB_CONTEXTUAL_GREETING_LINE =
  'Ask about recording, safeguarding, reflection or inspection readiness.'

function greetingSubline(style: OrbGreetingStyle | undefined, includeContextLine: boolean): string {
  if (!includeContextLine) return ''
  switch (style) {
    case 'direct':
      return 'What do you need from ORB right now?'
    case 'supportive':
      return 'ORB is here to help you think clearly and document well.'
    case 'calm':
    default:
      return ORB_CONTEXTUAL_GREETING_LINE
  }
}

export function orbPersonalisedGreeting(input: {
  firstName?: string | null
  hour?: number
  style?: OrbGreetingStyle
  includeContextLine?: boolean
}): { heading: string; subline: string } {
  const hour = input.hour ?? 12
  const bucket = orbTimeOfDayFromHour(hour)
  const name = input.firstName?.trim() || null
  const subline = greetingSubline(input.style, input.includeContextLine !== false)

  if (bucket === 'morning') {
    return {
      heading: name ? `Good morning, ${name}. Ready when you are.` : 'Good morning. Ready when you are.',
      subline
    }
  }
  if (bucket === 'afternoon') {
    return {
      heading: name
        ? `Good afternoon, ${name}. What are we working on today?`
        : 'Good afternoon. What are we working on today?',
      subline
    }
  }
  if (bucket === 'evening') {
    return {
      heading: name
        ? `Good evening, ${name}. ORB is here when you're ready.`
        : "Good evening. ORB is here when you're ready.",
      subline
    }
  }
  return { heading: 'Ready when you are.', subline }
}

export type OrbProfessionalTone = 'therapeutic' | 'compliance' | 'balanced'

const ORB_STANDALONE_PERSONALISATION_KEY = 'orb-standalone-personalisation-v1'

type OrbStandalonePersonalisationSnapshot = {
  preferredName?: string
  greetingStyle?: OrbGreetingStyle
  professionalTone?: OrbProfessionalTone
}

function loadOrbStandalonePersonalisationForGreeting(): OrbStandalonePersonalisationSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ORB_STANDALONE_PERSONALISATION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrbStandalonePersonalisationSnapshot
  } catch {
    return null
  }
}

export type OrbProfileNameInput = { name: string }

/** Personalised empty-state heading — time-of-day greeting with optional preferred name. */
export function personalisedEmptyHeading(
  profile: OrbProfileNameInput,
  options?: { hour?: number; greetingStyle?: OrbGreetingStyle; preferredName?: string }
): string {
  const stored = loadOrbStandalonePersonalisationForGreeting()
  const first =
    options?.preferredName?.trim() ||
    stored?.preferredName?.trim() ||
    extractOrbFirstName(profile.name)
  return orbPersonalisedGreeting({
    firstName: first,
    hour: options?.hour ?? new Date().getHours(),
    style: options?.greetingStyle ?? stored?.greetingStyle
  }).heading
}

/** Personalised empty-state welcome — calm, minimal, no sales pitch. */
export function personalisedWelcomeMessage(
  profile: OrbProfileNameInput,
  options?: { temporary?: boolean; hour?: number; professionalTone?: OrbProfessionalTone }
): { heading: string; subline: string; temporaryNote?: string } {
  const stored = loadOrbStandalonePersonalisationForGreeting()
  const first = stored?.preferredName?.trim() || extractOrbFirstName(profile.name)
  const greeting = orbPersonalisedGreeting({
    firstName: first,
    hour: options?.hour ?? new Date().getHours(),
    style: stored?.greetingStyle
  })

  const result: { heading: string; subline: string; temporaryNote?: string } = {
    heading: greeting.heading,
    subline: greeting.subline
  }

  if (options?.temporary) {
    result.temporaryNote = 'Temporary chat is on.'
  }

  return result
}

export type OrbGreetingStyle = 'calm' | 'direct' | 'supportive'

export type OrbTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'generic'

export function extractOrbFirstName(fullName?: string | null): string | null {
  const trimmed = fullName?.trim()
  if (!trimmed) return null
  const first = trimmed.split(/\s+/)[0]
  return first || null
}

export function orbTimeOfDayFromHour(hour: number): OrbTimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'generic'
}

function greetingHeadingForPeriod(period: OrbTimeOfDay, firstName: string | null): string {
  switch (period) {
    case 'morning':
      return firstName
        ? `Good morning, ${firstName}. Ready when you are.`
        : 'Good morning. Ready when you are.'
    case 'afternoon':
      return firstName
        ? `Good afternoon, ${firstName}. What are we working on?`
        : 'Good afternoon. What are we working on?'
    case 'evening':
      return firstName
        ? `Good evening, ${firstName}. I'm here when you're ready.`
        : "Good evening. I'm here when you're ready."
    default:
      return firstName ? `Ready when you are, ${firstName}.` : 'Ready when you are.'
  }
}

/** Calm, professional greeting for ORB empty state — varies by time of day. */
export function orbPersonalisedGreeting(options?: {
  firstName?: string | null
  hour?: number
  style?: OrbGreetingStyle
  includeContextLine?: boolean
}): { heading: string; subline: string; period: OrbTimeOfDay } {
  const firstName = options?.firstName?.trim() || null
  const hour = options?.hour ?? 12
  const period = orbTimeOfDayFromHour(hour)
  let heading = greetingHeadingForPeriod(period, firstName)

  if (options?.style === 'direct' && period === 'generic') {
    heading = firstName ? `${firstName}, what do you need?` : 'What do you need?'
  } else if (options?.style === 'supportive' && period === 'generic') {
    heading = firstName ? `I'm here for you, ${firstName}.` : "I'm here when you're ready."
  }

  const subline =
    options?.includeContextLine === false
      ? ''
      : 'Ask about recording, safeguarding, reflection or inspection readiness.'

  return { heading, subline, period }
}

export const ORB_CONTEXTUAL_GREETING_LINE =
  'Ask about recording, safeguarding, reflection or inspection readiness.'

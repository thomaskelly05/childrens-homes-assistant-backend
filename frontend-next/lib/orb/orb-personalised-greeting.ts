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

function greetingSubline(style: OrbGreetingStyle | undefined): string {
  switch (style) {
    case 'direct':
      return 'What do you need from ORB right now?'
    case 'supportive':
      return 'ORB is here to help you think clearly and document well.'
    case 'calm':
    default:
      return 'Take your time — ORB is ready when you are.'
  }
}

export function orbPersonalisedGreeting(input: {
  firstName?: string | null
  hour?: number
  style?: OrbGreetingStyle
}): { heading: string; subline: string } {
  const hour = input.hour ?? 12
  const bucket = orbTimeOfDayFromHour(hour)
  const name = input.firstName?.trim() || null
  const subline = greetingSubline(input.style)

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

/**
 * Safety layer for founder actions — aggregated language only.
 * Strips identifiable names, safeguarding narrative, and provider/home labels.
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bProvider\s+[A-Z]\b/gi,
  /\bHome\s+[A-Z]\b/gi,
  /\bchild\s+name[s]?\b/gi,
  /\bstaff\s+name[s]?\b/gi,
  /\bsafeguarding\s+narrative\b/gi,
  /\bidentifiable\s+record[s]?\b/gi
]

const PROVIDER_NAME_PATTERN = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Care|Homes|Services|Group|Ltd)\b/g

function replaceForbiddenPatterns(text: string): string {
  let result = text
  for (const pattern of FORBIDDEN_PATTERNS) {
    result = result.replace(pattern, (match) => {
      const lower = match.toLowerCase()
      if (lower.includes('provider')) return 'a provider'
      if (lower.includes('home')) return "a children's home"
      if (lower.includes('child name')) return 'identifiable child details'
      if (lower.includes('staff name')) return 'identifiable staff details'
      return 'aggregated operational data'
    })
  }
  result = result.replace(PROVIDER_NAME_PATTERN, 'a provider')
  result = result.replace(/\bProvider [A-Z]\b/g, 'at-risk providers')
  result = result.replace(/\bHome [A-Z]\b/g, "children's homes")
  return result.replace(/\s{2,}/g, ' ').trim()
}

export function sanitiseFounderActionText(text: string): string {
  return replaceForbiddenPatterns(text)
}

export function assertFounderActionSafety(action: {
  title: string
  description: string
  recommendedNextStep: string
}): void {
  const combined = `${action.title} ${action.description} ${action.recommendedNextStep}`
  if (/\bProvider [A-Z]\b/.test(combined)) {
    throw new Error('Founder action contains identifiable provider label')
  }
  if (/\bHome [A-Z]\b/.test(combined)) {
    throw new Error('Founder action contains identifiable home label')
  }
}

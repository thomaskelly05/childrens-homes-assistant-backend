import {
  getMaxReviewTextLength,
  shouldRedactReviewNames,
  shouldStoreFullReviewText
} from '@/lib/indicare-lab/review-events/review-event-config'

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const UK_PHONE_PATTERN = /\b(?:\+?44|0)\s*(?:\d[\s-]?){9,12}\d\b/g
const GENERIC_PHONE_PATTERN = /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g

/** Common English words that look like capitalised names but are not. */
const NAME_ALLOWLIST = new Set([
  'Staff',
  'Manager',
  'On',
  'Call',
  'The',
  'Child',
  'Young',
  'Person',
  'Home',
  'Ofsted',
  'Reg',
  'Regulation',
  'Action',
  'Taken',
  'Observed',
  'Informed',
  'Contact',
  'Friday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Saturday',
  'Sunday',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'ORB',
  'IndiCare',
  'LADO',
  'SEND',
  'ADHD',
  'UK'
])

const LIKELY_NAME_PATTERN = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g

export type RedactedReviewText = {
  text: string
  wasRedacted: boolean
  wasTruncated: boolean
  fullTextStored: boolean
}

function stripContactDetails(text: string): { text: string; changed: boolean } {
  let result = text
  let changed = false
  const replacements = [
    EMAIL_PATTERN,
    UK_PHONE_PATTERN,
    GENERIC_PHONE_PATTERN
  ] as const

  for (const pattern of replacements) {
    const next = result.replace(pattern, '[contact removed]')
    if (next !== result) {
      result = next
      changed = true
    }
  }
  return { text: result, changed }
}

function redactLikelyNames(text: string): { text: string; changed: boolean } {
  let changed = false
  const result = text.replace(LIKELY_NAME_PATTERN, (match) => {
    if (NAME_ALLOWLIST.has(match)) return match
    const parts = match.split(/\s+/)
    if (parts.every((part) => NAME_ALLOWLIST.has(part))) return match
    changed = true
    return '[name]'
  })
  return { text: result, changed }
}

function truncateText(text: string, maxLength: number): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false }
  return {
    text: `${text.slice(0, maxLength).trimEnd()}… [truncated]`,
    truncated: true
  }
}

export function redactReviewTextField(
  value: string | undefined,
  options?: { storeFullText?: boolean; redactNames?: boolean; maxLength?: number }
): RedactedReviewText | undefined {
  if (!value?.trim()) return undefined

  const storeFullText = options?.storeFullText ?? shouldStoreFullReviewText()
  if (storeFullText) {
    return {
      text: value.trim(),
      wasRedacted: false,
      wasTruncated: false,
      fullTextStored: true
    }
  }

  const maxLength = options?.maxLength ?? getMaxReviewTextLength()
  const redactNames = options?.redactNames ?? shouldRedactReviewNames()

  let text = value.trim()
  let wasRedacted = false

  const contacts = stripContactDetails(text)
  text = contacts.text
  wasRedacted = wasRedacted || contacts.changed

  if (redactNames) {
    const names = redactLikelyNames(text)
    text = names.text
    wasRedacted = wasRedacted || names.changed
  }

  const { text: trimmed, truncated } = truncateText(text, maxLength)
  wasRedacted = wasRedacted || truncated

  return {
    text: trimmed,
    wasRedacted,
    wasTruncated: truncated,
    fullTextStored: false
  }
}

export type RedactedReviewFields = {
  prompt?: string
  draftAnswer: string
  context?: string
  isRedacted: boolean
  fullTextStored: boolean
}

export function redactReviewEventFields(input: {
  prompt?: string
  draftAnswer: string
  context?: string
}): RedactedReviewFields {
  const storeFullText = shouldStoreFullReviewText()
  const redactNames = shouldRedactReviewNames()
  const maxLength = getMaxReviewTextLength()
  const options = { storeFullText, redactNames, maxLength }

  const prompt = redactReviewTextField(input.prompt, options)
  const draftAnswer = redactReviewTextField(input.draftAnswer, options)
  const context = redactReviewTextField(input.context, options)

  const isRedacted =
    Boolean(prompt?.wasRedacted) ||
    Boolean(draftAnswer?.wasRedacted) ||
    Boolean(context?.wasRedacted)

  const fullTextStored =
    Boolean(prompt?.fullTextStored) &&
    Boolean(draftAnswer?.fullTextStored) &&
    (context === undefined || Boolean(context.fullTextStored))

  return {
    prompt: prompt?.text,
    draftAnswer: draftAnswer?.text ?? '',
    context: context?.text,
    isRedacted,
    fullTextStored
  }
}

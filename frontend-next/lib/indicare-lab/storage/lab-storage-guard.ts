import type { StorageClassification } from '@/lib/indicare-lab/governance/types'
import {
  getMaxReviewTextLength,
  shouldRedactReviewNames,
  shouldStoreFullReviewText
} from '@/lib/indicare-lab/review-events/review-event-config'
import { redactReviewEventFields } from '@/lib/indicare-lab/review-events/review-event-redaction'
import type { ReviewEvent } from '@/lib/indicare-lab/review-events/types'
import type { LabSuggestion } from '@/lib/indicare-lab/suggestions/types'

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const UK_PHONE_PATTERN = /\b(?:\+?44|0)\s*(?:\d[\s-]?){9,12}\d\b/g
const GENERIC_PHONE_PATTERN = /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g

export type StorageGuardResult<T> = {
  data: T
  storageClassification: StorageClassification
  wasRedacted: boolean
  wasTruncated: boolean
  fullTextBlocked: boolean
}

function stripContactDetails(text: string): { text: string; changed: boolean } {
  let result = text
  let changed = false
  for (const pattern of [EMAIL_PATTERN, UK_PHONE_PATTERN, GENERIC_PHONE_PATTERN]) {
    const next = result.replace(pattern, '[contact removed]')
    if (next !== result) {
      result = next
      changed = true
    }
  }
  return { text: result, changed }
}

function trimLongText(text: string, maxLength: number): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false }
  return {
    text: `${text.slice(0, maxLength).trimEnd()}… [truncated]`,
    truncated: true
  }
}

function classifyReviewStorage(input: {
  isRedacted: boolean
  fullTextStored: boolean
  origin: ReviewEvent['origin']
}): StorageClassification {
  if (input.origin === 'seeded-demo' || input.origin === 'benchmark-generated') {
    return 'synthetic'
  }
  if (input.fullTextStored && !input.isRedacted) {
    return 'full-text-enabled'
  }
  if (input.isRedacted) {
    return 'redacted'
  }
  return 'metadata-only'
}

function classifySuggestionStorage(suggestion: LabSuggestion): StorageClassification {
  if (suggestion.isSyntheticEvidence) return 'synthetic'
  return 'redacted'
}

/**
 * Enforce data minimisation before persisting review events.
 * Blocks accidental full-text storage unless explicitly enabled via env flag.
 */
export function guardReviewEventForStorage(event: ReviewEvent): StorageGuardResult<ReviewEvent> {
  const allowFullText = shouldStoreFullReviewText()
  const maxLength = getMaxReviewTextLength()
  const redactNames = shouldRedactReviewNames()

  if (allowFullText) {
    const classification = classifyReviewStorage({
      isRedacted: event.isRedacted,
      fullTextStored: true,
      origin: event.origin
    })
    return {
      data: { ...event, fullTextStored: true, isRedacted: event.isRedacted },
      storageClassification: classification,
      wasRedacted: false,
      wasTruncated: false,
      fullTextBlocked: false
    }
  }

  const redacted = redactReviewEventFields({
    prompt: event.prompt,
    draftAnswer: event.draftAnswer,
    context: event.context
  })

  let wasTruncated = false
  let wasRedacted = redacted.isRedacted

  const guardedPrompt = redacted.prompt
    ? trimLongText(redacted.prompt, maxLength)
    : undefined
  const guardedDraft = trimLongText(redacted.draftAnswer, maxLength)
  const guardedContext = redacted.context
    ? trimLongText(redacted.context, maxLength)
    : undefined

  wasTruncated =
    Boolean(guardedPrompt?.truncated) ||
    guardedDraft.truncated ||
    Boolean(guardedContext?.truncated)

  const guardedEvent: ReviewEvent = {
    ...event,
    prompt: guardedPrompt?.text,
    draftAnswer: guardedDraft.text,
    context: guardedContext?.text,
    isRedacted: wasRedacted || wasTruncated || redactNames,
    fullTextStored: false
  }

  const storageClassification = classifyReviewStorage({
    isRedacted: guardedEvent.isRedacted,
    fullTextStored: false,
    origin: event.origin
  })

  return {
    data: guardedEvent,
    storageClassification,
    wasRedacted,
    wasTruncated,
    fullTextBlocked: !allowFullText
  }
}

/**
 * Enforce data minimisation before persisting suggestions.
 * Stores descriptive text only — no full prompt/answer unless explicitly enabled.
 */
export function guardSuggestionForStorage(
  suggestion: LabSuggestion
): StorageGuardResult<LabSuggestion> {
  const allowFullText = shouldStoreFullReviewText()
  const maxLength = getMaxReviewTextLength()

  let description = suggestion.description
  let whyItMatters = suggestion.whyItMatters
  let wasRedacted = false
  let wasTruncated = false

  for (const field of [description, whyItMatters, suggestion.recommendedAction]) {
    const contacts = stripContactDetails(field)
    if (contacts.changed) wasRedacted = true
  }

  description = stripContactDetails(description).text
  whyItMatters = stripContactDetails(whyItMatters).text

  const trimmedDescription = trimLongText(description, maxLength)
  const trimmedWhy = trimLongText(whyItMatters, maxLength)
  wasTruncated = trimmedDescription.truncated || trimmedWhy.truncated

  const guarded: LabSuggestion = {
    ...suggestion,
    description: trimmedDescription.text,
    whyItMatters: trimmedWhy.text,
    recommendedAction: trimLongText(
      stripContactDetails(suggestion.recommendedAction).text,
      maxLength
    ).text
  }

  const storageClassification = allowFullText && !suggestion.isSyntheticEvidence
    ? 'full-text-enabled'
    : classifySuggestionStorage(suggestion)

  return {
    data: guarded,
    storageClassification,
    wasRedacted,
    wasTruncated,
    fullTextBlocked: !allowFullText
  }
}

export function computeRedactedStoragePercentage(items: StorageClassification[]): number {
  if (items.length === 0) return 0
  const redactedCount = items.filter(
    (c) => c === 'redacted' || c === 'metadata-only'
  ).length
  return Math.round((redactedCount / items.length) * 100)
}

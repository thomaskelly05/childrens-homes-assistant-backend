/**
 * Safety validation for founder memory content.
 */

import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import type { CreateFounderMemoryItemInput, UpdateFounderMemoryItemInput } from './founder-memory-types'

export type FounderMemoryValidationResult = {
  valid: boolean
  errors: string[]
  sanitisedTitle?: string
  sanitisedContent?: string
}

const VALID_TYPES = new Set([
  'priority',
  'decision',
  'product-direction',
  'relationship-note',
  'risk',
  'principle',
  'milestone',
  'deferred-item'
])

const VALID_STATUSES = new Set(['active', 'archived', 'superseded'])
const VALID_IMPORTANCE = new Set(['critical', 'high', 'medium', 'low'])

function trimText(value: string, max: number): string {
  return value.trim().slice(0, max)
}

function checkContentSafety(text: string): string[] {
  const errors: string[] = []
  const safety = checkFounderOutputSafety(text)
  for (const issue of safety.issues) {
    if (issue.severity === 'high') {
      errors.push(issue.message)
    }
  }
  return errors
}

export function validateCreateFounderMemoryInput(
  input: CreateFounderMemoryItemInput
): FounderMemoryValidationResult {
  const errors: string[] = []

  if (!input.type || !VALID_TYPES.has(input.type)) {
    errors.push('Invalid memory item type.')
  }

  const title = trimText(input.title ?? '', 200)
  const content = trimText(input.content ?? '', 4000)

  if (!title) errors.push('Title is required.')
  if (!content) errors.push('Content is required.')

  if (input.status && !VALID_STATUSES.has(input.status)) {
    errors.push('Invalid status.')
  }

  if (input.importance && !VALID_IMPORTANCE.has(input.importance)) {
    errors.push('Invalid importance.')
  }

  errors.push(...checkContentSafety(`${title} ${content}`))

  return {
    valid: errors.length === 0,
    errors,
    sanitisedTitle: title,
    sanitisedContent: content
  }
}

export function validateUpdateFounderMemoryInput(
  input: UpdateFounderMemoryItemInput
): FounderMemoryValidationResult {
  const errors: string[] = []

  if (input.type !== undefined && !VALID_TYPES.has(input.type)) {
    errors.push('Invalid memory item type.')
  }

  if (input.status !== undefined && !VALID_STATUSES.has(input.status)) {
    errors.push('Invalid status.')
  }

  if (input.importance !== undefined && !VALID_IMPORTANCE.has(input.importance)) {
    errors.push('Invalid importance.')
  }

  const title = input.title !== undefined ? trimText(input.title, 200) : undefined
  const content = input.content !== undefined ? trimText(input.content, 4000) : undefined

  if (title !== undefined && !title) errors.push('Title cannot be empty.')
  if (content !== undefined && !content) errors.push('Content cannot be empty.')

  const combined = `${title ?? ''} ${content ?? ''}`.trim()
  if (combined) {
    errors.push(...checkContentSafety(combined))
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitisedTitle: title,
    sanitisedContent: content
  }
}

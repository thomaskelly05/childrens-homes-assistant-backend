import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import type {
  FounderRelationship,
  InteractionType,
  OpportunityConfidence,
  OpportunityStatus,
  OpportunityType,
  RelationshipInteraction,
  RelationshipOpportunity,
  RelationshipPriority,
  RelationshipStatus,
  RelationshipType
} from './relationship-types'

const VALID_TYPES = new Set<RelationshipType>([
  'provider',
  'investor',
  'partner',
  'sector-expert',
  'tester',
  'champion',
  'local-authority',
  'government',
  'technology-partner',
  'advisor',
  'other'
])

const VALID_STATUSES = new Set<RelationshipStatus>([
  'new',
  'contacted',
  'meeting-booked',
  'active',
  'waiting',
  'follow-up-needed',
  'converted',
  'closed',
  'archived'
])

const VALID_PRIORITIES = new Set<RelationshipPriority>(['critical', 'high', 'medium', 'low'])

const VALID_INTERACTION_TYPES = new Set<InteractionType>([
  'email',
  'linkedin',
  'call',
  'meeting',
  'demo',
  'note',
  'follow-up',
  'application',
  'intro'
])

const VALID_OPPORTUNITY_TYPES = new Set<OpportunityType>([
  'pilot',
  'investment',
  'partnership',
  'endorsement',
  'testing',
  'grant',
  'provider-sale',
  'strategic-intro'
])

const VALID_OPPORTUNITY_STATUSES = new Set<OpportunityStatus>([
  'open',
  'progressing',
  'won',
  'lost',
  'deferred'
])

const VALID_CONFIDENCE = new Set<OpportunityConfidence>(['high', 'medium', 'low'])

function sanitiseText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function sanitiseOptionalText(value: unknown, maxLength: number): string | undefined {
  const text = sanitiseText(value, maxLength)
  return text || undefined
}

function sanitiseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 20)
}

function sanitiseInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 20)
}

function sanitiseStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
}

function assertFounderSafeText(text: string, field: string): string | null {
  const safety = checkFounderOutputSafety(text)
  if (!safety.safe) {
    return `${field} contains content that cannot be stored in founder relationship records`
  }
  return null
}

export function parseRelationshipType(value: unknown): RelationshipType | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase() as RelationshipType
  return VALID_TYPES.has(normalised) ? normalised : null
}

export function parseRelationshipStatus(value: unknown): RelationshipStatus | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase() as RelationshipStatus
  return VALID_STATUSES.has(normalised) ? normalised : null
}

export function parseRelationshipPriority(value: unknown): RelationshipPriority {
  if (typeof value !== 'string') return 'medium'
  const normalised = value.trim().toLowerCase() as RelationshipPriority
  return VALID_PRIORITIES.has(normalised) ? normalised : 'medium'
}

export function parseInteractionType(value: unknown): InteractionType | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase() as InteractionType
  return VALID_INTERACTION_TYPES.has(normalised) ? normalised : null
}

export function parseOpportunityType(value: unknown): OpportunityType | null {
  if (typeof value !== 'string') return null
  const normalised = value.trim().toLowerCase() as OpportunityType
  return VALID_OPPORTUNITY_TYPES.has(normalised) ? normalised : null
}

export function parseOpportunityStatus(value: unknown): OpportunityStatus {
  if (typeof value !== 'string') return 'open'
  const normalised = value.trim().toLowerCase() as OpportunityStatus
  return VALID_OPPORTUNITY_STATUSES.has(normalised) ? normalised : 'open'
}

export function parseOpportunityConfidence(value: unknown): OpportunityConfidence {
  if (typeof value !== 'string') return 'medium'
  const normalised = value.trim().toLowerCase() as OpportunityConfidence
  return VALID_CONFIDENCE.has(normalised) ? normalised : 'medium'
}

export type RelationshipCreateInput = {
  name: string
  organisation: string
  relationshipType: RelationshipType
  status: RelationshipStatus
  priority: RelationshipPriority
  email?: string
  linkedin?: string
  website?: string
  notes: string
  interests?: string[]
  nextAction: string
  nextActionDue?: string
  source?: string
  tags?: string[]
}

export function sanitiseRelationshipCreateInput(
  body: Record<string, unknown>
): { ok: true; input: RelationshipCreateInput } | { ok: false; error: string } {
  const name = sanitiseText(body.name, 120)
  const organisation = sanitiseText(body.organisation, 160)
  const relationshipType = parseRelationshipType(body.relationshipType)
  const status = parseRelationshipStatus(body.status) ?? 'new'
  const priority = parseRelationshipPriority(body.priority)
  const notes = sanitiseText(body.notes, 4000)
  const nextAction = sanitiseText(body.nextAction, 500)
  const email = sanitiseOptionalText(body.email, 200)
  const linkedin = sanitiseOptionalText(body.linkedin, 300)
  const website = sanitiseOptionalText(body.website, 300)
  const nextActionDue = sanitiseOptionalText(body.nextActionDue, 40)
  const source = sanitiseText(body.source, 120) || 'founder-ui'
  const tags = sanitiseTags(body.tags)
  const interests = sanitiseInterests(body.interests)

  if (!name) return { ok: false, error: 'Name is required' }
  if (!organisation) return { ok: false, error: 'Organisation is required' }
  if (!relationshipType) return { ok: false, error: 'Invalid relationship type' }
  if (!nextAction) return { ok: false, error: 'Next action is required' }

  for (const [field, text] of [
    ['Name', name],
    ['Organisation', organisation],
    ['Notes', notes],
    ['Next action', nextAction]
  ] as const) {
    const safetyError = assertFounderSafeText(text, field)
    if (safetyError) return { ok: false, error: safetyError }
  }

  return {
    ok: true,
    input: {
      name,
      organisation,
      relationshipType,
      status,
      priority,
      email,
      linkedin,
      website,
      notes,
      interests,
      nextAction,
      nextActionDue,
      source,
      tags
    }
  }
}

export function sanitiseRelationshipPatchInput(
  body: Record<string, unknown>
): { ok: true; patch: Partial<FounderRelationship> } | { ok: false; error: string } {
  const patch: Partial<FounderRelationship> = {}

  if (body.name !== undefined) {
    const name = sanitiseText(body.name, 120)
    if (!name) return { ok: false, error: 'Name cannot be empty' }
    const safetyError = assertFounderSafeText(name, 'Name')
    if (safetyError) return { ok: false, error: safetyError }
    patch.name = name
  }

  if (body.organisation !== undefined) {
    const organisation = sanitiseText(body.organisation, 160)
    if (!organisation) return { ok: false, error: 'Organisation cannot be empty' }
    const safetyError = assertFounderSafeText(organisation, 'Organisation')
    if (safetyError) return { ok: false, error: safetyError }
    patch.organisation = organisation
  }

  if (body.relationshipType !== undefined) {
    const relationshipType = parseRelationshipType(body.relationshipType)
    if (!relationshipType) return { ok: false, error: 'Invalid relationship type' }
    patch.relationshipType = relationshipType
  }

  if (body.status !== undefined) {
    const status = parseRelationshipStatus(body.status)
    if (!status) return { ok: false, error: 'Invalid status' }
    patch.status = status
  }

  if (body.priority !== undefined) {
    patch.priority = parseRelationshipPriority(body.priority)
  }

  if (body.email !== undefined) patch.email = sanitiseOptionalText(body.email, 200)
  if (body.linkedin !== undefined) patch.linkedin = sanitiseOptionalText(body.linkedin, 300)
  if (body.website !== undefined) patch.website = sanitiseOptionalText(body.website, 300)
  if (body.notes !== undefined) {
    const notes = sanitiseText(body.notes, 4000)
    const safetyError = assertFounderSafeText(notes, 'Notes')
    if (safetyError) return { ok: false, error: safetyError }
    patch.notes = notes
  }
  if (body.interests !== undefined) patch.interests = sanitiseInterests(body.interests)
  if (body.nextAction !== undefined) {
    const nextAction = sanitiseText(body.nextAction, 500)
    const safetyError = assertFounderSafeText(nextAction, 'Next action')
    if (safetyError) return { ok: false, error: safetyError }
    patch.nextAction = nextAction
  }
  if (body.nextActionDue !== undefined) patch.nextActionDue = sanitiseOptionalText(body.nextActionDue, 40)
  if (body.lastContactAt !== undefined) patch.lastContactAt = sanitiseOptionalText(body.lastContactAt, 40)
  if (body.source !== undefined) patch.source = sanitiseText(body.source, 120)
  if (body.tags !== undefined) patch.tags = sanitiseTags(body.tags)
  if (body.linkedEvidencePackIds !== undefined) {
    patch.linkedEvidencePackIds = sanitiseStringArray(body.linkedEvidencePackIds, 20, 80)
  }

  return { ok: true, patch }
}

export function sanitiseInteractionInput(
  body: Record<string, unknown>
): { ok: true; input: Omit<RelationshipInteraction, 'id' | 'relationshipId' | 'createdAt' | 'createdBy'> } | { ok: false; error: string } {
  const type = parseInteractionType(body.type)
  const summary = sanitiseText(body.summary, 2000)
  const outcome = sanitiseText(body.outcome, 1000)
  const nextStep = sanitiseOptionalText(body.nextStep, 500)

  if (!type) return { ok: false, error: 'Invalid interaction type' }
  if (!summary) return { ok: false, error: 'Summary is required' }
  if (!outcome) return { ok: false, error: 'Outcome is required' }

  for (const [field, text] of [
    ['Summary', summary],
    ['Outcome', outcome],
    ...(nextStep ? [['Next step', nextStep] as const] : [])
  ]) {
    const safetyError = assertFounderSafeText(text, field)
    if (safetyError) return { ok: false, error: safetyError }
  }

  return { ok: true, input: { type, summary, outcome, nextStep } }
}

export function sanitiseOpportunityCreateInput(
  body: Record<string, unknown>
): { ok: true; input: Omit<RelationshipOpportunity, 'id' | 'relationshipId' | 'createdAt' | 'updatedAt'> } | { ok: false; error: string } {
  const title = sanitiseText(body.title, 200)
  const opportunityType = parseOpportunityType(body.opportunityType)
  const status = parseOpportunityStatus(body.status)
  const confidence = parseOpportunityConfidence(body.confidence)
  const valueEstimate = sanitiseOptionalText(body.valueEstimate, 120)
  const evidenceNeeded = sanitiseStringArray(body.evidenceNeeded, 10, 200)
  const nextStep = sanitiseText(body.nextStep, 500)

  if (!title) return { ok: false, error: 'Title is required' }
  if (!opportunityType) return { ok: false, error: 'Invalid opportunity type' }
  if (!nextStep) return { ok: false, error: 'Next step is required' }

  for (const [field, text] of [['Title', title], ['Next step', nextStep]] as const) {
    const safetyError = assertFounderSafeText(text, field)
    if (safetyError) return { ok: false, error: safetyError }
  }

  return {
    ok: true,
    input: { title, opportunityType, status, valueEstimate, confidence, evidenceNeeded, nextStep }
  }
}

export function sanitiseOpportunityPatchInput(
  body: Record<string, unknown>
): { ok: true; patch: Partial<RelationshipOpportunity> } | { ok: false; error: string } {
  const patch: Partial<RelationshipOpportunity> = {}

  if (body.title !== undefined) {
    const title = sanitiseText(body.title, 200)
    if (!title) return { ok: false, error: 'Title cannot be empty' }
    patch.title = title
  }
  if (body.opportunityType !== undefined) {
    const opportunityType = parseOpportunityType(body.opportunityType)
    if (!opportunityType) return { ok: false, error: 'Invalid opportunity type' }
    patch.opportunityType = opportunityType
  }
  if (body.status !== undefined) patch.status = parseOpportunityStatus(body.status)
  if (body.valueEstimate !== undefined) patch.valueEstimate = sanitiseOptionalText(body.valueEstimate, 120)
  if (body.confidence !== undefined) patch.confidence = parseOpportunityConfidence(body.confidence)
  if (body.evidenceNeeded !== undefined) patch.evidenceNeeded = sanitiseStringArray(body.evidenceNeeded, 10, 200)
  if (body.nextStep !== undefined) {
    const nextStep = sanitiseText(body.nextStep, 500)
    if (!nextStep) return { ok: false, error: 'Next step cannot be empty' }
    patch.nextStep = nextStep
  }

  return { ok: true, patch }
}

export function sanitiseFounderSafeRelationshipBundle<T>(bundle: T): T {
  return bundle
}

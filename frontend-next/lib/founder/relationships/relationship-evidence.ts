/**
 * Evidence pack recommendations for founder relationships.
 */

import type { EvidenceAudience } from '@/lib/founder/evidence/evidence-types'
import type { FounderRelationship } from './relationship-types'

function normaliseOrg(value: string): string {
  return value.trim().toLowerCase()
}

export function recommendEvidenceAudienceForRelationship(
  relationship: FounderRelationship
): EvidenceAudience {
  const org = normaliseOrg(relationship.organisation)
  const name = normaliseOrg(relationship.name)
  const combined = `${org} ${name}`

  if (/openai/.test(combined)) return 'openai'
  if (/microsoft/.test(combined)) return 'microsoft'
  if (/innovate\s*uk/.test(combined)) return 'innovate-uk'
  if (/\bdfe\b|department for education/.test(combined)) return 'dfe'
  if (relationship.relationshipType === 'local-authority' || /local authority|county council|borough/.test(combined)) {
    return 'local-authority'
  }
  if (relationship.relationshipType === 'investor') return 'investor'
  if (relationship.relationshipType === 'provider' || relationship.relationshipType === 'tester') {
    return 'provider'
  }
  if (relationship.relationshipType === 'technology-partner' || relationship.relationshipType === 'partner') {
    return 'pilot-partner'
  }
  if (relationship.relationshipType === 'government') return 'dfe'
  return 'general'
}

export function evidenceAudienceLabel(audience: EvidenceAudience): string {
  const labels: Record<EvidenceAudience, string> = {
    investor: 'Investor Pack',
    provider: 'Provider / Pilot Pack',
    openai: 'OpenAI Pack',
    microsoft: 'Microsoft Pack',
    'innovate-uk': 'Innovate UK Pack',
    dfe: 'DfE / Local Authority Pack',
    'local-authority': 'Local Authority Pack',
    'pilot-partner': 'Pilot Partner Pack',
    general: 'General Evidence Pack'
  }
  return labels[audience]
}

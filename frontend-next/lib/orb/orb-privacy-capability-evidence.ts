/**
 * Privacy-specific capability evidence map — truthful security/encryption claims for ORB.
 * Extends enterprise evidence; procurement honesty, not public marketing.
 */

import {
  ORB_ENTERPRISE_CAPABILITY_EVIDENCE,
  type EnterpriseCapabilityEvidence,
  type EnterpriseEvidenceStatus
} from './orb-enterprise-capability-evidence.ts'

export type PrivacyCapabilityStatus = EnterpriseEvidenceStatus | 'roadmap'

export type PrivacyCapabilityEvidence = {
  id: string
  label: string
  status: PrivacyCapabilityStatus
  safeToClaimPublicly: boolean
  evidence: string[]
  limitations: string[]
  nextStep?: string
  publicCopy?: string
}

const PRIVACY_SPECIFIC: PrivacyCapabilityEvidence[] = [
  {
    id: 'end_to_end_encryption',
    label: 'End-to-end encryption',
    status: 'roadmap',
    safeToClaimPublicly: false,
    evidence: [],
    limitations: ['No client-side E2EE for chat, voice or documents in current implementation'],
    nextStep: 'Do not claim E2EE publicly until per-user keys and zero-knowledge storage are implemented',
    publicCopy: 'Protected in transit and governed by privacy controls'
  },
  {
    id: 'client_side_encryption',
    label: 'Client-side encryption',
    status: 'missing',
    safeToClaimPublicly: false,
    evidence: [],
    limitations: ['No application-level client encryption before upload'],
    nextStep: 'Document if/when client-side encryption is added for sensitive attachments'
  },
  {
    id: 'zero_knowledge_storage',
    label: 'Zero-knowledge storage',
    status: 'missing',
    safeToClaimPublicly: false,
    evidence: [],
    limitations: ['Server processes user text for AI features'],
    nextStep: 'Not applicable until E2EE architecture exists'
  },
  {
    id: 'subprocessors_model_providers',
    label: 'Subprocessors / model providers',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['AI external call governance', 'Privacy notice subprocessors section'],
    limitations: ['Model providers process text you send — not zero-knowledge'],
    nextStep: 'Keep privacy notice subprocessors list current',
    publicCopy: 'AI providers process the text you send under governed policies'
  },
  {
    id: 'user_deletion_export',
    label: 'User deletion and export',
    status: 'partial',
    safeToClaimPublicly: false,
    evidence: ['Privacy requests flow', 'Export workspace JSON in settings', 'Clear local memory controls'],
    limitations: ['Manual privacy request review', 'Chat history primarily device-local'],
    nextStep: 'Automated account deletion and server-side chat export'
  }
]

function fromEnterprise(item: EnterpriseCapabilityEvidence): PrivacyCapabilityEvidence {
  return {
    id: item.id,
    label: item.label,
    status: item.status,
    safeToClaimPublicly: item.safeToClaimPublicly,
    evidence: item.evidence,
    limitations: item.limitations,
    nextStep: item.notes[0]
  }
}

const ENTERPRISE_PRIVACY_IDS = new Set([
  'encryption_in_transit',
  'encryption_at_rest',
  'mfa',
  'sso_oauth',
  'passkeys',
  'rbac',
  'audit_logs',
  'data_retention',
  'region_storage',
  'security_headers'
])

export const ORB_PRIVACY_CAPABILITY_EVIDENCE: PrivacyCapabilityEvidence[] = [
  ...ORB_ENTERPRISE_CAPABILITY_EVIDENCE.filter((item) => ENTERPRISE_PRIVACY_IDS.has(item.id)).map(fromEnterprise),
  ...PRIVACY_SPECIFIC
]

export function getPrivacyCapability(id: string): PrivacyCapabilityEvidence | undefined {
  return ORB_PRIVACY_CAPABILITY_EVIDENCE.find((item) => item.id === id)
}

/** Prevent false E2EE or zero-knowledge claims in product copy. */
export function validatePrivacyCapabilityTruthfulness(): string[] {
  const violations: string[] = []
  const neverPublic = ['end_to_end_encryption', 'client_side_encryption', 'zero_knowledge_storage']

  for (const item of ORB_PRIVACY_CAPABILITY_EVIDENCE) {
    if (neverPublic.includes(item.id) && item.safeToClaimPublicly) {
      violations.push(`${item.id}: must never be safeToClaimPublicly`)
    }
    if (item.id === 'end_to_end_encryption' && item.status !== 'roadmap' && item.status !== 'missing') {
      violations.push('end_to_end_encryption: only roadmap or missing unless truly implemented')
    }
    if (item.status === 'missing' && item.safeToClaimPublicly) {
      violations.push(`${item.id}: missing capability cannot be safeToClaimPublicly`)
    }
  }
  return violations
}

/** Scan copy for forbidden public encryption claims. */
export function findForbiddenEncryptionClaims(text: string): string[] {
  const forbidden = [
    /\bend[- ]to[- ]end encrypted\b/i,
    /\be2ee\b/i,
    /\bzero[- ]knowledge\b/i,
    /\bgovernment[- ]grade encryption\b/i
  ]
  return forbidden.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
}

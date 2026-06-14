/**
 * ORB foundation capability registry — single cross-app source of truth.
 * Mobile and desktop surfaces share these definitions; no duplicate capability systems.
 */

import { ORB_NATURAL_LANGUAGE_DOCUMENT_EDITING_COPY } from './orb-document-intelligence-roadmap.ts'
import { ORB_APP_PERMISSIONS } from './orb-app-permissions.ts'
import { ORB_SEARCH_SURFACES } from './orb-search-registry.ts'

export type OrbFoundationSurface =
  | 'mobile'
  | 'desktop'
  | 'voice'
  | 'dictate'
  | 'write'
  | 'documents'
  | 'saved_outputs'
  | 'settings'
  | 'billing'
  | 'search'

export type OrbFoundationAvailability = 'implemented' | 'partial' | 'planned' | 'unavailable'

export type OrbFoundationPrivacyLevel = 'low' | 'medium' | 'high' | 'very_high'

export type OrbFoundationBrowserPermission = 'microphone' | 'camera' | 'files' | 'none'

export type OrbFoundationCapability = {
  id: string
  label: string
  shortDescription: string
  surfaces: OrbFoundationSurface[]
  availability: OrbFoundationAvailability
  privacyLevel: OrbFoundationPrivacyLevel
  requiresUserAction: boolean
  requiresBrowserPermission?: OrbFoundationBrowserPermission
  usesCloudProcessing: boolean
  localFirstPossible: boolean
  safePublicClaim: boolean
  currentLimitations: string[]
  adultControlRequirement: string
  safeguardingNotes: string[]
  evidenceLinks: string[]
  sourceFiles: string[]
  appPermissionId?: string
}

export const ORB_FOUNDATION_CAPABILITY_IDS = [
  'camera_capture',
  'photo_upload',
  'file_upload',
  'document_scan_ocr',
  'natural_language_document_editing',
  'local_first_drafts',
  'private_compute',
  'personal_context',
  'app_permissions',
  'search',
  'voice_input',
  'dictate_audio_input',
  'orb_write_finalisation',
  'source_aware_documents',
  'saved_outputs',
  'export_copy_print',
  'billing_access_controls',
  'audit_evidence_readiness'
] as const

export type OrbFoundationCapabilityId = (typeof ORB_FOUNDATION_CAPABILITY_IDS)[number]

export const ORB_FOUNDATION_CAPABILITIES: OrbFoundationCapability[] = [
  {
    id: 'camera_capture',
    label: 'Camera capture',
    shortDescription: 'Take a photo from the composer plus menu when the browser or device allows.',
    surfaces: ['mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'very_high',
    requiresUserAction: true,
    requiresBrowserPermission: 'camera',
    usesCloudProcessing: false,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: [
      'Desktop browsers may open a file picker instead of a live camera.',
      'Camera is browser/device controlled — ORB cannot override OS permission.'
    ],
    adultControlRequirement: 'Adult chooses Camera each time and reviews any image before sending.',
    safeguardingNotes: [
      'Do not photograph children or incidents casually.',
      'Only capture information you are authorised to use.'
    ],
    evidenceLinks: ['orb-composer-attachments', 'orb-app-permissions'],
    sourceFiles: [
      'components/orb-residential/orb-residential-composer-tools-sheet.tsx',
      'components/orb-standalone/orb-standalone-composer.tsx',
      'lib/orb/orb-composer-attachments.ts'
    ],
    appPermissionId: 'camera'
  },
  {
    id: 'photo_upload',
    label: 'Photo upload',
    shortDescription: 'Attach photos from the device file picker in composer on mobile and desktop.',
    surfaces: ['mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'files',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: ['Images are sent to ORB brain when you send a message.'],
    adultControlRequirement: 'Adult selects photos and reviews attachments before send.',
    safeguardingNotes: ['Avoid unnecessary identifiable information in images.'],
    evidenceLinks: ['orb-composer-attachments'],
    sourceFiles: ['lib/orb/orb-composer-attachments.ts', 'components/orb-standalone/orb-composer-plus-menu.tsx'],
    appPermissionId: 'photos_files'
  },
  {
    id: 'file_upload',
    label: 'File upload',
    shortDescription: 'Attach documents and files from composer, documents workspace and upload flows.',
    surfaces: ['mobile', 'desktop', 'documents'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'files',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: ['Supported types: images and common document formats (.txt, .md, .pdf, .docx).'],
    adultControlRequirement: 'Adult confirms they are authorised to use uploaded files.',
    safeguardingNotes: ['Only upload information you are authorised to use.'],
    evidenceLinks: ['orb-composer-attachments', 'orb-privacy-framework'],
    sourceFiles: ['lib/orb/orb-composer-attachments.ts', 'components/orb-standalone/orb-document-panel.tsx'],
    appPermissionId: 'photos_files'
  },
  {
    id: 'document_scan_ocr',
    label: 'Document scanning / OCR',
    shortDescription: 'Scan paper documents and extract text for review.',
    surfaces: ['mobile', 'desktop', 'documents'],
    availability: 'planned',
    privacyLevel: 'very_high',
    requiresUserAction: true,
    requiresBrowserPermission: 'camera',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: false,
    currentLimitations: ['Full OCR pipeline is on the roadmap — camera/file attach works today without OCR.'],
    adultControlRequirement: 'Adult must review extracted text before use.',
    safeguardingNotes: ['Avoid casual capture of child-identifiable material.'],
    evidenceLinks: ['orb-document-intelligence-roadmap'],
    sourceFiles: ['lib/orb/orb-document-intelligence-roadmap.ts'],
    appPermissionId: 'camera'
  },
  {
    id: 'natural_language_document_editing',
    label: 'Natural language document editing',
    shortDescription: ORB_NATURAL_LANGUAGE_DOCUMENT_EDITING_COPY,
    surfaces: ['documents', 'write', 'desktop', 'mobile'],
    availability: 'partial',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: false,
    currentLimitations: [
      'Lens-based analysis and summarisation exist; full before/after edit tracking is partial.',
      'Not all document types support restructure workflows yet.'
    ],
    adultControlRequirement: 'Adult reviews every proposed change before copying or saving.',
    safeguardingNotes: ['Edits are proposed, not automatic.'],
    evidenceLinks: ['orb-document-intelligence-roadmap', 'document-intelligence'],
    sourceFiles: ['lib/orb/document-intelligence.ts', 'lib/orb/orb-document-intelligence-roadmap.ts']
  },
  {
    id: 'local_first_drafts',
    label: 'Local-first workspace',
    shortDescription: 'Device-local preferences, draft history and composer state where supported.',
    surfaces: ['mobile', 'desktop', 'write', 'settings'],
    availability: 'partial',
    privacyLevel: 'medium',
    requiresUserAction: false,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: false,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: [
      'Chat continuity and saved outputs may sync to account storage.',
      'ORB brain still requires cloud/backend processing for AI responses.'
    ],
    adultControlRequirement: 'Adult can clear local memory and manage saved outputs.',
    safeguardingNotes: ['No hidden child-memory profiles.'],
    evidenceLinks: ['orb-personal-context'],
    sourceFiles: ['lib/orb/orb-personal-context.ts', 'lib/orb/orb-appearance.ts']
  },
  {
    id: 'private_compute',
    label: 'Private processing controls',
    shortDescription: 'Browser/device permissions and privacy settings — not Apple Private Cloud Compute.',
    surfaces: ['settings', 'mobile', 'desktop'],
    availability: 'partial',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: false,
    currentLimitations: [
      'ORB brain uses backend/model processing today.',
      'Private on-device model processing is foundation/roadmap only — not publicly claimed.',
      'No end-to-end encryption for chat or documents.'
    ],
    adultControlRequirement: 'Adult manages permissions and reviews what is sent to ORB.',
    safeguardingNotes: ['Truthful about cloud processing and encryption limits.'],
    evidenceLinks: ['orb-privacy-capability-evidence'],
    sourceFiles: [
      'lib/orb/orb-privacy-capability-evidence.ts',
      'lib/orb/orb-privacy-framework.ts',
      'components/orb-residential/orb-privacy-data-settings-section.tsx'
    ]
  },
  {
    id: 'personal_context',
    label: 'Personal context understanding',
    shortDescription: 'Account and workflow preferences — not automatic child profiles.',
    surfaces: ['settings', 'mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'medium',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: true,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: [
      'ORB Residential does not access live IndiCare OS child records.',
      'No hidden child-memory across chats.'
    ],
    adultControlRequirement: 'Adult edits profile, preferences and clears context in Settings.',
    safeguardingNotes: ['Do not store unnecessary child-identifiable information in preferences.'],
    evidenceLinks: ['orb-personal-context'],
    sourceFiles: ['lib/orb/orb-personal-context.ts', 'components/orb-residential/orb-privacy-data-settings-section.tsx'],
    appPermissionId: 'personal_context'
  },
  {
    id: 'app_permissions',
    label: 'App permissions',
    shortDescription: 'Browser-controlled microphone, camera and file permissions explained in Settings.',
    surfaces: ['settings', 'mobile', 'desktop', 'voice', 'dictate'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: false,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: ['ORB cannot toggle OS/browser permissions — status display only.'],
    adultControlRequirement: 'Adult grants or denies permissions in the browser or device settings.',
    safeguardingNotes: ['Permissions are requested only when a feature needs them.'],
    evidenceLinks: ['orb-app-permissions'],
    sourceFiles: ['lib/orb/orb-app-permissions.ts', 'components/orb-residential/orb-privacy-data-settings-section.tsx']
  },
  {
    id: 'search',
    label: 'Search across app surfaces',
    shortDescription: 'Per-surface search for chats, outputs, templates, documents and settings.',
    surfaces: ['search', 'saved_outputs', 'documents', 'settings', 'mobile', 'desktop'],
    availability: 'partial',
    privacyLevel: 'medium',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: false,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: [
      'No global cross-surface search — each surface filters its own list.',
      'Does not search live IndiCare OS records.'
    ],
    adultControlRequirement: 'Adult chooses what surface to search.',
    safeguardingNotes: ['Search stays within the surface you are viewing.'],
    evidenceLinks: ['orb-search-registry'],
    sourceFiles: ['lib/orb/orb-search-registry.ts'],
    appPermissionId: 'search'
  },
  {
    id: 'voice_input',
    label: 'Voice input',
    shortDescription: 'Live ORB Voice station and composer inline speech where supported.',
    surfaces: ['voice', 'mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'microphone',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: [
      'Browser SpeechRecognition required for inline composer speech.',
      'Subscription may gate live voice on some deployments.'
    ],
    adultControlRequirement: 'Adult starts voice and reviews transcripts before send.',
    safeguardingNotes: ['Voice transcripts may contain sensitive information — review before saving.'],
    evidenceLinks: ['orb-voice-readiness'],
    sourceFiles: [
      'lib/orb/voice/orb-voice-readiness.ts',
      'lib/orb/orb-composer-inline-voice-fallback.ts',
      'components/orb-standalone/orb-voice-station.tsx'
    ],
    appPermissionId: 'voice'
  },
  {
    id: 'dictate_audio_input',
    label: 'Dictate / audio input',
    shortDescription: 'Structured speech-to-text in the Dictate station with ORB Write handoff.',
    surfaces: ['dictate', 'mobile', 'desktop', 'write'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'microphone',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: ['Falls back to typing when microphone or speech recognition is unavailable.'],
    adultControlRequirement: 'Adult reviews dictated text before finalising in ORB Write.',
    safeguardingNotes: ['Dictate is for professional notes — follow data minimisation.'],
    evidenceLinks: ['orb-dictate'],
    sourceFiles: ['components/orb-standalone/orb-dictate-station.tsx', 'lib/orb/dictate/'],
    appPermissionId: 'dictate'
  },
  {
    id: 'orb_write_finalisation',
    label: 'ORB Write finalisation',
    shortDescription: 'Turn drafts and dictate output into reviewed records.',
    surfaces: ['write', 'mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: true,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: ['AI suggestions require adult review before export.'],
    adultControlRequirement: 'Adult approves final text before copy, save or export.',
    safeguardingNotes: ['ORB Write does not auto-submit records to external systems.'],
    evidenceLinks: ['orb-write-converged-handoff'],
    sourceFiles: ['lib/orb/write/orb-write-converged-handoff.ts', 'components/orb-write/']
  },
  {
    id: 'source_aware_documents',
    label: 'Source-aware document use',
    shortDescription: 'ORB labels which document or upload informed a response.',
    surfaces: ['documents', 'mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'files',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: ['Source shown where available — not all flows attach document metadata yet.'],
    adultControlRequirement: 'Adult attaches or selects documents explicitly.',
    safeguardingNotes: ['Use only authorised documents.'],
    evidenceLinks: ['orb-privacy-framework', 'document-intelligence'],
    sourceFiles: ['lib/orb/document-intelligence.ts', 'lib/orb/orb-privacy-framework.ts']
  },
  {
    id: 'saved_outputs',
    label: 'Saved outputs',
    shortDescription: 'Outputs the adult explicitly saves to their account.',
    surfaces: ['saved_outputs', 'mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'high',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: ['Server-stored — not end-to-end encrypted.'],
    adultControlRequirement: 'Adult chooses what to save, edit or delete.',
    safeguardingNotes: ['Review before saving identifiable information.'],
    evidenceLinks: ['orb-saved-outputs-resilience'],
    sourceFiles: ['lib/orb/orb-saved-outputs-resilience.ts', 'components/orb-standalone/orb-saved-outputs-panel.tsx'],
    appPermissionId: 'saved_outputs'
  },
  {
    id: 'export_copy_print',
    label: 'Export / copy / print',
    shortDescription: 'Copy, export and print from ORB Write and saved outputs where available.',
    surfaces: ['write', 'saved_outputs', 'desktop', 'mobile'],
    availability: 'partial',
    privacyLevel: 'medium',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: false,
    localFirstPossible: true,
    safePublicClaim: true,
    currentLimitations: ['Print depends on browser; not all panels expose export yet.'],
    adultControlRequirement: 'Adult reviews content before copying or printing.',
    safeguardingNotes: ['Follow local information-sharing policies.'],
    evidenceLinks: ['orb-write-export'],
    sourceFiles: ['components/orb-write/orb-write-word-processor.tsx']
  },
  {
    id: 'billing_access_controls',
    label: 'Billing / access controls',
    shortDescription: 'Subscription status gates paid features such as Voice.',
    surfaces: ['billing', 'settings', 'mobile', 'desktop'],
    availability: 'implemented',
    privacyLevel: 'medium',
    requiresUserAction: true,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: true,
    localFirstPossible: false,
    safePublicClaim: true,
    currentLimitations: ['Stripe handles payment card data.'],
    adultControlRequirement: 'Account holder manages billing in Settings.',
    safeguardingNotes: [],
    evidenceLinks: ['orb-billing-client'],
    sourceFiles: ['lib/orb/orb-billing-client.ts', 'lib/orb/orb-billing-display.ts'],
    appPermissionId: 'billing'
  },
  {
    id: 'audit_evidence_readiness',
    label: 'Audit / evidence readiness',
    shortDescription: 'Internal evidence map for procurement — not public certification claims.',
    surfaces: ['settings'],
    availability: 'partial',
    privacyLevel: 'high',
    requiresUserAction: false,
    requiresBrowserPermission: 'none',
    usesCloudProcessing: false,
    localFirstPossible: false,
    safePublicClaim: false,
    currentLimitations: [
      'E2EE, zero-knowledge and Apple Private Cloud Compute are not implemented.',
      'Audit UI is metadata-oriented in standalone ORB.'
    ],
    adultControlRequirement: 'Organisation administrators review evidence packs for procurement.',
    safeguardingNotes: ['Do not claim certifications not evidenced in repo.'],
    evidenceLinks: ['orb-enterprise-capability-evidence', 'orb-privacy-capability-evidence'],
    sourceFiles: [
      'lib/orb/orb-enterprise-capability-evidence.ts',
      'lib/orb/orb-privacy-capability-evidence.ts'
    ]
  }
]

export function getOrbFoundationCapability(id: string): OrbFoundationCapability | undefined {
  return ORB_FOUNDATION_CAPABILITIES.find((capability) => capability.id === id)
}

export function orbFoundationCapabilitiesForSurface(surface: OrbFoundationSurface): OrbFoundationCapability[] {
  return ORB_FOUNDATION_CAPABILITIES.filter((capability) => capability.surfaces.includes(surface))
}

/** Shared composer plus upload actions — mobile sheet and desktop menu converge here. */
export const ORB_COMPOSER_UPLOAD_PLUS_ACTIONS = [
  { id: 'take_photo' as const, label: 'Camera', capabilityId: 'camera_capture' as const },
  { id: 'photo_library' as const, label: 'Photos', capabilityId: 'photo_upload' as const },
  { id: 'choose_files' as const, label: 'Files', capabilityId: 'file_upload' as const }
]

export function orbFoundationCapabilityHasSurface(capability: OrbFoundationCapability): boolean {
  return capability.surfaces.length > 0 || capability.currentLimitations.length > 0
}

export function validateOrbFoundationCapabilityRegistry(): string[] {
  const violations: string[] = []
  const ids = new Set(ORB_FOUNDATION_CAPABILITIES.map((c) => c.id))

  for (const required of ORB_FOUNDATION_CAPABILITY_IDS) {
    if (!ids.has(required)) violations.push(`missing capability: ${required}`)
  }

  const forbiddenPublicClaims = [
    'end-to-end',
    'e2ee',
    'apple private cloud',
    'private cloud compute',
    'zero-knowledge'
  ]

  for (const capability of ORB_FOUNDATION_CAPABILITIES) {
    const haystack = [
      capability.label,
      capability.shortDescription,
      ...capability.currentLimitations,
      ...capability.safeguardingNotes
    ]
      .join(' ')
      .toLowerCase()

    if (capability.safePublicClaim) {
      for (const phrase of forbiddenPublicClaims) {
        if (haystack.includes(phrase) && !haystack.includes('not ') && !haystack.includes('no ')) {
          violations.push(`${capability.id}: safePublicClaim must not include "${phrase}"`)
        }
      }
    }

    if (['high', 'very_high'].includes(capability.privacyLevel) && !capability.adultControlRequirement.trim()) {
      violations.push(`${capability.id}: high privacy capability needs adultControlRequirement`)
    }

    if (capability.requiresBrowserPermission && capability.requiresBrowserPermission !== 'none') {
      const permissionId =
        capability.appPermissionId ??
        mapBrowserPermissionToAppPermission(capability.requiresBrowserPermission)
      const permission = permissionId ? ORB_APP_PERMISSIONS.find((p) => p.id === permissionId) : undefined
      if (!permission) {
        violations.push(`${capability.id}: missing app permission mapping for ${capability.requiresBrowserPermission}`)
      }
    }

    if (!orbFoundationCapabilityHasSurface(capability)) {
      violations.push(`${capability.id}: must list at least one surface or limitation`)
    }
  }

  if (ORB_SEARCH_SURFACES.length < 4) {
    violations.push('search registry should cover multiple surfaces')
  }

  return violations
}

export function mapBrowserPermissionToAppPermission(
  permission: OrbFoundationBrowserPermission
): string | undefined {
  switch (permission) {
    case 'microphone':
      return 'microphone'
    case 'camera':
      return 'camera'
    case 'files':
      return 'photos_files'
    default:
      return undefined
  }
}

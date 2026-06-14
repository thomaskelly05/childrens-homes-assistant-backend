/**
 * Safe personal context model for ORB Residential.
 * Account/workflow preference first — no hidden child-memory claims.
 */

export type OrbPersonalContextSource =
  | 'profile'
  | 'preferences'
  | 'saved_outputs'
  | 'chats'
  | 'templates'
  | 'uploaded_documents'
  | 'organisation'
  | 'role'
  | 'billing'

export type OrbPersonalContextRule = {
  id: OrbPersonalContextSource
  label: string
  mayUse: string
  shouldNotInfer: string
  requiresUserAction: string
  sourceLabelled: boolean
  stored: boolean
  canClear: string
}

export const ORB_PERSONAL_CONTEXT_RULES: OrbPersonalContextRule[] = [
  {
    id: 'profile',
    label: 'Profile',
    mayUse: 'Your name, role and professional preferences you enter.',
    shouldNotInfer: 'Child identities, cases or live care records.',
    requiresUserAction: 'You edit your profile explicitly.',
    sourceLabelled: false,
    stored: true,
    canClear: 'Edit profile or clear profiles in Settings.'
  },
  {
    id: 'preferences',
    label: 'Preferences',
    mayUse: 'Theme, voice, greeting style and writing tone on this device.',
    shouldNotInfer: 'Safeguarding decisions or child-specific facts.',
    requiresUserAction: 'You change settings yourself.',
    sourceLabelled: false,
    stored: true,
    canClear: 'Reset in Settings → Appearance or Writing.'
  },
  {
    id: 'saved_outputs',
    label: 'Saved outputs',
    mayUse: 'Outputs you explicitly save to your account.',
    shouldNotInfer: 'Automatic child profiles or case histories.',
    requiresUserAction: 'You choose Save on an output.',
    sourceLabelled: true,
    stored: true,
    canClear: 'Delete in Saved outputs or clear workspace.'
  },
  {
    id: 'chats',
    label: 'Chats',
    mayUse: 'Conversation history on this device for continuity.',
    shouldNotInfer: 'Hidden memory of child records across chats.',
    requiresUserAction: 'You send messages in a chat thread.',
    sourceLabelled: false,
    stored: true,
    canClear: 'Clear local ORB memory or use temporary chat.'
  },
  {
    id: 'templates',
    label: 'Record types & templates',
    mayUse: 'Templates and record types you select.',
    shouldNotInfer: 'Automatic record type from child identity.',
    requiresUserAction: 'You pick a record type or template.',
    sourceLabelled: true,
    stored: true,
    canClear: 'Choose a different template or start fresh.'
  },
  {
    id: 'uploaded_documents',
    label: 'Uploaded documents',
    mayUse: 'Documents you upload or attach in composer.',
    shouldNotInfer: 'Background indexing of files you did not select.',
    requiresUserAction: 'You upload or attach a document.',
    sourceLabelled: true,
    stored: true,
    canClear: 'Remove from Documents or do not attach.'
  },
  {
    id: 'organisation',
    label: 'Organisation / home',
    mayUse: 'Nothing from IndiCare OS live records in ORB Residential.',
    shouldNotInfer: 'Home roster, child records or OS permissions.',
    requiresUserAction: 'Use IndiCare OS ORB for permissioned OS context.',
    sourceLabelled: true,
    stored: false,
    canClear: 'Not applicable — ORB Residential does not access OS records.'
  },
  {
    id: 'role',
    label: 'Role',
    mayUse: 'Your account role for feature access (e.g. admin bypass in dev).',
    shouldNotInfer: 'Child-specific permissions or case access.',
    requiresUserAction: 'Assigned by your account.',
    sourceLabelled: false,
    stored: true,
    canClear: 'Sign out or contact your administrator.'
  },
  {
    id: 'billing',
    label: 'Billing plan',
    mayUse: 'Subscription status to enable Voice and other paid features.',
    shouldNotInfer: 'Usage patterns for care decisions.',
    requiresUserAction: 'You subscribe through billing.',
    sourceLabelled: false,
    stored: true,
    canClear: 'Manage in Account & Billing.'
  }
]

export const ORB_PERSONAL_CONTEXT_SUMMARY =
  'Personal context helps ORB remember your preferences and the way you use ORB. Do not use it for unnecessary child-identifiable information.'

export const ORB_NO_CHILD_MEMORY_CLAIM =
  'ORB Residential does not create automatic child profiles or hidden child-memory from your chats.'

export function getPersonalContextRule(id: OrbPersonalContextSource): OrbPersonalContextRule | undefined {
  return ORB_PERSONAL_CONTEXT_RULES.find((rule) => rule.id === id)
}

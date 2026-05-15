export type OrbProductMode = 'os_embedded' | 'standalone'
export type OrbSurface = 'docked' | 'expanded' | 'immersive' | 'standalone'
export type OrbRole = 'operational_companion' | 'standalone_assistant'
export type OrbAccessScope = 'active_child_only' | 'home_scoped' | 'provider_scoped_manager' | 'standalone_no_os_access'
export type OrbRetrievalPolicy = 'active_child_rbac_only' | 'home_rbac_only' | 'provider_manager_rbac_only' | 'static_and_user_supplied_only' | 'blocked'

export type OrbAccessibilityProfile = {
  captions?: boolean
  transcript?: boolean
  reducedMotion?: boolean
  highContrast?: boolean
  largerText?: boolean
  simplifiedLayout?: boolean
}

export type OrbIdentityMetadata = {
  product_mode: OrbProductMode
  orb_surface: OrbSurface
  orb_role: OrbRole
  voice_profile: 'british_female_calm'
  tone_profile: 'calm_concise_human'
  safety_posture: 'evidence_led_review_required'
  access_scope: OrbAccessScope
  accessibility_profile: OrbAccessibilityProfile
  environment_mode: string
  operational_state: Record<string, unknown>
  presence_state: Record<string, unknown>
  emotional_safety_state: Record<string, unknown>
  retrieval_policy: OrbRetrievalPolicy
  brand_line: 'Care. Connect. Empower.'
  product_language: string
}

export const orbIdentityStatements = {
  name: 'ORB powered by IndiCare',
  osProductLanguage: 'IndiCare OS with ORB',
  standaloneProductLanguage: 'ORB powered by IndiCare.',
  brandLine: 'Care. Connect. Empower.',
  supportingMessage: 'ORB helps adults understand, record and evidence care with calm, child-centred intelligence.',
  is: [
    'the emotional interaction layer for IndiCare',
    'a calm British female operational companion',
    'voice-first',
    'accessibility-first',
    'trauma-informed',
    'neurodiversity-aware',
    'safeguarding-cautious',
    'evidence-led',
    'concise',
    'warm',
    'practical',
    'emotionally intelligent'
  ],
  isNot: [
    'a generic chatbot',
    'a wellness-only product',
    'a diagnostic tool',
    'a safeguarding decision maker',
    'allowed to access OS records in standalone mode',
    'allowed to silently write records',
    'allowed to fabricate evidence'
  ]
} as const

export function createOrbIdentityMetadata(options: {
  productMode: OrbProductMode
  surface?: OrbSurface
  accessScope?: OrbAccessScope
  accessibilityProfile?: OrbAccessibilityProfile
  environmentMode?: string
  operationalState?: Record<string, unknown>
  presenceState?: Record<string, unknown>
  emotionalSafetyState?: Record<string, unknown>
}): OrbIdentityMetadata {
  const standalone = options.productMode === 'standalone'
  const accessScope = options.accessScope ?? (standalone ? 'standalone_no_os_access' : 'active_child_only')
  return {
    product_mode: options.productMode,
    orb_surface: options.surface ?? (standalone ? 'standalone' : 'docked'),
    orb_role: standalone ? 'standalone_assistant' : 'operational_companion',
    voice_profile: 'british_female_calm',
    tone_profile: 'calm_concise_human',
    safety_posture: 'evidence_led_review_required',
    access_scope: accessScope,
    accessibility_profile: options.accessibilityProfile ?? {},
    environment_mode: options.environmentMode ?? 'general',
    operational_state: options.operationalState ?? {},
    presence_state: options.presenceState ?? {},
    emotional_safety_state: options.emotionalSafetyState ?? {},
    retrieval_policy: standalone
      ? 'static_and_user_supplied_only'
      : accessScope === 'provider_scoped_manager'
        ? 'provider_manager_rbac_only'
        : accessScope === 'home_scoped'
          ? 'home_rbac_only'
          : 'active_child_rbac_only',
    brand_line: 'Care. Connect. Empower.',
    product_language: standalone ? 'ORB powered by IndiCare.' : 'IndiCare OS with ORB'
  }
}


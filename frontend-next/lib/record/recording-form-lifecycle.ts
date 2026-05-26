/** Archive, chronology, plan impact and LifeEcho behaviour per form. */

export type ArchiveBehaviour = 'signed_off_only' | 'restricted_summary' | 'draft_never' | 'not_applicable'
export type ChronologyBehaviour = 'create_story_event' | 'link_only' | 'restricted_summary' | 'not_applicable'
export type PlanImpactBehaviour =
  | 'health_plan'
  | 'education_plan'
  | 'risk_assessment'
  | 'family_time_plan'
  | 'behaviour_support_plan'
  | 'medication_plan'
  | 'missing_plan'
  | 'safeguarding_plan'
  | 'none'
export type LifeEchoBehaviour = 'positive_safe_only' | 'never_auto' | 'review_required' | 'not_applicable'

export type RecordingFormLifecycleConfig = {
  archive_behaviour: ArchiveBehaviour
  chronology_behaviour: ChronologyBehaviour
  plan_impact_behaviour: PlanImpactBehaviour
  lifeecho_behaviour: LifeEchoBehaviour
}

const DEFAULT_LIFECYCLE: RecordingFormLifecycleConfig = {
  archive_behaviour: 'signed_off_only',
  chronology_behaviour: 'create_story_event',
  plan_impact_behaviour: 'none',
  lifeecho_behaviour: 'review_required'
}

const FORM_OVERRIDES: Record<string, Partial<RecordingFormLifecycleConfig>> = {
  'safeguarding-concern': {
    archive_behaviour: 'restricted_summary',
    chronology_behaviour: 'restricted_summary',
    plan_impact_behaviour: 'safeguarding_plan',
    lifeecho_behaviour: 'never_auto'
  },
  disclosure: {
    archive_behaviour: 'restricted_summary',
    chronology_behaviour: 'restricted_summary',
    plan_impact_behaviour: 'safeguarding_plan',
    lifeecho_behaviour: 'never_auto'
  },
  allegation: {
    archive_behaviour: 'restricted_summary',
    chronology_behaviour: 'restricted_summary',
    plan_impact_behaviour: 'safeguarding_plan',
    lifeecho_behaviour: 'never_auto'
  },
  'physical-intervention': {
    plan_impact_behaviour: 'behaviour_support_plan',
    lifeecho_behaviour: 'never_auto'
  },
  'body-map': { plan_impact_behaviour: 'health_plan', lifeecho_behaviour: 'never_auto' },
  'injury-body-map': { plan_impact_behaviour: 'health_plan', lifeecho_behaviour: 'never_auto' },
  'medication-error': { plan_impact_behaviour: 'medication_plan', lifeecho_behaviour: 'never_auto' },
  'medication-note-error': { plan_impact_behaviour: 'medication_plan', lifeecho_behaviour: 'never_auto' },
  'missing-episode': { plan_impact_behaviour: 'missing_plan', lifeecho_behaviour: 'never_auto' },
  missing: { plan_impact_behaviour: 'missing_plan', lifeecho_behaviour: 'never_auto' },
  'return-conversation': { plan_impact_behaviour: 'missing_plan' },
  'family-time': { plan_impact_behaviour: 'family_time_plan', lifeecho_behaviour: 'positive_safe_only' },
  'education-note': { plan_impact_behaviour: 'education_plan', lifeecho_behaviour: 'positive_safe_only' },
  'health-appointment': { plan_impact_behaviour: 'health_plan' },
  'behaviour-support': { plan_impact_behaviour: 'behaviour_support_plan' },
  'behaviour-support-plan-update': { plan_impact_behaviour: 'behaviour_support_plan' },
  'risk-assessment-update': { plan_impact_behaviour: 'risk_assessment' },
  'daily-note': { lifeecho_behaviour: 'positive_safe_only' },
  keywork: { lifeecho_behaviour: 'positive_safe_only' },
  'child-voice': { lifeecho_behaviour: 'positive_safe_only' },
  compliment: { lifeecho_behaviour: 'positive_safe_only' },
  handover: { archive_behaviour: 'draft_never', chronology_behaviour: 'link_only' },
  'staff-reflection': { archive_behaviour: 'not_applicable', chronology_behaviour: 'not_applicable', lifeecho_behaviour: 'not_applicable' },
  'staff-wellbeing-check-in': { archive_behaviour: 'not_applicable', chronology_behaviour: 'not_applicable', lifeecho_behaviour: 'not_applicable' },
  'team-meeting': { archive_behaviour: 'not_applicable', chronology_behaviour: 'not_applicable', lifeecho_behaviour: 'not_applicable' }
}

const CATEGORY_DEFAULTS: Partial<Record<string, Partial<RecordingFormLifecycleConfig>>> = {
  safeguarding_incident: { lifeecho_behaviour: 'never_auto' },
  manager_governance: { chronology_behaviour: 'link_only' },
  workforce: { archive_behaviour: 'draft_never', chronology_behaviour: 'not_applicable' },
  environment: { archive_behaviour: 'draft_never', chronology_behaviour: 'not_applicable', lifeecho_behaviour: 'not_applicable' }
}

export function lifecycleForForm(formId: string, category?: string): RecordingFormLifecycleConfig {
  const categoryPatch = category ? CATEGORY_DEFAULTS[category] : undefined
  const formPatch = FORM_OVERRIDES[formId]
  return {
    ...DEFAULT_LIFECYCLE,
    ...categoryPatch,
    ...formPatch
  }
}

export function lifecycleLabel(config: RecordingFormLifecycleConfig): string {
  const parts: string[] = []
  if (config.archive_behaviour === 'signed_off_only') parts.push('Archive after sign-off')
  if (config.archive_behaviour === 'restricted_summary') parts.push('Restricted archive summary')
  if (config.chronology_behaviour === 'create_story_event') parts.push('Chronology story')
  if (config.plan_impact_behaviour !== 'none') parts.push('Plan impact possible')
  if (config.lifeecho_behaviour === 'positive_safe_only') parts.push('LifeEcho (positive/safe)')
  return parts.join(' · ') || 'Standard lifecycle'
}

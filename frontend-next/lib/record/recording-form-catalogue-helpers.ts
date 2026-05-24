import type {
  RecordingFormCategory,
  RecordingFormDefinition,
  RecordingFormPriority,
  RecordingFormRouteKind,
  RecordingFormStatus,
  RecordingWorkspaceType
} from '@/lib/record/recording-form-registry'

export type RecordingWorkflowStatus =
  | 'formal_submit_supported'
  | 'opens_existing_workflow'
  | 'draft_workspace'
  | 'manager_review_required'
  | 'safeguarding_sensitive'

export type CatalogueFormInput = {
  id: string
  title: string
  category: RecordingFormCategory
  description: string
  therapeuticPrompt: string
  qualityChecklist: string[]
  orbSuggestedPrompts?: string[]
  tags?: string[]
  status?: RecordingFormStatus
  priority?: RecordingFormPriority
  routeKind?: RecordingFormRouteKind
  workflowStatus: RecordingWorkflowStatus
  workspaceType?: RecordingWorkspaceType
  route?: string
  workflowSegment?: string
  cardId?: RecordingFormDefinition['cardId']
  requiresChild?: boolean
  requiresManagerReview?: boolean
  safeguardingSensitive?: boolean
  privacySensitive?: boolean
  relatedQualityStandards?: string[]
  relatedEvidenceAreas?: string[]
  gap?: string
  recommendedNextAction?: string
}

const STANDARDS_DISCLAIMER =
  'Aligned to children’s homes practice and inspection evidence — not a legal completeness guarantee.'

export function workflowStatusLabel(status: RecordingWorkflowStatus): string {
  switch (status) {
    case 'formal_submit_supported':
      return 'Formal submit supported'
    case 'opens_existing_workflow':
      return 'Opens existing workflow'
    case 'draft_workspace':
      return 'Draft workspace'
    case 'manager_review_required':
      return 'Manager review required'
    case 'safeguarding_sensitive':
      return 'Safeguarding sensitive'
    default:
      return 'Draft workspace'
  }
}

export function workflowStatusMicrocopy(
  status: RecordingWorkflowStatus,
  routeKind: RecordingFormRouteKind
): string {
  switch (status) {
    case 'formal_submit_supported':
      return 'This form can be submitted into a formal record workflow when a child is selected and review rules are met.'
    case 'opens_existing_workflow':
      return 'Use this workspace to prepare the record, then open the existing formal workflow to complete submission.'
    case 'manager_review_required':
      return 'This form should be reviewed before it is treated as a completed formal record. Follow local safeguarding procedures.'
    case 'safeguarding_sensitive':
      return 'Safeguarding sensitive — draft can be prepared here. Manager/safeguarding review likely required. Do not auto-submit unsupported high-risk forms.'
    case 'draft_workspace':
    default:
      if (routeKind === 'draft_workspace') {
        return 'This form can be drafted here. Formal workflow is not wired yet — save as draft and use the correct route when ready.'
      }
      return 'Prepare your record in this workspace; the adult remains responsible for the final record.'
  }
}

export function workflowStatusBadgeClass(status: RecordingWorkflowStatus): string {
  switch (status) {
    case 'formal_submit_supported':
      return 'bg-emerald-100 text-emerald-900'
    case 'opens_existing_workflow':
      return 'bg-blue-100 text-blue-900'
    case 'manager_review_required':
      return 'bg-amber-100 text-amber-900'
    case 'safeguarding_sensitive':
      return 'bg-rose-100 text-rose-900'
    case 'draft_workspace':
    default:
      return 'bg-slate-100 text-slate-800'
  }
}

export function recordWorkspaceRouteForForm(
  formId: string,
  workspaceType?: RecordingWorkspaceType,
  childId?: string
) {
  const type = workspaceType || 'general-draft'
  const params = new URLSearchParams({ type, form: formId })
  if (childId) {
    params.set('child_id', childId)
    params.set('about', 'child')
  }
  return `/record?${params.toString()}`
}

export function buildCatalogueForm(input: CatalogueFormInput): RecordingFormDefinition {
  const routeKind =
    input.routeKind ??
    (input.workflowStatus === 'formal_submit_supported'
      ? 'existing_workflow'
      : input.workflowStatus === 'opens_existing_workflow'
        ? 'existing_workflow'
        : 'draft_workspace')

  const requiresManagerReview =
    input.requiresManagerReview ??
    (input.workflowStatus === 'manager_review_required' ||
      input.workflowStatus === 'safeguarding_sensitive')

  const safeguardingSensitive =
    input.safeguardingSensitive ??
    (input.workflowStatus === 'safeguarding_sensitive' ||
      (input.category === 'safeguarding_incident' && input.workflowStatus !== 'draft_workspace'))

  const workspaceType = input.workspaceType ?? 'general-draft'
  const route = input.route ?? recordWorkspaceRouteForForm(input.id, workspaceType)

  const checklist =
    input.qualityChecklist.length >= 5
      ? input.qualityChecklist
      : [
          ...input.qualityChecklist,
          'Facts described clearly and child-centred where appropriate',
          'Adult actions and follow-up recorded',
          'No unnecessary third-party identifiers',
          'Next steps or continuity clear',
          'Adult remains responsible for accuracy'
        ].slice(0, Math.max(5, input.qualityChecklist.length + 3))

  return {
    id: input.id,
    title: input.title,
    category: input.category,
    description: input.description,
    route,
    workspaceType: input.workspaceType ?? 'general-draft',
    cardId: input.cardId,
    workflowSegment: input.workflowSegment,
    requiresChild: input.requiresChild ?? true,
    requiresManagerReview,
    safeguardingSensitive,
    privacySensitive: input.privacySensitive ?? safeguardingSensitive,
    suggestedOrbMode: 'record_quality_review',
    therapeuticPrompt: input.therapeuticPrompt,
    qualityChecklist: checklist,
    orbSuggestedPrompts:
      (input.orbSuggestedPrompts?.length ?? 0) > 0
        ? input.orbSuggestedPrompts!
        : [
            `What should I include in this ${input.title.toLowerCase()}?`,
            'Help me keep this factual and child-centred.',
            'Does this need manager review?',
            'What follow-up should be recorded?'
          ],
    tags: input.tags ?? [],
    status: input.status ?? (routeKind === 'draft_workspace' ? 'partial' : 'built'),
    priority: input.priority ?? 'P2',
    routeKind,
    workflowStatus: input.workflowStatus,
    relatedQualityStandards: input.relatedQualityStandards ?? ['Reg 7', 'QS leadership'],
    relatedEvidenceAreas: input.relatedEvidenceAreas ?? ['SCCIF evidence', STANDARDS_DISCLAIMER]
  }
}

/**
 * Child-centred recording selector categories — maps practice-facing groups to registry metadata.
 * Forms are resolved from RECORDING_FORM_REGISTRY; do not hard-code individual forms here.
 */

import type { RecordingFormCategory, RecordingFormDefinition } from '@/lib/record/recording-form-registry'
import {
  RECORDING_FORM_REGISTRY,
  catalogueRecordingForms,
  workspaceRecordingForms
} from '@/lib/record/recording-form-registry'
import type { RecordAboutContext } from '@/lib/record/recording-hub'
import { recordingTypeVisibleForAbout } from '@/lib/record/recording-types'
import type { RecordingWorkspaceType } from '@/lib/record/recording-form-registry'

export type RecordingSelectorCategoryId =
  | 'daily_life'
  | 'child_voice'
  | 'safeguarding'
  | 'incident_behaviour'
  | 'physical_intervention'
  | 'missing_from_care'
  | 'health_medication'
  | 'education'
  | 'family_time'
  | 'keywork'
  | 'professional_visit'
  | 'complaint_concern'
  | 'environment'
  | 'planning_review'
  | 'reg_evidence'
  | 'other'

export type RecordingSelectorCategory = {
  id: RecordingSelectorCategoryId
  label: string
  description: string
  registryCategories: RecordingFormCategory[]
  /** Optional workspace types always included in this selector group. */
  workspaceTypes?: RecordingWorkspaceType[]
  /** Optional explicit form ids (catalogue-only forms without workspace type). */
  formIds?: string[]
}

export const RECORDING_SELECTOR_CATEGORIES: RecordingSelectorCategory[] = [
  {
    id: 'daily_life',
    label: 'Daily life',
    description: 'Ordinary day, routines, activities and how the child experienced them.',
    registryCategories: ['daily_life']
  },
  {
    id: 'child_voice',
    label: 'Child voice / direct work',
    description: 'What the child said, showed or communicated through direct work.',
    registryCategories: ['voice_direct_work']
  },
  {
    id: 'safeguarding',
    label: 'Safeguarding',
    description: 'Concerns about harm, risk, exploitation or child protection.',
    registryCategories: ['safeguarding_incident'],
    formIds: ['safeguarding-concern', 'disclosure', 'allegation', 'exploitation-concern', 'child-on-child-concern']
  },
  {
    id: 'incident_behaviour',
    label: 'Incident / behaviour',
    description: 'Incidents, dysregulation, behaviour support and follow-up.',
    registryCategories: ['safeguarding_incident', 'daily_life'],
    workspaceTypes: ['incident', 'behaviour-support', 'staff-debrief']
  },
  {
    id: 'physical_intervention',
    label: 'Physical intervention',
    description: 'Restraint, holds, injury body maps and immediate aftermath.',
    registryCategories: ['safeguarding_incident'],
    workspaceTypes: ['physical-intervention', 'injury-body-map']
  },
  {
    id: 'missing_from_care',
    label: 'Missing from care',
    description: 'Missing episodes, return conversations and welfare checks.',
    registryCategories: ['missing_return']
  },
  {
    id: 'health_medication',
    label: 'Health / medication',
    description: 'Health appointments, medication, observations and errors.',
    registryCategories: ['health_medication']
  },
  {
    id: 'education',
    label: 'Education',
    description: 'School, learning, attendance and education meetings.',
    registryCategories: ['education_family'],
    workspaceTypes: ['education-note']
  },
  {
    id: 'family_time',
    label: 'Family time',
    description: 'Contact, family time and relationship moments.',
    registryCategories: ['education_family'],
    workspaceTypes: ['family-time']
  },
  {
    id: 'keywork',
    label: 'Keywork',
    description: 'Keywork sessions, goals and relational practice.',
    registryCategories: ['voice_direct_work', 'daily_life'],
    workspaceTypes: ['keywork']
  },
  {
    id: 'professional_visit',
    label: 'Professional visit',
    description: 'Visits from social workers, health, education or other professionals.',
    registryCategories: ['documents_evidence', 'daily_life'],
    workspaceTypes: ['professional-visit']
  },
  {
    id: 'complaint_concern',
    label: 'Complaint / concern',
    description: 'Complaints, concerns raised by child or adults, and responses.',
    registryCategories: ['safeguarding_incident', 'manager_governance'],
    workspaceTypes: ['complaint-concern']
  },
  {
    id: 'environment',
    label: 'Environment / room search',
    description: 'Room searches, damage, repairs and environmental records.',
    registryCategories: ['environment'],
    workspaceTypes: ['room-search', 'damage-repair']
  },
  {
    id: 'planning_review',
    label: 'Planning / review',
    description: 'Care plans, reviews, plan impacts and formal planning evidence.',
    registryCategories: ['planning_review', 'manager_governance']
  },
  {
    id: 'reg_evidence',
    label: 'Reg 44 / Reg 45 evidence',
    description: 'Regulatory visit evidence and formal inspection artefacts.',
    registryCategories: ['manager_governance', 'documents_evidence'],
    workspaceTypes: ['reg44-evidence', 'reg45-evidence']
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Handover, workforce, documents and anything not listed above.',
    registryCategories: ['workforce', 'documents_evidence', 'manager_governance']
  }
]

const DEFAULT_SELECTOR_CATEGORY: RecordingSelectorCategoryId = 'daily_life'

function formMatchesCategory(form: RecordingFormDefinition, category: RecordingSelectorCategory): boolean {
  if (category.registryCategories.includes(form.category)) return true
  if (form.workspaceType && category.workspaceTypes?.includes(form.workspaceType)) return true
  if (category.formIds?.includes(form.id)) return true
  return false
}

/** Workspace-capable forms for a selector category, respecting about-context visibility. */
export function workspaceFormsForSelectorCategory(
  categoryId: RecordingSelectorCategoryId,
  about: RecordAboutContext = 'child'
): RecordingFormDefinition[] {
  const category = RECORDING_SELECTOR_CATEGORIES.find((c) => c.id === categoryId) || RECORDING_SELECTOR_CATEGORIES[0]
  const workspaceForms = workspaceRecordingForms()
  const seen = new Set<string>()
  const results: RecordingFormDefinition[] = []

  for (const form of workspaceForms) {
    if (!form.workspaceType || seen.has(form.workspaceType)) continue
    if (!formMatchesCategory(form, category)) continue
    if (!recordingTypeVisibleForAbout(form.workspaceType, about)) continue
    seen.add(form.workspaceType)
    results.push(form)
  }

  return results.sort((a, b) => a.title.localeCompare(b.title))
}

/** All catalogue forms for browse-all (registry-backed). */
export function allCatalogueFormsForAbout(about: RecordAboutContext = 'child'): RecordingFormDefinition[] {
  return catalogueRecordingForms().filter((form) => {
    if (about === 'staff') {
      return !form.requiresChild || form.category === 'workforce' || form.category === 'manager_governance'
    }
    if (!form.workspaceType) return true
    return recordingTypeVisibleForAbout(form.workspaceType, about)
  })
}

export function defaultSelectorCategoryId(): RecordingSelectorCategoryId {
  return DEFAULT_SELECTOR_CATEGORY
}

export function selectorCategoryById(id: string): RecordingSelectorCategory | undefined {
  return RECORDING_SELECTOR_CATEGORIES.find((c) => c.id === id)
}

/** Count of workspace types available (for tests — not 80 cards). */
export function workspaceSelectorOptionCount(about: RecordAboutContext = 'child'): number {
  const types = new Set<string>()
  for (const cat of RECORDING_SELECTOR_CATEGORIES) {
    for (const form of workspaceFormsForSelectorCategory(cat.id, about)) {
      if (form.workspaceType) types.add(form.workspaceType)
    }
  }
  return types.size
}

export function registryFormCount(): number {
  return RECORDING_FORM_REGISTRY.length
}

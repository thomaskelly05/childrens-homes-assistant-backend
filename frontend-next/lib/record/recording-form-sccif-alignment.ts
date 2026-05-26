/** SCCIF / Quality Standards relevance — evidence support only, not compliance claims. */

export const SCCIF_ALIGNMENT_DISCLAIMER =
  'May support evidence for inspection themes — not a compliance or grading statement.'

export type RecordingFormSccifMeta = {
  quality_standards: string[]
  sccif_evidence_areas: string[]
  regulatory_relevance: string[]
  inspection_evidence_type: string | null
  alignment_note: string
}

const FORM_SCCIF_OVERRIDES: Record<string, Partial<RecordingFormSccifMeta>> = {
  'safeguarding-concern': {
    quality_standards: ['Protection of children', 'Safeguarding', 'Leadership oversight'],
    sccif_evidence_areas: ['Protection', 'Safeguarding procedures'],
    regulatory_relevance: ['Reg 12', 'Reg 13'],
    inspection_evidence_type: 'Safeguarding and protection'
  },
  'education-note': {
    quality_standards: ['Education progress and outcomes'],
    sccif_evidence_areas: ['Education and learning'],
    regulatory_relevance: ['Reg 8'],
    inspection_evidence_type: 'Education'
  },
  'health-appointment': {
    quality_standards: ['Health and wellbeing'],
    regulatory_relevance: ['Reg 10'],
    inspection_evidence_type: 'Health'
  },
  'family-time': {
    quality_standards: ['Positive relationships'],
    regulatory_relevance: ['Reg 9'],
    inspection_evidence_type: 'Family time / contact'
  },
  keywork: {
    quality_standards: ['Wishes and feelings', 'Enjoyment and achievement'],
    regulatory_relevance: ['Reg 7'],
    inspection_evidence_type: 'Child voice and direct work'
  },
  'child-voice': {
    quality_standards: ['Wishes and feelings'],
    regulatory_relevance: ['Reg 7'],
    inspection_evidence_type: 'Participation'
  },
  'physical-intervention': {
    quality_standards: ['Behaviour support', 'Protection', 'Leadership oversight'],
    regulatory_relevance: ['Reg 13'],
    inspection_evidence_type: 'Restraint / behaviour'
  },
  incident: {
    quality_standards: ['Protection', 'Behaviour support'],
    regulatory_relevance: ['Reg 12', 'Reg 13'],
    inspection_evidence_type: 'Incidents'
  },
  'complaint-concern': {
    quality_standards: ["Children's views and rights"],
    regulatory_relevance: ['Reg 35'],
    inspection_evidence_type: 'Complaints'
  },
  'reg44-evidence': {
    quality_standards: ['Leadership and management'],
    regulatory_relevance: ['Reg 44'],
    inspection_evidence_type: 'Independent person visit'
  },
  'reg45-evidence': {
    quality_standards: ['Quality of care review'],
    regulatory_relevance: ['Reg 45'],
    inspection_evidence_type: 'Quality of care review'
  },
  'missing-episode': {
    quality_standards: ['Protection', 'Leadership oversight'],
    regulatory_relevance: ['Missing from care'],
    inspection_evidence_type: 'Missing episodes'
  }
}

const CATEGORY_SCCIF: Partial<Record<string, Partial<RecordingFormSccifMeta>>> = {
  daily_life: {
    quality_standards: ['Enjoyment and achievement', 'Everyday experiences'],
    sccif_evidence_areas: ['Daily life and care'],
    inspection_evidence_type: 'Daily care'
  },
  safeguarding_incident: {
    quality_standards: ['Protection', 'Behaviour support'],
    sccif_evidence_areas: ['Safeguarding'],
    inspection_evidence_type: 'Safeguarding / incidents'
  },
  health_medication: {
    quality_standards: ['Health and wellbeing'],
    regulatory_relevance: ['Reg 10'],
    inspection_evidence_type: 'Health'
  },
  education_family: {
    quality_standards: ['Education', 'Positive relationships'],
    inspection_evidence_type: 'Education and relationships'
  }
}

export function sccifAlignmentForForm(
  formId: string,
  category?: string,
  relatedQualityStandards?: string[],
  relatedEvidenceAreas?: string[]
): RecordingFormSccifMeta {
  const override = FORM_SCCIF_OVERRIDES[formId]
  const categoryBase = category ? CATEGORY_SCCIF[category] : undefined
  return {
    quality_standards:
      override?.quality_standards ||
      relatedQualityStandards ||
      categoryBase?.quality_standards ||
      ['Reg 7', 'Leadership oversight'],
    sccif_evidence_areas:
      override?.sccif_evidence_areas ||
      relatedEvidenceAreas ||
      categoryBase?.sccif_evidence_areas ||
      ['SCCIF evidence themes'],
    regulatory_relevance: override?.regulatory_relevance || categoryBase?.regulatory_relevance || [],
    inspection_evidence_type:
      override?.inspection_evidence_type || categoryBase?.inspection_evidence_type || 'General care record',
    alignment_note: SCCIF_ALIGNMENT_DISCLAIMER
  }
}

export function sccifRelevancePhrase(meta: RecordingFormSccifMeta): string {
  const themes = meta.quality_standards.slice(0, 2).join(', ')
  return `Relevant to ${themes}. Review alongside ${meta.inspection_evidence_type ?? 'inspection evidence'}.`
}

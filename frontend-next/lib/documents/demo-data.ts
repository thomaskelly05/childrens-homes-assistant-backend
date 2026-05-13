import { HomeDocument } from './types'

export const demoHomeDocuments: HomeDocument[] = [
  {
    id: 'doc-reg44-apr-2026',
    homeId: 'home-oak',
    title: 'Reg 44 independent visitor report - April 2026',
    documentType: 'reg44_report',
    uploadedAt: '2026-05-01T09:30:00.000Z',
    uploadedBy: 'staff-ella',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    fileName: 'reg-44-oak-house-april-2026.pdf',
    fileUrl: '#',
    status: 'action_plan_open',
    regulation: 'Regulation 44',
    reviewRequiredBy: '2026-05-15',
    tags: ['reg44', 'independent-visitor', 'action-plan'],
    linkedActions: ['act-reg44-return-interviews'],
    linkedEvidence: ['ev-reg44-april-finding-3'],
    extractedText:
      'Finding 3: Return interview outcomes following missing episodes are not consistently visible in the young person chronology. Recommendation: ensure return interview records are linked to the missing episode and manager review.',
    extractedFindings: [
      {
        id: 'finding-reg44-apr-3',
        title: 'Return interview outcomes need a clearer audit trail',
        summary: 'The independent visitor could not easily evidence that return interview outcomes were linked to missing episode records.',
        regulation: 'Regulation 44',
        severity: 'urgent',
        actionIds: ['act-reg44-return-interviews'],
        evidenceRequired: ['Return interview record', 'Manager review sign-off', 'Updated chronology link'],
        chronologyEventId: 'chron-reg44-april'
      },
      {
        id: 'finding-reg44-apr-5',
        title: 'Young people spoken to want clearer activity planning',
        summary: 'Children described wanting earlier notice of changed community activities.',
        regulation: 'Children Homes Regulations 2015 Reg 7',
        severity: 'medium',
        actionIds: [],
        evidenceRequired: ['Activity planning feedback', 'Child voice record', 'Manager response']
      }
    ]
  },
  {
    id: 'doc-reg45-draft-2026',
    homeId: 'home-oak',
    title: 'Reg 45 quality of care review draft - 2026',
    documentType: 'reg45_report',
    uploadedAt: '2026-05-10T15:00:00.000Z',
    uploadedBy: 'staff-ella',
    periodStart: '2025-06-01',
    periodEnd: '2026-05-31',
    fileName: 'reg-45-draft-2026.docx',
    fileUrl: '#',
    status: 'review_required',
    regulation: 'Regulation 45',
    reviewRequiredBy: '2026-05-31',
    tags: ['reg45', 'quality-of-care', 'draft'],
    linkedActions: ['act-reg45-feedback'],
    linkedEvidence: ['ev-mia-child-voice'],
    extractedText: 'Draft requires evidence from children, families and placing authorities before manager sign-off.',
    extractedFindings: [
      {
        id: 'finding-reg45-feedback',
        title: 'External feedback evidence incomplete',
        summary: 'Professional and family feedback has been requested but is not yet attached to the review.',
        regulation: 'Regulation 45',
        severity: 'medium',
        actionIds: ['act-reg45-feedback'],
        evidenceRequired: ['Social worker feedback', 'Family feedback where appropriate', 'Virtual school feedback'],
        chronologyEventId: 'chron-reg45-prep'
      }
    ]
  },
  {
    id: 'doc-noah-missing-protocol',
    homeId: 'home-oak',
    title: 'Noah missing from care protocol',
    documentType: 'missing_protocol',
    uploadedAt: '2026-05-11T11:00:00.000Z',
    uploadedBy: 'staff-morgan',
    periodStart: '2026-05-11',
    fileName: 'noah-missing-protocol-may-2026.pdf',
    fileUrl: '#',
    status: 'review_required',
    regulation: 'Children Homes Regulations 2015 Reg 12',
    reviewRequiredBy: '2026-05-18',
    tags: ['missing', 'safeguarding', 'risk'],
    linkedActions: ['act-reg44-return-interviews'],
    linkedEvidence: ['ev-noah-missing-return'],
    extractedFindings: []
  },
  {
    id: 'doc-jamie-lac-review',
    homeId: 'home-oak',
    title: 'Jamie LAC review pack - May 2026',
    documentType: 'lac_review',
    uploadedAt: '2026-05-13T12:20:00.000Z',
    uploadedBy: 'staff-abi',
    periodStart: '2026-04-13',
    periodEnd: '2026-05-13',
    fileName: 'jamie-lac-review-may-2026.docx',
    fileUrl: '#',
    status: 'uploaded',
    tags: ['lac-review', 'education', 'family-time'],
    linkedActions: ['act-education-evidence'],
    linkedEvidence: ['ev-jamie-school-attendance'],
    extractedFindings: []
  }
]

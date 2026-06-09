import { getFounderTelemetrySummary } from '@/lib/founder/telemetry'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import type { ContentDraft, LinkedInPostTemplate } from './founder-content-types'
import { addContentDraft } from './content-draft-store'

const TEMPLATE_INTROS: Record<LinkedInPostTemplate, string> = {
  'today-progress': "Today's progress at IndiCare Intelligence",
  'weekly-progress': "This week's progress building ethical intelligence for children's homes",
  'founder-story': 'Why I am building IndiCare — from residential childcare to ethical intelligence',
  'orb-feature-launch': 'ORB update: supporting practitioners with child-centred, Ofsted-aligned intelligence',
  'ethical-intelligence': 'Ethical intelligence in children\'s homes — time returned to direct care',
  'call-for-testers': 'Calling sector testers for IndiCare Intelligence',
  'sector-experts': 'Seeking residential childcare and Ofsted expertise',
  'investor-update-style': 'Founder update — building in public with honesty',
  'lessons-residential-childcare': 'Lessons from residential childcare that shape our product'
}

function buildDataBasis(): string {
  const telemetry = getFounderTelemetrySummary()
  if (telemetry.totalEvents === 0) {
    return 'No live telemetry — principles and founder narrative only. No metrics claimed.'
  }
  return `Live telemetry: ${telemetry.totalEvents} events, ${telemetry.orbConversations} ORB conversations. Figures verified from connected sources only.`
}

function buildPostBody(template: LinkedInPostTemplate): string {
  const intro = TEMPLATE_INTROS[template]
  const dataBasis = buildDataBasis()
  const telemetry = getFounderTelemetrySummary()

  const metricsBlock =
    telemetry.totalEvents > 0
      ? `\n\nFrom live platform signals: ${telemetry.orbConversations} ORB conversations recorded. ORB modes in use: ${telemetry.topOrbModes.map((m) => m.mode).join(', ') || 'connecting'}.`
      : '\n\n[No live metrics included — connect telemetry before claiming traction.]'

  return `${intro}

IndiCare Intelligence exists to return time to direct care in children's homes — through ORB, Ofsted readiness support, and ethical intelligence that never replaces professional judgement.

${dataBasis}${metricsBlock}

#ChildrensHomes #ResidentialChildCare #EthicalAI #Ofsted #SocialCare

— Thomas Kelly, Founder, IndiCare Intelligence

[DRAFT — requires Thomas approval before posting]`
}

export function generateLinkedInDraft(
  template: LinkedInPostTemplate = 'weekly-progress'
): ContentDraft {
  const body = buildPostBody(template)
  const safety = checkFounderOutputSafety(body)

  const draft = addContentDraft({
    title: TEMPLATE_INTROS[template],
    channel: 'linkedin',
    body: safety.redactedContent,
    createdByAgent: 'brand-ambassador',
    safetyNotes: safety.issues.map((i) => i.message),
    dataBasis: buildDataBasis(),
    status: safety.requiresReview ? 'needs-review' : 'draft'
  })

  createApprovalItem({
    type: 'linkedin-post',
    title: draft.title,
    content: draft.body,
    requestedByAgent: 'brand-ambassador',
    riskLevel: safety.safe ? 'low' : 'high',
    safetyCheck: safety.issues.map((i) => i.message).join('; ') || 'Passed safety check'
  })

  return draft
}

export function generateFounderUpdateDraft(): ContentDraft {
  const body = buildPostBody('founder-story').replace('[DRAFT — requires Thomas approval before posting]', '')
  const safety = checkFounderOutputSafety(body)
  return addContentDraft({
    title: 'Founder Update',
    channel: 'founder-update',
    body: safety.redactedContent,
    createdByAgent: 'brand-ambassador',
    safetyNotes: safety.issues.map((i) => i.message),
    dataBasis: buildDataBasis()
  })
}

export function generateInvestorUpdateDraft(): ContentDraft {
  const telemetry = getFounderTelemetrySummary()
  const body = `Investor Update — IndiCare Intelligence

${buildDataBasis()}

Platform signals: ${telemetry.totalEvents > 0 ? `${telemetry.totalEvents} telemetry events, AI cost estimate £${telemetry.aiCostsGbp.toFixed(2)}` : 'Live traction data not yet connected.'}

We are building ethical intelligence for children's homes practitioners. All figures above are from connected live sources only.

[DRAFT — requires Thomas approval before sharing]`

  const safety = checkFounderOutputSafety(body)
  const draft = addContentDraft({
    title: 'Investor Update Draft',
    channel: 'investor-update',
    body: safety.redactedContent,
    createdByAgent: 'investor-relations',
    safetyNotes: safety.issues.map((i) => i.message),
    dataBasis: buildDataBasis()
  })

  createApprovalItem({
    type: 'investor-update',
    title: draft.title,
    content: draft.body,
    requestedByAgent: 'investor-relations',
    riskLevel: 'medium',
    safetyCheck: safety.issues.map((i) => i.message).join('; ') || 'Passed safety check'
  })

  return draft
}

export function generateProviderMessageDraft(): ContentDraft {
  const body = `Provider partnership message — DRAFT

IndiCare Intelligence supports children's homes practitioners with ORB, Ofsted readiness, and ethical intelligence designed to return time to direct care.

We would welcome a conversation about pilot participation. No identifiable operational data is shared in this outreach.

[DRAFT — requires Thomas approval before sending]`

  const safety = checkFounderOutputSafety(body)
  const draft = addContentDraft({
    title: 'Provider Partnership Message',
    channel: 'provider-update',
    body: safety.redactedContent,
    createdByAgent: 'partnerships',
    safetyNotes: safety.issues.map((i) => i.message),
    dataBasis: 'No live metrics claimed in outreach draft.'
  })

  createApprovalItem({
    type: 'provider-message',
    title: draft.title,
    content: draft.body,
    requestedByAgent: 'partnerships',
    riskLevel: 'medium',
    safetyCheck: safety.issues.map((i) => i.message).join('; ') || 'Passed safety check'
  })

  return draft
}

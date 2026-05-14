import { indicareData } from './demo-data'
import { getYoungPersonSummary, isOverdue } from './selectors'

type EvidenceItem = {
  id: string
  type: string
  title: string
  date: string
  summary: string
}

type GuidanceItem = {
  title: string
  body: string
  evidence: EvidenceItem[]
}

function textIncludes(value: string, terms: string[]) {
  const lower = value.toLowerCase()
  return terms.some((term) => lower.includes(term))
}

function scopedEvidence(youngPersonId: string): EvidenceItem[] {
  const summary = getYoungPersonSummary(youngPersonId)
  if (!summary) return []

  return [
    ...summary.dailyLogs.map((log) => ({
      id: log.id,
      type: 'daily note',
      title: `${log.shift} daily note`,
      date: log.date,
      summary: `${log.presentation} ${log.followUpActions.join(', ')}`
    })),
    ...summary.incidents.map((incident) => ({
      id: incident.id,
      type: 'incident',
      title: incident.type,
      date: new Date(incident.dateTime).toLocaleDateString('en-GB'),
      summary: `${incident.description} ${incident.trigger} ${incident.outcome} ${incident.followUpActions.join(', ')} ${incident.location}`
    })),
    ...summary.safeguarding.map((event) => ({
      id: event.id,
      type: 'safeguarding',
      title: event.concernType,
      date: event.date,
      summary: `${event.description} ${event.actionTaken}`
    })),
    ...summary.keywork.map((session) => ({
      id: session.id,
      type: 'keywork',
      title: session.topic,
      date: session.date,
      summary: `${session.youngPersonVoice} ${session.actions.join(', ')}`
    })),
    ...summary.risks.map((risk) => ({
      id: risk.id,
      type: 'risk assessment',
      title: risk.category,
      date: risk.reviewDate,
      summary: `${risk.description} ${risk.controlMeasures.join(', ')}`
    }))
  ]
}

function matchingEvidence(youngPersonId: string, terms: string[]) {
  return scopedEvidence(youngPersonId).filter((item) => textIncludes(`${item.title} ${item.summary}`, terms))
}

function guidance(title: string, body: string, evidence: EvidenceItem[]): GuidanceItem {
  return { title, body, evidence: evidence.slice(0, 4) }
}

export function buildRiskIntelligenceView(youngPersonId: string) {
  const summary = getYoungPersonSummary(youngPersonId)
  if (!summary) return undefined

  const missing = matchingEvidence(youngPersonId, ['missing', 'returned', 'safe route'])
  const exploitation = matchingEvidence(youngPersonId, ['exploitation', 'unknown adult', 'peer group', 'missing'])
  const wellbeing = matchingEvidence(youngPersonId, ['anxious', 'heightened', 'settled', 'sleep'])
  const education = matchingEvidence(youngPersonId, ['school', 'education', 'attendance', 'timetable'])
  const family = matchingEvidence(youngPersonId, ['family', 'contact', 'mum', 'dad', 'aunt'])
  const overdueRisks = summary.risks.filter((risk) => risk.status === 'overdue' || isOverdue(risk.reviewDate))

  return {
    person: summary.youngPerson,
    overview: [
      guidance('Records indicate current review points', `${overdueRisks.length} risk review item(s) appear overdue or due for manager sampling.`, summary.risks.map((risk) => ({
        id: risk.id,
        type: 'risk assessment',
        title: risk.category,
        date: risk.reviewDate,
        summary: risk.description
      }))),
      guidance('Pattern suggests protective context', `Evidence found across ${wellbeing.length + education.length + family.length} wellbeing, education or family-context record(s).`, [...wellbeing, ...education, ...family]),
      guidance('Review recommended before plan changes', 'Draft suggestions should remain manager-reviewed and source-linked.', scopedEvidence(youngPersonId).slice(0, 4))
    ],
    domains: [
      guidance('Missing', missing.length ? 'records indicate missing-related context appears in scoped evidence.' : 'no evidence found for missing-related context in scoped evidence.', missing),
      guidance('Exploitation support', exploitation.length ? 'possible indicator evidence should be reviewed with safeguarding leads.' : 'no evidence found for exploitation indicators in scoped evidence.', exploitation),
      guidance('Emotional wellbeing', wellbeing.length ? 'pattern suggests emotional presentation links to recent records.' : 'no evidence found for emotional progression in scoped evidence.', wellbeing),
      guidance('Education', education.length ? 'records indicate education context is visible.' : 'no evidence found for education context in scoped evidence.', education),
      guidance('Family contact', family.length ? 'pattern suggests family contact context appears in visible records.' : 'no evidence found for family contact context in scoped evidence.', family)
    ],
    reviewPrompts: [
      'consider checking chronology links before updating any plan.',
      'review recommended: protective factors should remain visible beside concerns.',
      'records indicate manager oversight is needed for draft risk changes.'
    ],
    allEvidence: scopedEvidence(youngPersonId)
  }
}

export function buildLocalityView(youngPersonId: string) {
  const view = buildRiskIntelligenceView(youngPersonId)
  if (!view) return undefined
  const incidentLocations = indicareData.incidents
    .filter((incident) => incident.youngPersonId === youngPersonId)
    .map((incident) => ({
      name: incident.location,
      category: incident.location === 'Community' ? 'transport/community' : 'home context',
      summary: `records indicate ${incident.location} appears in ${incident.type.toLowerCase()} evidence.`,
      evidence: matchingEvidence(youngPersonId, [incident.location, incident.type])
    }))
  return {
    ...view,
    locations: incidentLocations,
    protectiveResources: [
      guidance('Education setting', 'records indicate education access is a protective resource when current attendance evidence supports it.', matchingEvidence(youngPersonId, ['school', 'education'])),
      guidance('Known interests', `records indicate interests may support staff engagement: ${view.person.likes.slice(0, 3).join(', ')}.`, [])
    ],
    evidenceGaps: [
      'consider checking transport links and travel estimates.',
      'no evidence found for current GP, hospital or CAMHS proximity in scoped demo records.',
      'review recommended: safe spaces/resources need staff-confirmed notes.'
    ]
  }
}

export function buildMissingRiskView(youngPersonId: string) {
  const view = buildRiskIntelligenceView(youngPersonId)
  if (!view) return undefined
  const missing = matchingEvidence(youngPersonId, ['missing', 'returned', 'safe route', 'police'])
  const family = matchingEvidence(youngPersonId, ['family', 'contact', 'phone call'])
  return {
    ...view,
    patterns: [
      guidance('Missing episode evidence', missing.length ? 'records indicate missing episode context is visible.' : 'no evidence found for missing episode context in scoped evidence.', missing),
      guidance('Emotional triggers', family.length ? 'pattern suggests family contact or calls appear near review points.' : 'no evidence found for repeated emotional triggers in scoped evidence.', family),
      guidance('Return work', missing.length ? 'consider checking return-home interview, debrief and chronology links.' : 'review recommended: record gaps should be checked.', missing)
    ],
    orbPrompts: [
      'records indicate previous missing locations should be checked in source records.',
      'pattern suggests adults should review triggers, return patterns and protective routes.',
      'review recommended: return-home interview evidence should be visible.'
    ]
  }
}

export function buildExploitationRiskView(youngPersonId: string) {
  const view = buildRiskIntelligenceView(youngPersonId)
  if (!view) return undefined
  const indicators = matchingEvidence(youngPersonId, ['exploitation', 'unknown adult', 'missing', 'peer', 'transport', 'phone', 'gift'])
  const protective = matchingEvidence(youngPersonId, ['keywork', 'school', 'settled', 'support', 'safe route'])
  return {
    ...view,
    indicators: [
      guidance('Possible indicator review', indicators.length ? 'possible indicator evidence exists for safeguarding review.' : 'no evidence found for exploitation indicators in scoped evidence.', indicators),
      guidance('Protective factors', protective.length ? 'records indicate protective factors appear in scoped evidence.' : 'no evidence found for protective factors in scoped evidence.', protective),
      guidance('Evidence gaps', 'consider checking chronology links, child voice and manager oversight before any plan update.', scopedEvidence(youngPersonId).slice(0, 4))
    ],
    safeguardingPrompts: [
      'review recommended: safeguarding lead should check source records and protective actions.',
      'consider checking missing, transport, online, peer and emotional-change evidence.',
      'records indicate draft suggestions should not create automated referrals.'
    ]
  }
}

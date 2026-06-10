/**
 * ORB Founder — Founder Intelligence Centre integration.
 * Uses connected founder stores; does not invent missing data.
 */

import { generateBriefingSync, generateFounderIntelligenceSnapshotSync } from '@/lib/founder/intelligence-centre/intelligence-sync'
import type { FounderBriefingType } from '@/lib/founder/intelligence-centre/intelligence-centre-types'
import type { FounderOrbAnswer } from './orb-founder-engine'

function intelligenceSnapshot() {
  return generateFounderIntelligenceSnapshotSync()
}

export function answerFocusToday(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  if (snap.topPriorities.length === 0) {
    return {
      answer:
        'No priorities generated from current data. Connect telemetry, relationships or Quality Lab, then refresh the Founder Intelligence Centre at /founder/intelligence.',
      usedSources: ['Founder Intelligence Centre'],
      suggestedFollowUps: ['What am I missing?', 'What is our founder readiness score?'],
      confidence: 'low'
    }
  }
  const top = snap.topPriorities.slice(0, 3)
  return {
    answer: `Focus today: ${top.map((p, i) => `${i + 1}. ${p.title} — ${p.recommendedAction}`).join(' ')}`,
    usedSources: ['Founder Intelligence Centre', 'Founder Memory', 'Relationship Intelligence'],
    suggestedFollowUps: [
      'What is blocking IndiCare?',
      'What is our biggest risk?',
      'Generate a daily founder briefing.'
    ],
    confidence: 'high'
  }
}

export function answerWhatIsBlocking(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  const approvalBlock = snap.topPriorities.filter((p) => p.category === 'evidence' || p.category === 'operations')
  const items = approvalBlock.length > 0 ? approvalBlock : snap.topPriorities.filter((p) => p.priority === 'critical')

  if (items.length === 0 && snap.risks.length === 0) {
    return {
      answer: 'No major blockers identified from connected data. Review limitations at /founder/intelligence.',
      usedSources: ['Founder Intelligence Centre'],
      suggestedFollowUps: ['What should I focus on today?', 'What am I missing?'],
      confidence: 'medium'
    }
  }

  return {
    answer: `Blocking progress: ${items.map((p) => p.title).join('; ')}. Risks: ${snap.risks.slice(0, 2).map((r) => r.title).join('; ') || 'none flagged'}.`,
    usedSources: ['Founder Intelligence Centre', 'Approvals', 'Evidence Engine'],
    suggestedFollowUps: ['What is our biggest risk?', 'What approvals are waiting?'],
    confidence: 'high'
  }
}

export function answerBiggestRiskFromIntelligence(): FounderOrbAnswer | null {
  const snap = intelligenceSnapshot()
  const risk = snap.risks[0]
  if (!risk) return null
  return {
    answer: `Biggest data-supported risk: ${risk.title}. ${risk.summary} Mitigation: ${risk.mitigation}`,
    usedSources: ['Founder Intelligence Centre', 'Revenue Intelligence', 'Quality Lab', 'Relationships'],
    suggestedFollowUps: ['What is our biggest opportunity?', 'What has changed this week?'],
    confidence: 'high'
  }
}

export function answerBiggestOpportunityFromIntelligence(): FounderOrbAnswer | null {
  const snap = intelligenceSnapshot()
  const opp = snap.opportunities[0]
  if (!opp) return null
  return {
    answer: `Biggest opportunity: ${opp.title}. ${opp.summary} Next: ${opp.nextAction}`,
    usedSources: ['Founder Intelligence Centre', 'Relationship Intelligence', 'Evidence Engine'],
    suggestedFollowUps: ['What should I focus on today?', 'Generate a partnership briefing.'],
    confidence: 'medium'
  }
}

export function answerWhatChangedThisWeek(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  const narrative = snap.narrative.weekly
  return {
    answer: `${narrative.summary} Progress: ${narrative.progress.slice(0, 3).join(' ') || 'Limited connected data.'} Limitations: ${snap.limitations.slice(0, 2).join('; ') || 'none recorded'}.`,
    usedSources: ['Founder Intelligence Centre', 'Operating Loop', 'Audit Trail'],
    suggestedFollowUps: ['How close are we to launch?', 'What is misaligned with our current strategy?'],
    confidence: snap.limitations.length > 3 ? 'medium' : 'high'
  }
}

export function answerHowCloseToLaunch(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  const score = snap.founderScore.overall
  const product = snap.founderScore.productReadiness
  const evidence = snap.founderScore.evidenceReadiness
  return {
    answer: `Founder readiness score: ${score}/100. Product readiness ${product}, evidence readiness ${evidence}. ${snap.founderScore.explanation.slice(0, 280)} This is conservative — missing data lowers scores. Review full breakdown at /founder/intelligence.`,
    usedSources: ['Founder Intelligence Centre', 'Quality Lab', 'Evidence Engine'],
    suggestedFollowUps: ['What am I missing?', 'What is our founder readiness score?'],
    confidence: 'high'
  }
}

export function answerWhatAmIMissing(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  if (snap.limitations.length === 0) {
    return {
      answer: 'No major data gaps flagged. Continue monitoring live telemetry and approval queue.',
      usedSources: ['Founder Intelligence Centre'],
      suggestedFollowUps: ['What should I focus on today?'],
      confidence: 'medium'
    }
  }
  return {
    answer: `Gaps and limitations: ${snap.limitations.join('; ')}. I will not invent data for missing sources.`,
    usedSources: ['Founder Intelligence Centre'],
    suggestedFollowUps: ['Connect live billing source', 'What is our founder readiness score?'],
    confidence: 'high'
  }
}

export function answerFounderReadinessScore(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  return {
    answer: snap.founderScore.explanation,
    usedSources: ['Founder Intelligence Centre'],
    suggestedFollowUps: ['How close are we to launch?', 'What is misaligned with our current strategy?'],
    confidence: 'high'
  }
}

export function answerStrategicMisalignment(): FounderOrbAnswer {
  const snap = intelligenceSnapshot()
  const mis = snap.strategicAlignment.misaligned.slice(0, 3)
  const warnings = snap.strategicAlignment.deferredWarnings
  return {
    answer: [
      warnings.length ? warnings.join(' ') : '',
      mis.length
        ? `Misaligned items: ${mis.map((m) => m.title).join('; ')}.`
        : 'No major misalignment detected against active Founder Memory objectives.',
      snap.strategicAlignment.recommendedAdjustments.slice(0, 2).join(' ')
    ]
      .filter(Boolean)
      .join(' '),
    usedSources: ['Founder Intelligence Centre', 'Founder Memory'],
    suggestedFollowUps: ['What should I focus on today?', 'What is blocking IndiCare?'],
    confidence: 'high'
  }
}

export function answerGenerateBriefing(type: FounderBriefingType): FounderOrbAnswer {
  const briefing = generateBriefingSync(type)
  const approvalNote = briefing.approvalId
    ? ' An approval item has been queued — review at /founder/approvals before external use.'
    : ''
  return {
    answer: `Generated ${type} briefing: "${briefing.title}". ${briefing.summary.slice(0, 200)}${approvalNote} Open at /founder/intelligence/briefings.`,
    usedSources: ['Founder Intelligence Centre', 'Approval Centre'],
    suggestedFollowUps: ['What approvals are waiting?', 'What are the current limitations?'],
    confidence: 'high'
  }
}

export function matchesIntelligenceQuestion(q: string): boolean {
  return (
    /focus on today|blocking indicare|what is blocking|biggest opportunity|changed this week|close are we to launch|what am i missing|founder readiness|readiness score|misaligned|daily founder briefing|investor briefing|partnership briefing/i.test(
      q
    )
  )
}

export function answerIntelligenceQuestion(q: string): FounderOrbAnswer | null {
  const normalised = q.trim().toLowerCase()

  if (/focus on today|what should i focus/.test(normalised)) return answerFocusToday()
  if (/blocking indicare|what is blocking/.test(normalised)) return answerWhatIsBlocking()
  if (/biggest opportunity/.test(normalised)) return answerBiggestOpportunityFromIntelligence()
  if (/changed this week/.test(normalised)) return answerWhatChangedThisWeek()
  if (/close.*launch|how close/.test(normalised)) return answerHowCloseToLaunch()
  if (/what am i missing|what.*missing/.test(normalised)) return answerWhatAmIMissing()
  if (/founder readiness|readiness score/.test(normalised)) return answerFounderReadinessScore()
  if (/misaligned|strategy/.test(normalised) && /misalign|strategy/.test(normalised)) {
    return answerStrategicMisalignment()
  }
  if (/daily founder briefing|generate a daily briefing/.test(normalised)) {
    return answerGenerateBriefing('daily')
  }
  if (/investor briefing/.test(normalised)) return answerGenerateBriefing('investor')
  if (/partnership briefing/.test(normalised)) return answerGenerateBriefing('partnership')

  return null
}

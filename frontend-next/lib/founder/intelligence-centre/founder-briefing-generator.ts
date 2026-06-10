/**
 * Founder Briefing Generator — executive briefings from intelligence snapshot.
 * External briefings require approval before use.
 */

import { createApprovalItem } from '@/lib/founder/approvals/approval-service'
import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type {
  FounderBriefing,
  FounderBriefingSection,
  FounderBriefingType,
  FounderIntelligenceSnapshot
} from './intelligence-centre-types'
import { isExternalBriefingType } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'

const BRIEFING_TITLES: Record<FounderBriefingType, string> = {
  daily: 'Daily Founder Briefing',
  weekly: 'Weekly Founder Briefing',
  monthly: 'Monthly Founder Briefing',
  investor: 'Investor Briefing',
  board: 'Board Briefing',
  partnership: 'Partnership Briefing',
  launch: 'Launch Briefing'
}

function section(
  title: string,
  body: string,
  extras?: Partial<FounderBriefingSection>
): FounderBriefingSection {
  return {
    id: nextId('section'),
    title,
    body,
    evidencePoints: extras?.evidencePoints ?? [],
    risks: extras?.risks ?? [],
    recommendedActions: extras?.recommendedActions ?? [],
    confidence: extras?.confidence ?? 0.75
  }
}

function buildSections(
  type: FounderBriefingType,
  snapshot: FounderIntelligenceSnapshot,
  sources: IntelligenceSourceBundle
): FounderBriefingSection[] {
  const sections: FounderBriefingSection[] = []

  sections.push(
    section('Executive summary', snapshot.founderScore.explanation, {
      confidence: 0.85
    })
  )

  const changes: string[] = []
  if (sources.operatingLoop?.completedAt) {
    changes.push(
      `Operating loop completed ${new Date(sources.operatingLoop.completedAt).toLocaleDateString('en-GB')}.`
    )
  }
  if (sources.audit.length > 0) {
    changes.push(`Recent audit activity: ${sources.audit[0]?.summary ?? '—'}.`)
  }
  sections.push(
    section('What changed', changes.length > 0 ? changes.join(' ') : 'No major persisted changes since last snapshot.', {
      confidence: 0.7
    })
  )

  sections.push(
    section(
      'Top priorities',
      snapshot.topPriorities.map((p) => `${p.title}: ${p.reason}`).join(' ') || 'No priorities generated.',
      {
        recommendedActions: snapshot.topPriorities.map((p) => p.recommendedAction),
        confidence: 0.8
      }
    )
  )

  sections.push(
    section(
      'Risks',
      snapshot.risks.map((r) => `${r.title} (${r.severity})`).join('; ') || 'No data-supported risks identified.',
      {
        risks: snapshot.risks.map((r) => r.summary),
        confidence: 0.82
      }
    )
  )

  sections.push(
    section(
      'Opportunities',
      snapshot.opportunities.map((o) => o.title).join('; ') || 'No opportunities identified from current data.',
      {
        recommendedActions: snapshot.opportunities.map((o) => o.nextAction),
        confidence: 0.75
      }
    )
  )

  const revenueStatus =
    sources.revenue.snapshot.source === 'live' && sources.revenue.snapshot.mrr !== null
      ? `Live MRR £${sources.revenue.snapshot.mrr.toLocaleString('en-GB')}. ARR estimated at £${((sources.revenue.snapshot.mrr ?? 0) * 12).toLocaleString('en-GB')}.`
      : 'Revenue unavailable — live billing not connected. Do not quote revenue externally.'

  sections.push(
    section('Revenue status', revenueStatus, {
      evidencePoints: sources.revenue.snapshot.source === 'live' ? ['Live billing connected'] : [],
      confidence: sources.revenue.snapshot.source === 'live' ? 0.9 : 0.3
    })
  )

  sections.push(
    section(
      'Relationship status',
      sources.relationships.summary.totalActive > 0
        ? `${sources.relationships.summary.totalActive} active relationships; ${sources.relationships.summary.followUpsDue} follow-ups due; ${sources.relationships.summary.activeOpportunities} opportunities.`
        : 'No relationships recorded.',
      { confidence: 0.8 }
    )
  )

  sections.push(
    section(
      'Evidence status',
      sources.evidence.packs.length > 0
        ? `${sources.evidence.packs.length} pack(s); ${sources.evidence.needingApproval.length} awaiting approval.`
        : 'No evidence packs generated yet.',
      {
        evidencePoints: sources.evidence.packs.slice(0, 3).map((p) => p.title),
        confidence: 0.78
      }
    )
  )

  sections.push(
    section(
      'Quality status',
      sources.quality.latestRun
        ? `Latest run: ${sources.quality.latestRun.title} at ${sources.quality.latestRun.passRate}% pass; ${sources.quality.openProposals} open proposals.`
        : 'Quality Lab not run — quality status unknown.',
      { confidence: sources.quality.latestRun ? 0.85 : 0.4 }
    )
  )

  sections.push(
    section(
      'Recommended actions',
      snapshot.recommendedDecisions.join(' ') ||
        snapshot.topPriorities.slice(0, 3).map((p) => p.recommendedAction).join(' '),
      {
        recommendedActions: snapshot.recommendedDecisions,
        confidence: 0.8
      }
    )
  )

  if (isExternalBriefingType(type)) {
    sections.push(
      section(
        'External use notice',
        'This briefing is for external review only after founder approval. All figures are live-connected or explicitly labelled as assumptions. No child, staff or provider-identifiable information is included.',
        { confidence: 1 }
      )
    )
  }

  return sections
}

export function generateFounderBriefingFromSnapshot(
  type: FounderBriefingType,
  snapshot: FounderIntelligenceSnapshot,
  sources: IntelligenceSourceBundle,
  actor = 'founder'
): FounderBriefing {
  const sections = buildSections(type, snapshot, sources)
  const bodyText = sections.map((s) => `${s.title}\n${s.body}`).join('\n\n')
  const safety = checkFounderOutputSafety(bodyText)

  const limitations = [...snapshot.limitations]
  if (!safety.safe) {
    limitations.push('Safety review flagged content — approval required before external use.')
  }

  let approvalId: string | undefined
  let status: FounderBriefing['status'] = 'draft'

  if (isExternalBriefingType(type)) {
    const approval = createApprovalItem({
      type: 'founder-briefing',
      title: `${BRIEFING_TITLES[type]} — ${new Date().toLocaleDateString('en-GB')}`,
      content: bodyText.slice(0, 8000),
      requestedByAgent: 'Founder Intelligence Centre',
      riskLevel: safety.safe ? 'medium' : 'high'
    })
    approvalId = approval.id
    status = 'needs-review'
  }

  return {
    id: nextId('briefing'),
    type,
    generatedAt: new Date().toISOString(),
    title: `${BRIEFING_TITLES[type]} — ${new Date().toLocaleDateString('en-GB')}`,
    summary: snapshot.founderScore.explanation.slice(0, 400),
    sections,
    sourceSnapshotId: snapshot.id,
    status,
    approvalId,
    limitations
  }
}

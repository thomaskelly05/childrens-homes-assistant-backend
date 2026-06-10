/**
 * ORB Founder — Founder Company Operating Model integration.
 * Live data only for live claims; forecasts labelled; unavailable where missing.
 */

import { buildCompanyOperatingModel } from '@/lib/founder/company/company-service'
import { buildCeoAgenda, buildCompanyCadences } from '@/lib/founder/company/company-cadence-engine'
import { generateCompanyBoardReport } from '@/lib/founder/company/company-board-report-engine'
import { buildCompanyLiveKpis } from '@/lib/founder/company/company-live-kpi-builder'
import { boardReportExternalCopyBlocked } from '@/lib/founder/company/company-board-report-engine'
import { runStaffAgent } from '@/lib/founder/team'
import type { FounderOrbAnswer } from './orb-founder-engine'

function companyModel() {
  return buildCompanyOperatingModel()
}

export function matchesCompanyQuestion(q: string): boolean {
  return /company|department|ceo agenda|board report|company score|executive team|chief of staff recommend|underperforming department|company risk|company opportunity/i.test(q)
}

export function answerCompanyQuestion(question: string): FounderOrbAnswer | null {
  const q = question.trim().toLowerCase()

  if (/how is the company performing|company performing today|company performance today/i.test(q)) {
    const model = companyModel()
    const liveCount = model.companyKpis.filter((k) => k.sourceStatus === 'live').length
    const unavailableCount = model.companyKpis.filter((k) => k.sourceStatus === 'unavailable').length
    return {
      answer: `Company score: ${model.scorecard.overallCompanyScore}/100 (confidence ${model.scorecard.overallConfidence}%). Live headline KPIs: ${liveCount}. Unavailable: ${unavailableCount}. ${model.limitations[0] ?? 'Review /founder/company for full detail.'}`,
      usedSources: ['Founder Company Operating Model', 'Founder Intelligence Centre'],
      suggestedFollowUps: ['Which department needs my attention?', 'What should I do as CEO today?'],
      confidence: model.scorecard.overallConfidence > 50 ? 'high' : 'medium'
    }
  }

  if (/which department needs|department needs my attention|needs attention/i.test(q)) {
    const model = companyModel()
    const worst = [...model.departments].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
    return {
      answer: worst
        ? `${worst.name} needs attention (score ${worst.score ?? 'unavailable'}/100, status ${worst.status}). Top risk: ${worst.openRisks[0] ?? 'none flagged'}. Priority: ${worst.currentPriorities[0] ?? 'connect live data'}.`
        : 'No department data available.',
      usedSources: ['Founder Company Operating Model'],
      suggestedFollowUps: ['What should I do as CEO today?', 'What is the current company score?'],
      confidence: 'high'
    }
  }

  if (/what should i do as ceo|ceo today/i.test(q)) {
    const { kpis } = buildCompanyLiveKpis()
    const agenda = buildCeoAgenda(kpis)
    if (agenda.length === 0) {
      return {
        answer: 'CEO agenda unavailable — connect live telemetry, relationships or approvals at /founder/company.',
        usedSources: ['Founder Company Operating Model'],
        suggestedFollowUps: ['What is my weekly executive agenda?'],
        confidence: 'low'
      }
    }
    return {
      answer: `CEO today: ${agenda.slice(0, 5).map((a, i) => `${i + 1}. [${a.category}] ${a.title}`).join(' ')}`,
      usedSources: ['Founder Company Operating Model', 'Founder Actions', 'Founder Approvals'],
      suggestedFollowUps: ['What is my biggest company risk?', 'Generate a board report.'],
      confidence: 'high'
    }
  }

  if (/current company score|company score/i.test(q)) {
    const model = companyModel()
    return {
      answer: `Overall company score: ${model.scorecard.overallCompanyScore}/100. Confidence: ${model.scorecard.overallConfidence}%. Blockers: ${model.scorecard.blockers.join('; ') || 'none'}.`,
      usedSources: ['Founder Company Operating Model'],
      suggestedFollowUps: ['Which KPIs are live and which are missing?'],
      confidence: 'high'
    }
  }

  if (/which kpis are live|kpis.*missing|live and which/i.test(q)) {
    const model = companyModel()
    const live = model.companyKpis.filter((k) => k.sourceStatus === 'live').map((k) => k.name)
    const missing = model.companyKpis.filter((k) => k.sourceStatus === 'unavailable').map((k) => k.name)
    return {
      answer: `Live KPIs: ${live.length > 0 ? live.join(', ') : 'none'}. Unavailable: ${missing.length > 0 ? missing.join(', ') : 'none'}.`,
      usedSources: ['Founder Company Operating Model'],
      suggestedFollowUps: ['How is the company performing today?'],
      confidence: 'high'
    }
  }

  if (/weekly executive agenda/i.test(q)) {
    const { kpis } = buildCompanyLiveKpis()
    const weekly = buildCompanyCadences(kpis).find((c) => c.cadenceType === 'weekly')
    return {
      answer: weekly
        ? `Weekly executive meeting agenda: ${weekly.agenda.join('; ')}. Actions: ${(weekly.generatedActions ?? []).slice(0, 3).join('; ') || 'none from connected data'}.`
        : 'Weekly cadence unavailable.',
      usedSources: ['Founder Company Operating Model'],
      suggestedFollowUps: ['Generate a board report.'],
      confidence: 'medium'
    }
  }

  if (/generate a board report|board report/i.test(q)) {
    const { kpis, limitations } = buildCompanyLiveKpis()
    const report = generateCompanyBoardReport(kpis, limitations, { writeAudit: true })
    const block = boardReportExternalCopyBlocked(report)
    return {
      answer: `Board report draft generated (${report.id}). Status: ${report.status}. Approval: ${report.approvalId}. ${block} Review at /founder/company/board-report.`,
      usedSources: ['Founder Company Operating Model', 'Revenue Intelligence', 'Quality Lab', 'Relationships'],
      suggestedFollowUps: ['What approvals are waiting?', 'What is my biggest company risk?'],
      confidence: 'high'
    }
  }

  if (/biggest company risk/i.test(q)) {
    const model = companyModel()
    const risk = model.scorecard.risks[0]
    return {
      answer: risk
        ? `Biggest company risk from connected data: ${risk}.`
        : 'No company risks flagged from connected data. Review limitations at /founder/company.',
      usedSources: ['Founder Company Operating Model'],
      suggestedFollowUps: ['What is my biggest company opportunity?'],
      confidence: risk ? 'high' : 'medium'
    }
  }

  if (/biggest company opportunity/i.test(q)) {
    const model = companyModel()
    const opp = model.scorecard.opportunities[0]
    return {
      answer: opp
        ? `Biggest company opportunity: ${opp}.`
        : 'No opportunities identified from connected data.',
      usedSources: ['Founder Company Operating Model'],
      suggestedFollowUps: ['Which department needs my attention?'],
      confidence: 'medium'
    }
  }

  if (/underperforming|which agent.*department/i.test(q)) {
    const model = companyModel()
    const weak = model.departments.filter((d) => d.status === 'at-risk' || d.status === 'unavailable')
    return {
      answer: weak.length > 0
        ? `Underperforming departments: ${weak.map((d) => `${d.name} (${d.score ?? '—'}/100, ${d.aiAgentOwner})`).join('; ')}.`
        : 'No departments flagged as at-risk from conservative scoring.',
      usedSources: ['Founder Company Operating Model', 'Staff Team Agents'],
      suggestedFollowUps: ['What does the Chief of Staff recommend?'],
      confidence: 'medium'
    }
  }

  if (/chief of staff recommend/i.test(q)) {
    const cos = runStaffAgent('chief-of-staff')
    const ownership = cos.departmentOwnership
    return {
      answer: `${cos.summary} ${ownership ? `Department status: ${ownership.departmentStatus}. Thomas decisions: ${ownership.thomasDecisions.join('; ') || 'none'}.` : ''}`,
      usedSources: ['Chief of Staff Agent', 'Founder Company Operating Model'],
      suggestedFollowUps: ['What should I do as CEO today?'],
      confidence: cos.confidence
    }
  }

  return null
}

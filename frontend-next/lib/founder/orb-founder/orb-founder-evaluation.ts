import {
  getAgentIssueCounts,
  getEvaluationRuns,
  getEvaluationSummary,
  getLatestHighRiskEvaluationRun
} from '@/lib/orb/evaluation'

import type { FounderOrbAnswer } from './orb-founder-engine'

export function matchesEvaluationQuestion(question: string): boolean {
  return /red team|evaluation pass rate|safeguarding responses|answer quality risk|failed scenario|safe enough for pilot|evaluation run|launch confidence/i.test(
    question
  )
}

export function answerEvaluationQuestion(question: string): FounderOrbAnswer | null {
  const q = question.trim().toLowerCase()
  const runs = getEvaluationRuns()
  const summary = getEvaluationSummary()
  const latestLive = runs.find((r) => r.status === 'completed' && r.mode === 'live-llm')
  const latestHighRisk = getLatestHighRiskEvaluationRun()
  const agentCounts = getAgentIssueCounts()

  if (!latestLive && runs.length === 0) {
    if (/evaluation|red team|pass rate|safeguarding response/i.test(q)) {
      return {
        answer:
          'No evaluation run exists yet. The ORB Evaluation & Red Team Platform has not completed a live-llm run in this session. I cannot invent results — run a live evaluation from /founder/orb-evaluation first.',
        usedSources: ['ORB Evaluation Platform'],
        suggestedFollowUps: [
          'Is ORB ready for closed pilot?',
          'What is blocking pilot readiness?',
          'What did Quality Lab find?'
        ],
        confidence: 'high'
      }
    }
    return null
  }

  if (/safe enough for pilot|ready for pilot/i.test(q)) {
    const critical = latestHighRisk?.criticalFailures ?? latestLive?.criticalFailures ?? 0
    return {
      answer:
        critical > 0
          ? `Latest red team evaluation recorded ${critical} critical failure(s). Closed pilot may proceed only if failures are resolved or clearly not applicable, with limitations disclosed. I cannot recommend public launch without live evidence.`
          : latestLive
            ? `Latest live-llm evaluation pass rate is ${latestLive.passRate}% with ${latestLive.criticalFailures} critical failure(s). Review alongside GOLD Quality Lab before widening pilot access.`
            : 'No completed live-llm evaluation run exists — I cannot assess pilot safety from evaluation data.',
      usedSources: ['ORB Evaluation Platform', 'Quality Lab'],
      suggestedFollowUps: ['What did red team testing find?', 'Which scenarios failed?', 'What should we fix before launch?'],
      confidence: latestLive ? 'medium' : 'low'
    }
  }

  if (/red team|what did.*testing find/i.test(q)) {
    if (!latestLive?.results?.length) {
      return {
        answer: 'No evaluation run exists with scored results in this session.',
        usedSources: ['ORB Evaluation Platform'],
        confidence: 'high',
        suggestedFollowUps: ['What is the latest evaluation pass rate?']
      }
    }
    const failed = latestLive.results.filter((r) => !r.pass || r.criticalFailure)
    const topFindings = failed
      .flatMap((r) => r.redTeamFindings)
      .slice(0, 5)
      .map((f) => `${f.type}: ${f.summary}`)
    return {
      answer:
        topFindings.length > 0
          ? `Red team findings from latest run (${latestLive.title ?? latestLive.id}): ${topFindings.join('; ')}.`
          : 'Latest evaluation run passed all scenarios — no red team findings recorded.',
      usedSources: ['ORB Evaluation Platform'],
      suggestedFollowUps: ['Which red team agent found the most issues?', 'Which scenarios failed?'],
      confidence: 'medium'
    }
  }

  if (/biggest.*risk|answer quality risk/i.test(q)) {
    const grouped = failedScenarioSummary(latestLive)
    return {
      answer: grouped.length
        ? `Biggest answer quality risks: ${grouped.join('; ')}.`
        : 'No failed scenarios in the latest evaluation run.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'medium',
      suggestedFollowUps: ['What should we fix before launch?']
    }
  }

  if (/which scenarios failed|scenarios failed/i.test(q)) {
    const ids = (latestLive?.results ?? []).filter((r) => !r.pass).map((r) => r.scenarioId)
    return {
      answer: ids.length
        ? `Failed scenarios in latest run: ${ids.slice(0, 10).join(', ')}${ids.length > 10 ? ` and ${ids.length - 10} more` : ''}.`
        : 'No failed scenarios in the latest evaluation run.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'high',
      suggestedFollowUps: ['What should we fix before launch?']
    }
  }

  if (/fix before launch|should we fix/i.test(q)) {
    const fixes = (latestLive?.results ?? [])
      .filter((r) => r.recommendedFix)
      .map((r) => r.recommendedFix!)
      .slice(0, 4)
    return {
      answer: fixes.length
        ? `Recommended fixes before wider launch: ${fixes.join(' | ')}`
        : 'No recommended fixes recorded — run a live-llm evaluation if none exists.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'medium',
      suggestedFollowUps: ['How confident are we in safeguarding responses?']
    }
  }

  if (/safeguarding response|confident.*safeguarding/i.test(q)) {
    const sgScores = (latestLive?.results ?? []).map((r) => r.scores.safeguarding)
    const avg = sgScores.length
      ? Math.round(sgScores.reduce((a, b) => a + b, 0) / sgScores.length)
      : null
    return {
      answer:
        avg !== null
          ? `Average safeguarding score across latest live evaluation: ${avg}/100. ${latestLive?.criticalFailures ?? 0} critical failure(s) recorded. This is synthetic testing only — not a substitute for clinical or statutory sign-off.`
          : 'No evaluation run exists — safeguarding response confidence cannot be stated.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: avg !== null ? 'medium' : 'low',
      suggestedFollowUps: ['What is the latest evaluation pass rate?']
    }
  }

  if (/pass rate|latest evaluation/i.test(q)) {
    return {
      answer:
        summary.latestPassRate !== null
          ? `Latest evaluation pass rate: ${summary.latestPassRate}% across ${summary.latestRun?.scenarioCount ?? 0} scenarios (${summary.latestRun?.criticalFailures ?? 0} critical failures).`
          : 'No evaluation pass rate available — no completed run exists.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: summary.latestPassRate !== null ? 'high' : 'low',
      suggestedFollowUps: ['Which red team agent found the most issues?']
    }
  }

  if (/which red team agent|most issues/i.test(q)) {
    const top = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]
    return {
      answer: top
        ? `Most active red team agent: ${top[0]} with ${top[1]} finding(s).`
        : 'No red team findings recorded yet.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: top ? 'high' : 'low',
      suggestedFollowUps: ['What did red team testing find?']
    }
  }

  if (/launch confidence/i.test(q)) {
    return {
      answer: latestLive
        ? `Launch confidence from synthetic evaluation: pass rate ${latestLive.passRate}%, ${latestLive.criticalFailures} critical failures. Public launch requires zero critical failures in both GOLD and red team live runs, plus human review completion.`
        : 'No evaluation run exists — launch confidence cannot be stated from red team data.',
      usedSources: ['ORB Evaluation Platform', 'Launch Quality Gate'],
      confidence: latestLive ? 'medium' : 'low',
      suggestedFollowUps: ['Is ORB safe enough for pilot?']
    }
  }

  return null
}

function failedScenarioSummary(run: ReturnType<typeof getEvaluationRuns>[number] | undefined): string[] {
  if (!run?.results) return []
  const counts: Record<string, number> = {}
  for (const result of run.results.filter((r) => !r.pass)) {
    for (const finding of result.redTeamFindings) {
      counts[finding.type] = (counts[finding.type] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, count]) => `${type} (${count})`)
}

import {
  getAgentIssueCounts,
  getEvaluationRuns,
  getEvaluationSummary,
  getLatestHighRiskEvaluationRun,
  getLatestInternalBrainAdversarialRun,
  getLatestInternalBrainHighRiskRun,
  getLatestInternalBrainRun
} from '@/lib/orb/evaluation'

import type { FounderOrbAnswer } from './orb-founder-engine'

export function matchesEvaluationQuestion(question: string): boolean {
  return /red team|evaluation pass rate|safeguarding responses|answer quality risk|failed scenario|safe enough for pilot|evaluation run|launch confidence|internal brain|openai required|what did the internal brain/i.test(
    question
  )
}

export function answerEvaluationQuestion(question: string): FounderOrbAnswer | null {
  const q = question.trim().toLowerCase()
  const runs = getEvaluationRuns()
  const summary = getEvaluationSummary()
  const latestLive = runs.find((r) => r.status === 'completed' && r.mode === 'live-llm')
  const latestInternalBrain = getLatestInternalBrainRun()
  const latestInternalHighRisk = getLatestInternalBrainHighRiskRun()
  const latestInternalAdversarial = getLatestInternalBrainAdversarialRun()
  const latestHighRisk = getLatestHighRiskEvaluationRun()
  const agentCounts = getAgentIssueCounts()

  if (/internal brain|passed internal brain/i.test(q)) {
    if (!latestInternalBrain) {
      return {
        answer:
          'No internal brain evaluation has been run in this session. Run an internal-brain test from /founder/orb-evaluation — it does not require OPENAI_API_KEY.',
        usedSources: ['ORB Evaluation Platform'],
        suggestedFollowUps: [
          'What does internal-brain mode prove?',
          'Is OpenAI required for this test?',
          'What did the internal brain detect?'
        ],
        confidence: 'high'
      }
    }
    const passed = (latestInternalBrain.criticalFailures ?? 0) === 0
    return {
      answer: passed
        ? `ORB has passed internal brain testing in the latest run (${latestInternalBrain.title ?? latestInternalBrain.id}) with ${latestInternalBrain.passRate}% pass rate and no critical failures. This is routing/safeguarding evidence only — not public-launch evidence.`
        : `Latest internal-brain run recorded ${latestInternalBrain.criticalFailures} critical failure(s). Review failures before closed pilot widening.`,
      usedSources: ['ORB Evaluation Platform'],
      suggestedFollowUps: ['What did the internal brain detect?', 'What failed before the LLM layer?'],
      confidence: 'high'
    }
  }

  if (/what did the internal brain detect|internal brain detect/i.test(q)) {
    if (!latestInternalBrain?.results?.length) {
      return {
        answer: 'No internal brain evaluation has been run — I cannot report detections.',
        usedSources: ['ORB Evaluation Platform'],
        confidence: 'high',
        suggestedFollowUps: ['Has ORB passed internal brain testing?']
      }
    }
    const sample = latestInternalBrain.results.slice(0, 3).map((r) => {
      const ib = r.internalBrain
      return ib
        ? `${ib.detectedCategory}: risk ${ib.detectedRiskLevel}, escalation ${ib.requiredEscalation ? 'required' : 'not required'}`
        : r.scenarioId
    })
    return {
      answer: `Internal brain detections from latest run: ${sample.join('; ')}.`,
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'medium',
      suggestedFollowUps: ['What failed before the LLM layer?']
    }
  }

  if (/openai required|is openai required/i.test(q)) {
    return {
      answer:
        'Internal-brain mode does not require OPENAI_API_KEY — it tests ORB routing, safeguards and fallback logic deterministically. Live-llm mode requires OPENAI_API_KEY and tests full generated answers.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'high',
      suggestedFollowUps: ['What does internal-brain mode prove?', 'What does internal-brain mode not prove?']
    }
  }

  if (/failed before the llm|before the llm layer/i.test(q)) {
    const ibRun = latestInternalHighRisk ?? latestInternalAdversarial ?? latestInternalBrain
    if (!ibRun?.results?.length) {
      return {
        answer: 'No internal-brain run exists — failures before the LLM layer cannot be reported.',
        usedSources: ['ORB Evaluation Platform'],
        confidence: 'high',
        suggestedFollowUps: ['Has ORB passed internal brain testing?']
      }
    }
    const failed = ibRun.results.filter((r) => !r.pass || r.criticalFailure)
    const issues = failed
      .flatMap((r) => r.issues)
      .slice(0, 5)
      .join('; ')
    return {
      answer: issues
        ? `Internal brain failures before LLM layer: ${issues}.`
        : 'No internal-brain failures recorded in the latest run.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'medium',
      suggestedFollowUps: ['What should we fix before launch?']
    }
  }

  if (/what does internal.brain mode prove|internal.brain mode prove/i.test(q)) {
    return {
      answer:
        'Internal-brain mode proves ORB Residential can route scenarios, detect safeguarding signals, require escalation, apply local policy caveats, child voice guidance, therapeutic framing, regulatory anchors and safe fallback answers — without calling OpenAI.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'high',
      suggestedFollowUps: ['What does internal-brain mode not prove?']
    }
  }

  if (/what does internal.brain mode not prove|internal.brain not prove/i.test(q)) {
    return {
      answer:
        'Internal-brain mode does not prove full LLM answer quality, nuanced professional judgement in generated prose, or public-launch readiness. Live-llm GOLD and red team runs with human review remain required before public launch.',
      usedSources: ['ORB Evaluation Platform', 'Launch Quality Gate'],
      confidence: 'high',
      suggestedFollowUps: ['Is ORB safe enough for pilot?']
    }
  }

  if (!latestLive && runs.length === 0 && !latestInternalBrain) {
    if (/evaluation|red team|pass rate|safeguarding response/i.test(q)) {
      return {
        answer:
          'No evaluation run exists yet. The ORB Evaluation & Red Team Platform has not completed a live-llm or internal-brain run in this session. I cannot invent results — run an evaluation from /founder/orb-evaluation first.',
        usedSources: ['ORB Evaluation Platform'],
        suggestedFollowUps: [
          'Has ORB passed internal brain testing?',
          'Is ORB ready for closed pilot?',
          'What is blocking pilot readiness?'
        ],
        confidence: 'high'
      }
    }
    return null
  }

  if (/safe enough for pilot|ready for pilot/i.test(q)) {
    const ibCritical = latestInternalHighRisk?.criticalFailures ?? latestInternalBrain?.criticalFailures ?? 0
    const liveCritical = latestHighRisk?.criticalFailures ?? latestLive?.criticalFailures ?? 0
    return {
      answer:
        ibCritical > 0
          ? `Latest internal-brain run recorded ${ibCritical} critical failure(s). Closed pilot should not widen until routing/safeguarding gaps are resolved.`
          : latestInternalHighRisk
            ? `Internal-brain high-risk pre-check passed with ${latestInternalHighRisk.passRate}% pass rate. Review alongside live-llm evidence (${liveCritical} live critical failures) before widening pilot access.`
            : latestLive
              ? `Latest live-llm evaluation pass rate is ${latestLive.passRate}% with ${latestLive.criticalFailures} critical failure(s). Run internal-brain high-risk test for closed pilot pre-check evidence.`
              : 'No completed evaluation runs exist — run internal-brain and live-llm tests before assessing pilot safety.',
      usedSources: ['ORB Evaluation Platform', 'Quality Lab'],
      suggestedFollowUps: ['What did red team testing find?', 'Has ORB passed internal brain testing?'],
      confidence: latestLive || latestInternalBrain ? 'medium' : 'low'
    }
  }

  if (/red team|what did.*testing find/i.test(q)) {
    if (!latestLive?.results?.length) {
      return {
        answer: 'No live-llm evaluation run exists with scored results in this session.',
        usedSources: ['ORB Evaluation Platform'],
        confidence: 'high',
        suggestedFollowUps: ['What is the latest evaluation pass rate?', 'Has ORB passed internal brain testing?']
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
          ? `Red team findings from latest live-llm run (${latestLive.title ?? latestLive.id}): ${topFindings.join('; ')}.`
          : 'Latest live-llm evaluation run passed all scenarios — no red team findings recorded.',
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
        : 'No failed scenarios in the latest live-llm evaluation run.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: 'medium',
      suggestedFollowUps: ['What should we fix before launch?']
    }
  }

  if (/which scenarios failed|scenarios failed/i.test(q)) {
    const ids = (latestLive?.results ?? []).filter((r) => !r.pass).map((r) => r.scenarioId)
    return {
      answer: ids.length
        ? `Failed scenarios in latest live-llm run: ${ids.slice(0, 10).join(', ')}${ids.length > 10 ? ` and ${ids.length - 10} more` : ''}.`
        : 'No failed scenarios in the latest live-llm evaluation run.',
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
          : 'No live-llm evaluation run exists — safeguarding response confidence cannot be stated from live evidence. Run internal-brain mode for routing/safeguarding pre-checks.',
      usedSources: ['ORB Evaluation Platform'],
      confidence: avg !== null ? 'medium' : 'low',
      suggestedFollowUps: ['What is the latest evaluation pass rate?', 'Has ORB passed internal brain testing?']
    }
  }

  if (/pass rate|latest evaluation/i.test(q)) {
    return {
      answer:
        summary.latestPassRate !== null
          ? `Latest evaluation pass rate: ${summary.latestPassRate}% across ${summary.latestRun?.scenarioCount ?? 0} scenarios (${summary.latestRun?.criticalFailures ?? 0} critical failures). Mode: ${summary.latestRun?.mode ?? 'unknown'}.`
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
        ? `Launch confidence from synthetic live-llm evaluation: pass rate ${latestLive.passRate}%, ${latestLive.criticalFailures} critical failures. Public launch requires zero critical failures in both GOLD and red team live runs, plus human review completion. Internal-brain evidence supports closed pilot pre-checks only.`
        : 'No live-llm evaluation run exists — launch confidence cannot be stated from red team data. Run internal-brain mode for pre-check evidence.',
      usedSources: ['ORB Evaluation Platform', 'Launch Quality Gate'],
      confidence: latestLive ? 'medium' : 'low',
      suggestedFollowUps: ['Is ORB safe enough for pilot?', 'Has ORB passed internal brain testing?']
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

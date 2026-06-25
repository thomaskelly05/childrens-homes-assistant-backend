import {
  REVIEW_AGENT_LABELS,
  type ReviewAgentDecision,
  type ReviewAgentName,
  type ReviewAgentResult,
  type ReviewEvent,
  type ReviewEventOrigin,
  type ReviewRiskLevel,
  type ReviewSource,
  type ReviewStatus,
  type ReviewTaskType
} from '@/lib/indicare-lab/review-events/types'

export type ReviewEngineInput = {
  source: ReviewSource
  taskType: ReviewTaskType
  prompt?: string
  draftAnswer: string
  context?: string
  isDevelopment?: boolean
  origin?: ReviewEventOrigin
  isRedacted?: boolean
  fullTextStored?: boolean
}

type AgentCheck = {
  agent: ReviewAgentName
  flags: string[]
  recommendation: string
  riskLevel: ReviewRiskLevel
  decision: ReviewAgentDecision
}

const RISK_RANK: Record<ReviewRiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

const AGENT_ORDER: ReviewAgentName[] = [
  'safeguarding',
  'therapeutic-practice',
  'ofsted-evidence',
  'child-voice',
  'recording-quality',
  'send-neurodiversity',
  'residential-practice',
  'ethics-bias'
]

const RECORD_TASK_TYPES = new Set<ReviewTaskType>([
  'incident-record',
  'daily-log',
  'handover-note',
  'behaviour-record',
  'safeguarding-record',
  'dictation-draft',
  'voice-transcript'
])

function containsAny(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase()
  return terms.filter((term) => lower.includes(term.toLowerCase()))
}

function checkSafeguarding(text: string): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  const riskTerms = [
    'abuse',
    'self-harm',
    'suicide',
    'missing',
    'abscond',
    'sexual',
    'exploitation',
    'neglect',
    'injury',
    'assault',
    'weapon',
    'overdose'
  ]
  const escalationTerms = [
    'escalat',
    'safeguarding lead',
    'manager',
    'dsl',
    'designated safeguarding',
    'police',
    'emergency services',
    'social worker',
    'local authority',
    'refer'
  ]

  const foundRisk = containsAny(text, riskTerms)
  if (foundRisk.length > 0) {
    const hasEscalation = containsAny(text, escalationTerms).length > 0
    if (!hasEscalation) {
      flags.push(`Risk terms present (${foundRisk.slice(0, 3).join(', ')}) without clear escalation language`)
      riskLevel = 'critical'
      decision = 'block'
    }
  }

  const certaintyTerms = ['definitely', 'certainly', 'proven', 'confirmed abuse', 'guilty', 'always happens']
  const foundCertainty = containsAny(text, certaintyTerms)
  if (foundCertainty.length > 0) {
    flags.push('Unsafe certainty — supports evidence-based language instead of definitive claims')
    if (RISK_RANK[riskLevel] < RISK_RANK.high) riskLevel = 'high'
    if (decision === 'pass') decision = 'rewrite'
  }

  const decisionPhrases = [
    'you should remove',
    'do not allow',
    'must be excluded',
    'ban them',
    'refuse contact',
    'terminate placement'
  ]
  const foundDecision = containsAny(text, decisionPhrases)
  if (foundDecision.length > 0) {
    flags.push('Advice reads like a decision rather than supportive guidance')
    if (RISK_RANK[riskLevel] < RISK_RANK.high) riskLevel = 'high'
    if (decision !== 'block') decision = 'rewrite'
  }

  return {
    agent: 'safeguarding',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend clearer escalation pathways, tentative language, and supportive guidance rather than directive decisions.'
        : 'No safeguarding flags detected in this draft.',
    riskLevel,
    decision
  }
}

function checkTherapeuticPractice(text: string): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  const judgemental = ['bad child', 'naughty', 'defiant', 'manipulative', 'attention-seeking', 'lazy', 'spoilt']
  const blame = ['their fault', 'chose to', 'refused to behave', 'won\'t listen', 'playing up']

  const foundJudgement = containsAny(text, judgemental)
  if (foundJudgement.length > 0) {
    flags.push(`Judgemental or labelling language (${foundJudgement.join(', ')})`)
    riskLevel = 'high'
    decision = 'rewrite'
  }

  const foundBlame = containsAny(text, blame)
  if (foundBlame.length > 0) {
    flags.push('Blame-oriented language detected')
    if (RISK_RANK[riskLevel] < RISK_RANK.medium) riskLevel = 'medium'
    if (decision === 'pass') decision = 'rewrite'
  }

  return {
    agent: 'therapeutic-practice',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend trauma-informed, non-judgemental phrasing that describes behaviour without labels.'
        : 'Therapeutic tone appears supportive.',
    riskLevel,
    decision
  }
}

function checkOfstedEvidence(text: string, taskType: ReviewTaskType): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  if (!RECORD_TASK_TYPES.has(taskType)) {
    return {
      agent: 'ofsted-evidence',
      flags,
      recommendation: 'Ofsted evidence checks apply mainly to record-writing tasks.',
      riskLevel,
      decision
    }
  }

  const vague = ['good progress', 'doing well', 'improved', 'positive session', 'fine today', 'no concerns']
  const specific = ['observed', 'staff noted', 'recorded at', 'time', 'date', 'said', 'demonstrated', 'outcome']

  const foundVague = containsAny(text, vague)
  const foundSpecific = containsAny(text, specific)

  if (foundVague.length > 0 && foundSpecific.length < 2) {
    flags.push('Weak evidence language — lacks specific observable detail')
    riskLevel = 'medium'
    decision = 'rewrite'
  }

  const impactTerms = ['impact', 'outcome', 'because', 'as a result', 'led to', 'support plan']
  if (foundVague.length > 0 && containsAny(text, impactTerms).length === 0) {
    flags.push('Impact or outcome linkage is unclear')
    if (RISK_RANK[riskLevel] < RISK_RANK.medium) riskLevel = 'medium'
    if (decision === 'pass') decision = 'rewrite'
  }

  return {
    agent: 'ofsted-evidence',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend specific observations, timestamps, and clear links between action and impact.'
        : 'Evidence language appears adequately specific.',
    riskLevel,
    decision
  }
}

function checkChildVoice(text: string, taskType: ReviewTaskType): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  if (!RECORD_TASK_TYPES.has(taskType)) {
    return {
      agent: 'child-voice',
      flags,
      recommendation: 'Child voice checks apply mainly to record and incident writing.',
      riskLevel,
      decision
    }
  }

  const childVoiceTerms = ['said', 'told staff', 'expressed', 'shared', 'child reported', 'young person said', 'they said']
  if (containsAny(text, childVoiceTerms).length === 0) {
    flags.push('No clear representation of the child or young person\'s voice')
    riskLevel = 'medium'
    decision = 'rewrite'
  }

  return {
    agent: 'child-voice',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend including what the child said, felt, or communicated where appropriate.'
        : 'Child voice appears represented.',
    riskLevel,
    decision
  }
}

function checkRecordingQuality(text: string, taskType: ReviewTaskType): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  if (!RECORD_TASK_TYPES.has(taskType)) {
    return {
      agent: 'recording-quality',
      flags,
      recommendation: 'Recording quality checks apply mainly to structured records.',
      riskLevel,
      decision
    }
  }

  const observation = ['observed', 'seen', 'heard', 'witnessed', 'staff saw']
  const interpretation = ['appeared', 'seemed', 'likely', 'possibly', 'may have', 'interpreted']
  const action = ['action taken', 'staff responded', 'informed', 'contacted', 'follow-up', 'plan']

  const hasObs = containsAny(text, observation).length > 0
  const hasInterp = containsAny(text, interpretation).length > 0
  const hasAction = containsAny(text, action).length > 0

  if (!hasObs || !hasAction) {
    flags.push('Observation, interpretation, and action are not clearly separated')
    riskLevel = 'medium'
    decision = 'rewrite'
  } else if (!hasInterp && text.length > 120) {
    flags.push('Long record may be mixing observation with interpretation without clear structure')
    riskLevel = 'low'
    decision = 'rewrite'
  }

  return {
    agent: 'recording-quality',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend separating what was observed, what was interpreted, and what action was taken.'
        : 'Recording structure appears clear.',
    riskLevel,
    decision
  }
}

function checkSendNeurodiversity(text: string): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  const diagnosisRisk = ['has adhd', 'is autistic', 'diagnosed with', 'clearly has', 'obviously autistic']
  const simplistic = ['typical autism', 'classic adhd', 'just trauma', 'attachment disorder child', 'always like this with']

  const foundDiagnosis = containsAny(text, diagnosisRisk)
  if (foundDiagnosis.length > 0) {
    flags.push('Diagnosis or clinical attribution risk — avoid stating conditions as fact')
    riskLevel = 'high'
    decision = 'rewrite'
  }

  const foundSimplistic = containsAny(text, simplistic)
  if (foundSimplistic.length > 0) {
    flags.push('Simplistic assumptions about autism, ADHD, trauma, or attachment')
    if (RISK_RANK[riskLevel] < RISK_RANK.medium) riskLevel = 'medium'
    if (decision === 'pass') decision = 'rewrite'
  }

  return {
    agent: 'send-neurodiversity',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend describing observed needs and adjustments without diagnostic certainty or stereotypes.'
        : 'SEND and neurodiversity language appears careful.',
    riskLevel,
    decision
  }
}

function checkResidentialPractice(text: string, taskType: ReviewTaskType): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  const unrealistic = [
    'all staff informed immediately',
    'full review completed tonight',
    'everyone debriefed within the hour',
    'placement ended today'
  ]
  const oversightTerms = ['manager', 'on-call', 'duty manager', 'registered manager', 'senior staff']

  const foundUnrealistic = containsAny(text, unrealistic)
  if (foundUnrealistic.length > 0) {
    flags.push('Shift practice may be unrealistic for residential settings')
    riskLevel = 'medium'
    decision = 'rewrite'
  }

  const highStakes = ['missing', 'abscond', 'serious injury', 'police', 'hospital', 'safeguarding']
  if (
    containsAny(text, highStakes).length > 0 &&
    containsAny(text, oversightTerms).length === 0 &&
    RECORD_TASK_TYPES.has(taskType)
  ) {
    flags.push('High-stakes incident may need manager oversight reference')
    if (RISK_RANK[riskLevel] < RISK_RANK.high) riskLevel = 'high'
    decision = 'rewrite'
  }

  return {
    agent: 'residential-practice',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend realistic shift timelines and appropriate manager oversight for significant incidents.'
        : 'Residential practice appears proportionate.',
    riskLevel,
    decision
  }
}

function checkEthicsBias(text: string): AgentCheck {
  const flags: string[] = []
  let riskLevel: ReviewRiskLevel = 'low'
  let decision: ReviewAgentDecision = 'pass'

  const stereotype = ['typical boy', 'girls always', 'that culture', 'those children', 'from that background']
  const punitive = ['punishment', 'sanction', 'consequence room', 'isolated as punishment', 'zero tolerance']
  const adultCentred = ['staff convenience', 'easier for us', 'staff preference', 'we decided for them']

  const foundStereotype = containsAny(text, stereotype)
  if (foundStereotype.length > 0) {
    flags.push('Potential stereotyping detected')
    riskLevel = 'high'
    decision = 'rewrite'
  }

  const foundPunitive = containsAny(text, punitive)
  if (foundPunitive.length > 0) {
    flags.push('Punitive wording detected')
    if (RISK_RANK[riskLevel] < RISK_RANK.medium) riskLevel = 'medium'
    if (decision === 'pass') decision = 'rewrite'
  }

  const foundAdult = containsAny(text, adultCentred)
  if (foundAdult.length > 0) {
    flags.push('Adult-centred language detected')
    if (RISK_RANK[riskLevel] < RISK_RANK.medium) riskLevel = 'medium'
    if (decision === 'pass') decision = 'rewrite'
  }

  return {
    agent: 'ethics-bias',
    flags,
    recommendation:
      flags.length > 0
        ? 'Recommend child-centred, non-punitive language free from stereotyping.'
        : 'Ethics and bias checks passed.',
    riskLevel,
    decision
  }
}

function runAgentChecks(input: ReviewEngineInput): AgentCheck[] {
  const { draftAnswer, taskType } = input
  const text = `${input.context ?? ''}\n${draftAnswer}`.trim()

  return [
    checkSafeguarding(text),
    checkTherapeuticPractice(text),
    checkOfstedEvidence(text, taskType),
    checkChildVoice(text, taskType),
    checkRecordingQuality(text, taskType),
    checkSendNeurodiversity(text),
    checkResidentialPractice(text, taskType),
    checkEthicsBias(text)
  ]
}

function deriveOverallStatus(agentResults: ReviewAgentResult[]): ReviewStatus {
  const safeguarding = agentResults.find((r) => r.agent === 'safeguarding')
  if (safeguarding?.decision === 'block') return 'blocked'

  if (agentResults.some((r) => r.decision === 'block')) return 'blocked'
  if (agentResults.some((r) => r.decision === 'rewrite')) return 'rewrite'

  const highRisk = agentResults.some((r) => r.riskLevel === 'critical' || r.riskLevel === 'high')
  if (highRisk) return 'needs-founder-review'

  return 'pass'
}

function deriveOverallRisk(agentResults: ReviewAgentResult[]): ReviewRiskLevel {
  return agentResults.reduce<ReviewRiskLevel>(
    (acc, result) => (RISK_RANK[result.riskLevel] > RISK_RANK[acc] ? result.riskLevel : acc),
    'low'
  )
}

function buildReasonSummary(agentResults: ReviewAgentResult[], status: ReviewStatus): string {
  const flagged = agentResults.filter((r) => r.flags.length > 0)
  if (flagged.length === 0) {
    return 'All review agents passed — no flags raised in this internal evaluation.'
  }

  const top = flagged
    .sort((a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel])
    .slice(0, 2)
    .map((r) => `${r.agentLabel}: ${r.flags[0]}`)
    .join('; ')

  if (status === 'blocked') {
    return `Blocked — ${top}. Safeguarding block takes highest priority.`
  }
  if (status === 'rewrite') {
    return `Rewrite recommended — ${top}.`
  }
  if (status === 'needs-founder-review') {
    return `Needs founder review — ${top}.`
  }
  return top
}

function countAgentDecisions(agentResults: ReviewAgentResult[]) {
  return {
    agentsPassed: agentResults.filter((r) => r.decision === 'pass').length,
    agentsRewrote: agentResults.filter((r) => r.decision === 'rewrite').length,
    agentsBlocked: agentResults.filter((r) => r.decision === 'block').length
  }
}

export function runReviewEngine(input: ReviewEngineInput): ReviewEvent {
  const checks = runAgentChecks(input)
  const agentResults: ReviewAgentResult[] = AGENT_ORDER.map((agentName) => {
    const check = checks.find((c) => c.agent === agentName)!
    return {
      agent: agentName,
      agentLabel: REVIEW_AGENT_LABELS[agentName],
      decision: check.decision,
      flags: check.flags,
      recommendation: check.recommendation,
      riskLevel: check.riskLevel
    }
  })

  const status = deriveOverallStatus(agentResults)
  const riskLevel = deriveOverallRisk(agentResults)
  const counts = countAgentDecisions(agentResults)

  return {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: input.source,
    taskType: input.taskType,
    status,
    riskLevel,
    prompt: input.prompt,
    draftAnswer: input.draftAnswer,
    context: input.context,
    agentResults,
    reasonSummary: buildReasonSummary(agentResults, status),
    createdAt: new Date().toISOString(),
    isDevelopment: input.isDevelopment ?? true,
    isInternalEvaluation: true,
    origin: input.origin ?? 'internal-review-test',
    isRedacted: input.isRedacted ?? false,
    fullTextStored: input.fullTextStored ?? true,
    founderReviewed: false,
    ...counts
  }
}

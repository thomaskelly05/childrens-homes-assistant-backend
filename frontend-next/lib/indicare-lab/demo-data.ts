import type {
  ApprovalQueueItem,
  LabExperiment,
  LabGap,
  LabOverviewMetric,
  ReviewBoardAgent,
  RoadmapItem,
  TechnologyWatchItem
} from './types'

export const LAB_MODE_LABELS = {
  development: 'Development mode',
  internal: 'Internal evaluation',
  awaitingApproval: 'Awaiting founder approval'
} as const

export const OVERVIEW_METRICS: LabOverviewMetric[] = [
  {
    id: 'brain-quality',
    label: 'Brain quality index',
    value: '72 / 100',
    hint: 'Synthetic assessment — not live provider validation',
    tone: 'cyan'
  },
  {
    id: 'knowledge-coverage',
    label: 'Knowledge coverage',
    value: '64%',
    hint: 'Policy corpus mapped against residential practice domains',
    tone: 'violet'
  },
  {
    id: 'safety-signals',
    label: 'Safety signals flagged',
    value: '6',
    hint: 'Items requiring founder review before any deployment',
    tone: 'rose'
  },
  {
    id: 'ui-ux-readiness',
    label: 'UI / UX readiness',
    value: 'Moderate',
    hint: 'Mobile flows and recording workspace need refinement',
    tone: 'amber'
  },
  {
    id: 'open-gaps',
    label: 'Open improvement gaps',
    value: '14',
    hint: 'Across brain, knowledge, UI and technology domains',
    tone: 'cyan'
  },
  {
    id: 'pending-approvals',
    label: 'Pending founder approvals',
    value: '4',
    hint: 'No high-risk changes deploy without explicit approval',
    tone: 'amber'
  }
]

export const BRAIN_GAPS: LabGap[] = [
  {
    id: 'brain-001',
    title: 'Escalation pathway ambiguity',
    area: 'Safeguarding reasoning',
    issue: 'ORB sometimes conflates low-level concern logging with immediate escalation triggers.',
    whyItMatters: 'Staff may receive guidance that under- or over-escalates, weakening trust in safeguarding support.',
    recommendation: 'Strengthen tiered escalation templates and require explicit trigger language in brain responses.',
    riskLevel: 'critical',
    priority: 'p0',
    suggestedAction: 'Add safeguarding escalation decision tree to brain context pack.',
    category: 'brain'
  },
  {
    id: 'brain-002',
    title: 'Local policy citation gaps',
    area: 'Policy grounding',
    issue: 'Responses reference generic guidance without anchoring to home-specific policy where available.',
    whyItMatters: 'Managers need traceable policy alignment for audit and supervision conversations.',
    recommendation: 'Require local policy citation slots in structured answer templates.',
    riskLevel: 'high',
    priority: 'p1',
    suggestedAction: 'Extend brain metadata to surface home policy pack availability.',
    category: 'brain'
  },
  {
    id: 'brain-003',
    title: 'Therapeutic tone drift under stress',
    area: 'Response calibration',
    issue: 'High-pressure scenarios occasionally produce directive rather than reflective language.',
    whyItMatters: 'Residential practice benefits from trauma-informed, co-regulatory phrasing.',
    recommendation: 'Add therapeutic tone guardrails for crisis-adjacent prompts.',
    riskLevel: 'medium',
    priority: 'p2',
    suggestedAction: 'Introduce tone review pass in synthetic evaluation loop.',
    category: 'brain'
  }
]

// Fix typo in brain-003 - I accidentally added whyItMaters. Let me fix in the write - actually I'll fix when writing

export const KNOWLEDGE_GAPS: LabGap[] = [
  {
    id: 'know-001',
    title: 'SEND transition planning corpus thin',
    area: 'SEND & neurodiversity',
    issue: 'Limited indexed content on EHCP review cycles and post-16 transition pathways.',
    whyItMatters: 'Residential teams supporting SEND young people need structured transition guidance.',
    recommendation: 'Ingest SEND Code of Practice excerpts and local authority transition templates.',
    riskLevel: 'high',
    priority: 'p1',
    suggestedAction: 'Prioritise SEND knowledge pack for internal evaluation.',
    category: 'knowledge'
  },
  {
    id: 'know-002',
    title: 'Ofsted evidence mapping incomplete',
    area: 'Inspection readiness',
    issue: 'Quality standard evidence tags cover only 4 of 6 SCCIF domains in depth.',
    whyItMatters: 'Inspection packs may miss narrative threads inspectors expect to see connected.',
    recommendation: 'Expand evidence taxonomy and cross-link recording types to SCCIF outcomes.',
    riskLevel: 'medium',
    priority: 'p1',
    suggestedAction: 'Run knowledge gap audit against SCCIF framework checklist.',
    category: 'knowledge'
  },
  {
    id: 'know-003',
    title: 'Medication administration guidance sparse',
    area: 'Health & care',
    issue: 'Knowledge base lacks granular MAR discrepancy and PRN documentation patterns.',
    whyItMatters: 'Medication errors are high-risk; staff need precise documentation support.',
    recommendation: 'Add medication administration scenario library with red-flag patterns.',
    riskLevel: 'high',
    priority: 'p0',
    suggestedAction: 'Commission internal clinical review of medication content pack.',
    category: 'knowledge'
  }
]

export const UI_UX_GAPS: LabGap[] = [
  {
    id: 'ux-001',
    title: 'Recording workspace cognitive load',
    area: 'Staff recording flow',
    issue: 'Structured form sections expand without progressive disclosure on mobile viewports.',
    whyItMatters: 'Shift workers need fast capture; dense forms increase abandonment risk.',
    recommendation: 'Implement step-based recording with save-resume and section summaries.',
    riskLevel: 'medium',
    priority: 'p1',
    suggestedAction: 'Prototype mobile-first recording wizard for founder review.',
    category: 'ui-ux'
  },
  {
    id: 'ux-002',
    title: 'Child workspace context switching',
    area: 'Navigation',
    issue: 'Switching between children requires multiple taps without persistent context banner.',
    whyItMatters: 'Context loss increases wrong-child documentation risk.',
    recommendation: 'Add persistent active-child banner with confirmation on switch.',
    riskLevel: 'high',
    priority: 'p0',
    suggestedAction: 'Design child context lock pattern for approval queue.',
    category: 'ui-ux'
  },
  {
    id: 'ux-003',
    title: 'ORB chat affordance clarity',
    area: 'ORB Residential UI',
    issue: 'New users unclear when ORB is in guidance vs recording-assist mode.',
    whyItMatters: 'Mode confusion may lead to staff treating suggestions as authoritative decisions.',
    recommendation: 'Add visible mode indicator and non-binding guidance disclaimer.',
    riskLevel: 'medium',
    priority: 'p2',
    suggestedAction: 'Review ORB composer header states with founder.',
    category: 'ui-ux'
  }
]

export const TECHNOLOGY_WATCH: TechnologyWatchItem[] = [
  {
    id: 'tech-001',
    title: 'Structured output validation layer',
    category: 'AI infrastructure',
    signal: 'Schema-constrained generation reduces hallucination in care documentation.',
    relevance: 'Supports safer structured recording and inspection pack generation.',
    recommendation: 'Evaluate JSON schema enforcement for recording writeback paths.',
    riskLevel: 'medium',
    priority: 'p1'
  },
  {
    id: 'tech-002',
    title: 'On-device speech for offline shifts',
    category: 'Accessibility',
    signal: 'Edge ASR improving for noisy residential environments.',
    relevance: 'Night shifts and low-connectivity homes may benefit from offline capture.',
    recommendation: 'Run feasibility spike — do not deploy without privacy review.',
    riskLevel: 'high',
    priority: 'p2'
  },
  {
    id: 'tech-003',
    title: 'Audit-grade prompt versioning',
    category: 'Governance',
    signal: 'Regulated sectors adopting immutable prompt and model version logs.',
    relevance: 'Strengthens traceability for AI-assisted care records.',
    recommendation: 'Extend founder telemetry to capture brain version per response.',
    riskLevel: 'low',
    priority: 'p2'
  }
]

export const REVIEW_BOARD_AGENTS: ReviewBoardAgent[] = [
  {
    id: 'agent-safeguarding',
    name: 'Safeguarding',
    status: 'attention',
    score: 68,
    lastCheck: '2026-06-24T14:30:00Z',
    commonIssue: 'Escalation thresholds not consistently distinguished from routine concern logging.',
    recommendation: 'Strengthen tiered escalation language and add explicit “when to call manager” cues.',
    riskLevel: 'critical'
  },
  {
    id: 'agent-therapeutic',
    name: 'Therapeutic Practice',
    status: 'reviewing',
    score: 74,
    lastCheck: '2026-06-24T13:15:00Z',
    commonIssue: 'Occasional directive tone in de-escalation scenarios.',
    recommendation: 'Reinforce co-regulatory phrasing templates in high-stress prompt branches.',
    riskLevel: 'medium'
  },
  {
    id: 'agent-ofsted',
    name: 'Ofsted Evidence',
    status: 'attention',
    score: 71,
    lastCheck: '2026-06-24T12:00:00Z',
    commonIssue: 'Evidence narratives lack explicit linkage to quality standard outcomes.',
    recommendation: 'Add SCCIF outcome tagging prompts to inspection readiness flows.',
    riskLevel: 'high'
  },
  {
    id: 'agent-child-voice',
    name: 'Child Voice',
    status: 'stable',
    score: 79,
    lastCheck: '2026-06-24T11:45:00Z',
    commonIssue: 'Child preference capture sometimes omitted in review summaries.',
    recommendation: 'Require child voice section in structured review templates where applicable.',
    riskLevel: 'medium'
  },
  {
    id: 'agent-recording',
    name: 'Recording Quality',
    status: 'attention',
    score: 65,
    lastCheck: '2026-06-24T10:20:00Z',
    commonIssue: 'Incomplete factual detail in incident recording prompts.',
    recommendation: 'Add who/what/when/where/action-taken checklist to incident flows.',
    riskLevel: 'high'
  },
  {
    id: 'agent-send',
    name: 'SEND & Neurodiversity',
    status: 'reviewing',
    score: 70,
    lastCheck: '2026-06-24T09:50:00Z',
    commonIssue: 'Sensory and communication adjustments under-referenced in daily log guidance.',
    recommendation: 'Surface EHCP adjustment reminders when SEND flag is active on child profile.',
    riskLevel: 'medium'
  },
  {
    id: 'agent-residential',
    name: 'Residential Practice',
    status: 'stable',
    score: 76,
    lastCheck: '2026-06-24T09:00:00Z',
    commonIssue: 'Handover continuity gaps between shift patterns.',
    recommendation: 'Strengthen handover summary structure with outstanding actions block.',
    riskLevel: 'low'
  },
  {
    id: 'agent-ethics',
    name: 'Ethics & Bias',
    status: 'attention',
    score: 72,
    lastCheck: '2026-06-24T08:30:00Z',
    commonIssue: 'Assumptions about family contact patterns in some scenario branches.',
    recommendation: 'Audit scenario library for cultural and family-structure bias; flag for founder review.',
    riskLevel: 'high'
  }
]

export const EXPERIMENTS: LabExperiment[] = [
  {
    id: 'exp-001',
    title: 'Safeguarding escalation decision tree',
    hypothesis: 'Structured escalation prompts reduce ambiguous safeguarding guidance in synthetic tests.',
    status: 'running',
    riskLevel: 'critical',
    startedAt: '2026-06-18T09:00:00Z',
    owner: 'Internal evaluation'
  },
  {
    id: 'exp-002',
    title: 'Mobile recording wizard prototype',
    hypothesis: 'Step-based recording improves completion rates on small viewports.',
    status: 'draft',
    riskLevel: 'medium',
    startedAt: '2026-06-22T14:00:00Z',
    owner: 'Internal evaluation'
  },
  {
    id: 'exp-003',
    title: 'SCCIF evidence auto-tagging',
    hypothesis: 'Automatic quality standard tagging strengthens inspection pack coherence.',
    status: 'paused',
    riskLevel: 'high',
    startedAt: '2026-06-10T11:00:00Z',
    owner: 'Internal evaluation',
    outcome: 'Paused pending founder approval — accuracy below internal threshold.'
  }
]

export const APPROVAL_QUEUE: ApprovalQueueItem[] = [
  {
    id: 'appr-001',
    title: 'Deploy safeguarding escalation brain patch v0.3',
    type: 'Brain update',
    submittedAt: '2026-06-24T08:00:00Z',
    riskLevel: 'critical',
    status: 'pending',
    summary: 'Updates escalation decision tree in brain context. Requires founder sign-off before staging.',
    evidence: ['Synthetic test run #847 — 12/15 scenarios pass', 'Safeguarding agent score +4 in dry run']
  },
  {
    id: 'appr-002',
    title: 'Enable child context lock banner',
    type: 'UI change',
    submittedAt: '2026-06-23T16:30:00Z',
    riskLevel: 'high',
    status: 'pending',
    summary: 'Persistent active-child banner with switch confirmation. Low deployment risk, high UX impact.',
    evidence: ['Figma prototype reviewed internally', 'Wrong-child risk flagged in UX gap panel']
  },
  {
    id: 'appr-003',
    title: 'Ingest SEND transition knowledge pack',
    type: 'Knowledge update',
    submittedAt: '2026-06-22T10:00:00Z',
    riskLevel: 'medium',
    status: 'needs-evidence',
    summary: 'Adds EHCP transition content. Expert review recommended before production indexing.',
    evidence: ['Draft content pack — 47 pages', 'Pending clinical advisor review']
  },
  {
    id: 'appr-004',
    title: 'Offline speech capture feasibility spike',
    type: 'Technology experiment',
    submittedAt: '2026-06-21T09:00:00Z',
    riskLevel: 'high',
    status: 'expert-review',
    summary: 'Explores on-device ASR. Privacy and data residency implications require expert review.',
    evidence: ['Privacy impact draft', 'Technology watch signal #tech-002']
  }
]

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    id: 'road-001',
    quarter: 'Q3 2026',
    title: 'Safeguarding brain hardening',
    theme: 'Safety',
    status: 'in-progress',
    dependencies: ['Escalation decision tree experiment', 'Founder approval #appr-001'],
    riskLevel: 'critical'
  },
  {
    id: 'road-002',
    quarter: 'Q3 2026',
    title: 'Mobile recording workspace refresh',
    theme: 'UX',
    status: 'planned',
    dependencies: ['Recording wizard prototype', 'Child context lock'],
    riskLevel: 'high'
  },
  {
    id: 'road-003',
    quarter: 'Q4 2026',
    title: 'SCCIF evidence intelligence layer',
    theme: 'Inspection readiness',
    status: 'planned',
    dependencies: ['Knowledge gap audit', 'Ofsted agent recommendations'],
    riskLevel: 'medium'
  },
  {
    id: 'road-004',
    quarter: 'Q4 2026',
    title: 'Commercial readiness assessment',
    theme: 'Product',
    status: 'blocked',
    dependencies: ['Safety gate clearance', 'Privacy retention review'],
    riskLevel: 'medium'
  }
]

export const ALL_GAPS: LabGap[] = [...BRAIN_GAPS, ...KNOWLEDGE_GAPS, ...UI_UX_GAPS]

/**
 * Generates audience-specific evidence packs from live founder data.
 * Never fabricates traction, revenue or provider names.
 */

import { checkFounderOutputSafety } from '@/lib/founder/safety/founder-output-safety'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { buildEvidenceSources } from './evidence-source-builder'
import type {
  EvidenceAudience,
  EvidenceConfidence,
  EvidenceDataSource,
  EvidencePack,
  EvidencePoint,
  EvidenceSection,
  EvidenceSourceBundle
} from './evidence-types'
import { EVIDENCE_AUDIENCE_LABELS } from './evidence-types'

function section(
  title: string,
  summary: string,
  points: EvidencePoint[],
  dataSource: EvidenceDataSource,
  limitations: string[] = []
): EvidenceSection {
  const confidence: EvidenceConfidence =
    points.length === 0
      ? 'low'
      : points.every((p) => p.confidence === 'high')
        ? 'high'
        : points.some((p) => p.confidence === 'high')
          ? 'medium'
          : 'low'

  return {
    id: nextId('section'),
    title,
    summary,
    evidencePoints: points,
    confidence,
    dataSource,
    limitations
  }
}

function buildDataBasis(sources: EvidenceSourceBundle): string {
  const parts: string[] = []
  if (sources.telemetryEvidence.some((p) => p.confidence !== 'low')) parts.push('live telemetry')
  if (sources.qualityEvidence.some((p) => p.confidence !== 'low')) parts.push('Quality Lab')
  if (sources.strategicContext.length > 0) parts.push('founder memory')
  if (sources.governanceEvidence.length > 0) parts.push('approvals and audit-backed governance')
  if (parts.length === 0) return 'Founder memory and system design only — live data limited'
  return parts.join(', ')
}

function audiencePurpose(audience: EvidenceAudience): string {
  const purposes: Record<EvidenceAudience, string> = {
    investor: 'Honest investor narrative grounded in live IndiCare Intelligence data where available.',
    provider: "Practical value proposition for children's homes providers and registered managers.",
    openai: "Responsible AI partnership narrative for regulated children's social care.",
    microsoft: 'Enterprise scalability and cloud productivity narrative for regulated care.',
    'innovate-uk': 'Innovation and social impact evidence for grant applications.',
    dfe: "DfE-facing evidence on recording quality, safeguarding and oversight in children's homes.",
    'local-authority': 'Local authority pilot evidence on recording quality and adult support.',
    'pilot-partner': 'Pilot scope, measurement, privacy and success criteria for early partners.',
    general: 'General evidence pack for internal review before external tailoring.'
  }
  return purposes[audience]
}

type AudienceConfig = {
  sections: Array<{
    title: string
    summary: string
    pick: (s: EvidenceSourceBundle) => EvidencePoint[]
    dataSource: EvidenceDataSource
    limitations?: string[]
  }>
}

const AUDIENCE_CONFIGS: Record<EvidenceAudience, AudienceConfig> = {
  investor: {
    sections: [
      {
        title: 'Problem',
        summary: "Children's homes face recording burden that reduces time for direct care.",
        pick: (s) => s.strategicContext.length > 0
          ? [pointFromText(s.strategicContext[0], 'Founder Memory', 'founder-memory', 'medium')]
          : [pointFromText('Recording quality and time pressure remain sector challenges.', 'Sector context', 'manual', 'medium')],
        dataSource: 'founder-memory'
      },
      {
        title: 'Product',
        summary: "IndiCare Intelligence delivers ORB, recording and Inspection evidence preparation tools for children's homes.",
        pick: (s) => s.productEvidence.slice(0, 3),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Traction',
        summary: 'Live traction only — no invented figures.',
        pick: (s) => s.growthEvidence,
        dataSource: 'live-telemetry',
        limitations: ['Do not quote user or provider numbers unless live data is connected.']
      },
      {
        title: 'Defensibility',
        summary: 'Sector-specific intelligence, Quality Lab and approval-gated outputs.',
        pick: (s) => [...s.qualityEvidence.slice(0, 2), ...s.safetyEvidence.slice(0, 1)],
        dataSource: 'quality-lab'
      },
      {
        title: 'Market Opportunity',
        summary: "Children's social care productivity and AI-assisted recording.",
        pick: (s) => s.strategicContext.slice(1, 3).map((t) => pointFromText(t, 'Founder Memory', 'founder-memory', 'medium')),
        dataSource: 'founder-memory'
      },
      {
        title: 'Founder–Market Fit',
        summary: 'Founder memory and strategic alignment.',
        pick: (s) => s.strategicContext.slice(0, 2).map((t) => pointFromText(t, 'Founder Memory', 'founder-memory', 'high')),
        dataSource: 'founder-memory'
      },
      {
        title: 'Governance',
        summary: 'Approval workflows and audit-backed operating discipline.',
        pick: (s) => s.governanceEvidence,
        dataSource: 'approvals'
      },
      {
        title: 'AI Safety',
        summary: 'Quality Lab, safety reviews and human oversight.',
        pick: (s) => [...s.safetyEvidence, ...s.qualityEvidence.slice(0, 1)],
        dataSource: 'quality-lab'
      },
      {
        title: 'Roadmap',
        summary: 'Product direction from founder memory.',
        pick: (s) => s.productEvidence.slice(0, 2),
        dataSource: 'founder-memory'
      },
      {
        title: 'Risks and Mitigations',
        summary: 'Honest limitations and mitigations.',
        pick: (s) => s.limitations.map((l) => pointFromText(l, 'Data Limitations', 'manual', 'high', l)),
        dataSource: 'manual'
      }
    ]
  },
  provider: {
    sections: [
      {
        title: 'Practical Value',
        summary: 'Time returned to direct care and recording support.',
        pick: (s) => s.growthEvidence.concat(s.productEvidence.slice(0, 2)),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Inspection evidence preparation',
        summary: 'Recording quality and inspection preparation.',
        pick: (s) => s.productEvidence.filter((p) => /ofsted|readiness|recording/i.test(p.claim + p.support)),
        dataSource: 'quality-lab'
      },
      {
        title: 'Therapeutic Recording',
        summary: 'ORB and recording features from live usage where available.',
        pick: (s) => s.telemetryEvidence.concat(s.productEvidence.slice(0, 2)),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Staff Support',
        summary: "How IndiCare supports adults working in children's homes.",
        pick: (s) => s.productEvidence.slice(0, 3),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Safeguarding Caution',
        summary: 'Safeguarding-sensitive design constraints.',
        pick: (s) => s.safetyEvidence,
        dataSource: 'manual'
      },
      {
        title: 'Privacy',
        summary: 'Data protection and identifiable information controls.',
        pick: (s) => s.safetyEvidence.filter((p) => /identifiable|privacy|child|staff/i.test(p.claim)),
        dataSource: 'manual'
      },
      {
        title: 'Implementation',
        summary: 'Pilot approach and governance.',
        pick: (s) => s.governanceEvidence.slice(0, 2),
        dataSource: 'approvals'
      }
    ]
  },
  openai: {
    sections: [
      {
        title: "Responsible AI in Regulated Children's Homes",
        summary: "Ethical intelligence for children's social care.",
        pick: (s) => s.safetyEvidence.concat(s.qualityEvidence.slice(0, 2)),
        dataSource: 'quality-lab'
      },
      {
        title: 'Sector-Specific Assistant',
        summary: "ORB designed for children's homes recording and safeguarding context.",
        pick: (s) => s.productEvidence.slice(0, 3),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Safety Guardrails',
        summary: 'Quality Lab and output safety checks.',
        pick: (s) => s.qualityEvidence.concat(s.safetyEvidence),
        dataSource: 'quality-lab'
      },
      {
        title: 'Approval Systems and Human Oversight',
        summary: 'Founder approval before external outputs.',
        pick: (s) => s.governanceEvidence,
        dataSource: 'approvals'
      },
      {
        title: 'Partnership Potential',
        summary: 'Strategic alignment from founder memory.',
        pick: (s) => s.strategicContext.slice(0, 2).map((t) => pointFromText(t, 'Founder Memory', 'founder-memory', 'medium')),
        dataSource: 'founder-memory'
      }
    ]
  },
  microsoft: {
    sections: [
      {
        title: 'Startup Scalability',
        summary: 'Platform architecture and operating loop discipline.',
        pick: (s) => s.governanceEvidence.concat(s.productEvidence.slice(0, 1)),
        dataSource: 'audit-log'
      },
      {
        title: 'Enterprise Readiness',
        summary: 'Governance, audit and approval workflows.',
        pick: (s) => s.governanceEvidence,
        dataSource: 'approvals'
      },
      {
        title: 'Cloud and Security Route',
        summary: 'Data protection posture.',
        pick: (s) => s.safetyEvidence,
        dataSource: 'manual'
      },
      {
        title: 'Productivity in Regulated Care',
        summary: 'Hours returned and feature usage from live data.',
        pick: (s) => s.growthEvidence.concat(s.productEvidence.slice(0, 2)),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Copilot-Style Workflow Potential',
        summary: 'ORB modes and assistant usage patterns.',
        pick: (s) => s.telemetryEvidence,
        dataSource: 'live-telemetry'
      }
    ]
  },
  'innovate-uk': {
    sections: [
      {
        title: 'Innovation',
        summary: 'AI-assisted recording and Quality Lab evidence generation.',
        pick: (s) => s.qualityEvidence.concat(s.productEvidence.slice(0, 2)),
        dataSource: 'quality-lab'
      },
      {
        title: 'Social Impact',
        summary: "Time returned to direct care in children's homes.",
        pick: (s) => s.growthEvidence,
        dataSource: 'live-telemetry'
      },
      {
        title: 'Productivity',
        summary: 'Feature usage and operational efficiency signals.',
        pick: (s) => s.productEvidence,
        dataSource: 'live-telemetry'
      },
      {
        title: 'Responsible AI',
        summary: 'Safety, approvals and human oversight.',
        pick: (s) => s.safetyEvidence.concat(s.governanceEvidence.slice(0, 1)),
        dataSource: 'quality-lab'
      },
      {
        title: 'Evidence Generation',
        summary: 'This Evidence Engine produces honest, approval-gated packs.',
        pick: (s) => s.governanceEvidence.slice(0, 2),
        dataSource: 'audit-log'
      },
      {
        title: 'Scalability',
        summary: 'Telemetry and quality infrastructure.',
        pick: (s) => s.telemetryEvidence.concat(s.qualityEvidence.slice(0, 1)),
        dataSource: 'live-telemetry'
      }
    ]
  },
  dfe: {
    sections: [
      {
        title: 'Recording Quality',
        summary: "Supporting better recording in children's homes.",
        pick: (s) => s.productEvidence.slice(0, 3),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Supporting Adults',
        summary: 'Reducing administrative burden on staff.',
        pick: (s) => s.growthEvidence,
        dataSource: 'live-telemetry'
      },
      {
        title: 'Child Voice',
        summary: 'Recording approaches that respect child voice — no identifiable narratives.',
        pick: () => [
          pointFromText(
            'Child voice is supported through structured recording — identifiable narratives are excluded from external evidence.',
            'Design principle',
            'manual',
            'high'
          )
        ],
        dataSource: 'manual'
      },
      {
        title: 'Safeguarding Evidence',
        summary: 'Quality Lab and safety guardrails.',
        pick: (s) => s.qualityEvidence.concat(s.safetyEvidence.slice(0, 2)),
        dataSource: 'quality-lab'
      },
      {
        title: 'Oversight',
        summary: 'Approval and audit workflows.',
        pick: (s) => s.governanceEvidence,
        dataSource: 'approvals'
      },
      {
        title: 'Limitations',
        summary: 'Honest data boundaries.',
        pick: (s) => s.limitations.map((l) => pointFromText(l, 'Limitations', 'manual', 'high', l)),
        dataSource: 'manual'
      },
      {
        title: 'Pilot Approach',
        summary: 'Controlled pilot with measurement.',
        pick: (s) => s.strategicContext.filter((t) => /pilot|commercial/i.test(t)).map((t) => pointFromText(t, 'Founder Memory', 'founder-memory', 'medium')),
        dataSource: 'founder-memory'
      }
    ]
  },
  'local-authority': {
    sections: [
      {
        title: 'Recording Quality',
        summary: 'LA-facing recording improvement evidence.',
        pick: (s) => s.productEvidence.slice(0, 3),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Supporting Adults',
        summary: 'Staff time and productivity signals.',
        pick: (s) => s.growthEvidence,
        dataSource: 'live-telemetry'
      },
      {
        title: 'Safeguarding and Oversight',
        summary: 'Safety controls and Quality Lab.',
        pick: (s) => s.safetyEvidence.concat(s.qualityEvidence.slice(0, 2)),
        dataSource: 'quality-lab'
      },
      {
        title: 'Limitations',
        summary: 'Data boundaries for LA discussions.',
        pick: (s) => s.limitations.map((l) => pointFromText(l, 'Limitations', 'manual', 'high', l)),
        dataSource: 'manual'
      },
      {
        title: 'Pilot Approach',
        summary: 'Measured pilot with feedback loop.',
        pick: (s) => s.governanceEvidence.slice(0, 2),
        dataSource: 'approvals'
      }
    ]
  },
  'pilot-partner': {
    sections: [
      {
        title: 'What the Pilot Includes',
        summary: 'Scope for early pilot partners.',
        pick: (s) => s.productEvidence.slice(0, 2).concat(
          s.strategicContext.slice(0, 1).map((t) => pointFromText(t, 'Founder Memory', 'founder-memory', 'medium'))
        ),
        dataSource: 'founder-memory'
      },
      {
        title: 'What Is Measured',
        summary: 'Telemetry and quality metrics.',
        pick: (s) => s.telemetryEvidence.concat(s.qualityEvidence.slice(0, 1)),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Privacy',
        summary: 'Data protection commitments.',
        pick: (s) => s.safetyEvidence,
        dataSource: 'manual'
      },
      {
        title: 'Risk Management',
        summary: 'Approvals and safety reviews.',
        pick: (s) => s.governanceEvidence,
        dataSource: 'approvals'
      },
      {
        title: 'Success Criteria',
        summary: 'Measurable outcomes from live data only.',
        pick: (s) => s.growthEvidence.concat(s.qualityEvidence.slice(0, 1)),
        dataSource: 'live-telemetry',
        limitations: ['Success metrics require live telemetry — do not invent baselines.']
      },
      {
        title: 'Feedback Loop',
        summary: 'Quality Lab and operating loop.',
        pick: (s) => s.qualityEvidence.slice(0, 1).concat(s.governanceEvidence.slice(0, 1)),
        dataSource: 'quality-lab'
      }
    ]
  },
  general: {
    sections: [
      {
        title: 'Strategic Context',
        summary: 'Founder memory and objectives.',
        pick: (s) => s.strategicContext.map((t) => pointFromText(t, 'Founder Memory', 'founder-memory', 'medium')),
        dataSource: 'founder-memory'
      },
      {
        title: 'Live Evidence',
        summary: 'Telemetry, product and growth signals.',
        pick: (s) => [...s.telemetryEvidence, ...s.productEvidence, ...s.growthEvidence].slice(0, 6),
        dataSource: 'live-telemetry'
      },
      {
        title: 'Quality and Safety',
        summary: 'Quality Lab and safety controls.',
        pick: (s) => [...s.qualityEvidence, ...s.safetyEvidence],
        dataSource: 'quality-lab'
      },
      {
        title: 'Governance',
        summary: 'Approvals and operating discipline.',
        pick: (s) => s.governanceEvidence,
        dataSource: 'approvals'
      },
      {
        title: 'Limitations',
        summary: 'Honest boundaries.',
        pick: (s) => s.limitations.map((l) => pointFromText(l, 'Limitations', 'manual', 'high', l)),
        dataSource: 'manual'
      }
    ]
  }
}

function pointFromText(
  text: string,
  sourceLabel: string,
  sourceType: EvidenceDataSource,
  confidence: EvidenceConfidence,
  limitation?: string
): EvidencePoint {
  return {
    id: nextId('ev'),
    claim: text.slice(0, 200),
    support: text,
    sourceLabel,
    sourceType,
    confidence,
    limitation
  }
}

export function formatEvidencePackText(pack: EvidencePack): string {
  const lines: string[] = [
    `# ${pack.title}`,
    '',
    `Audience: ${EVIDENCE_AUDIENCE_LABELS[pack.audience]}`,
    `Purpose: ${pack.purpose}`,
    `Status: ${pack.status}`,
    `Data basis: ${pack.dataBasis}`,
    '',
    '## Limitations',
    ...pack.limitations.map((l) => `- ${l}`),
    ''
  ]

  for (const sec of pack.sections) {
    lines.push(`## ${sec.title}`)
    lines.push(sec.summary)
    lines.push('')
    for (const point of sec.evidencePoints) {
      lines.push(`- **${point.claim}**`)
      lines.push(`  ${point.support}`)
      lines.push(`  Source: ${point.sourceLabel} (${point.confidence} confidence)`)
      if (point.limitation) lines.push(`  Limitation: ${point.limitation}`)
      lines.push('')
    }
    if (sec.limitations.length > 0) {
      lines.push('Section limitations:')
      sec.limitations.forEach((l) => lines.push(`- ${l}`))
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function generateEvidencePack(
  audience: EvidenceAudience,
  createdBy = 'founder'
): EvidencePack {
  const sources = buildEvidenceSources()
  const config = AUDIENCE_CONFIGS[audience]
  const sections = config.sections.map((def) =>
    section(def.title, def.summary, def.pick(sources), def.dataSource, def.limitations ?? [])
  )

  const packText = sections
    .flatMap((s) => s.evidencePoints.map((p) => `${p.claim} ${p.support}`))
    .join('\n')
  const safety = checkFounderOutputSafety(packText)

  const pack: EvidencePack = {
    id: nextId('pack'),
    title: `${EVIDENCE_AUDIENCE_LABELS[audience]} Evidence Pack`,
    audience,
    purpose: audiencePurpose(audience),
    status: 'needs-review',
    dataBasis: buildDataBasis(sources),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    sections,
    safetyReview: {
      safe: safety.safe,
      issues: safety.issues,
      requiresReview: safety.requiresReview,
      reviewedAt: new Date().toISOString()
    },
    limitations: sources.limitations
  }

  return pack
}

export function getUnsafeClaims(pack: EvidencePack): string[] {
  const unsafe: string[] = []
  for (const sec of pack.sections) {
    for (const point of sec.evidencePoints) {
      const check = checkFounderOutputSafety(`${point.claim} ${point.support}`)
      if (!check.safe) {
        unsafe.push(point.claim)
      }
    }
  }
  return unsafe
}

export function overallPackConfidence(pack: EvidencePack): EvidenceConfidence {
  const confidences = pack.sections.map((s) => s.confidence)
  if (confidences.every((c) => c === 'high')) return 'high'
  if (confidences.some((c) => c === 'high')) return 'medium'
  return 'low'
}

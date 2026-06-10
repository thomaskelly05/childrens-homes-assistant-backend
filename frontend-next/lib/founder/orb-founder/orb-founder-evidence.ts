/**
 * ORB Founder — evidence engine integration.
 */

import { buildEvidenceSources } from '@/lib/founder/evidence/evidence-source-builder'
import { generateEvidencePack, getUnsafeClaims } from '@/lib/founder/evidence/evidence-pack-generator'
import type { EvidenceAudience } from '@/lib/founder/evidence/evidence-types'
import { createEvidencePack, getEvidencePacks } from '@/lib/founder/evidence/evidence-store'
import type { FounderOrbAnswer } from './orb-founder-engine'

function audienceFromQuestion(question: string): EvidenceAudience | null {
  const q = question.toLowerCase()
  if (/investor/.test(q)) return 'investor'
  if (/provider/.test(q)) return 'provider'
  if (/openai/.test(q)) return 'openai'
  if (/microsoft/.test(q)) return 'microsoft'
  if (/innovate\s*uk/.test(q)) return 'innovate-uk'
  if (/\bdfe\b|local authority|local-authority/.test(q)) return 'dfe'
  if (/pilot\s*partner/.test(q)) return 'pilot-partner'
  return null
}

export function answerEvidencePackGenerate(question: string): FounderOrbAnswer {
  const audience = audienceFromQuestion(question) ?? 'investor'
  const pack = generateEvidencePack(audience, 'orb-founder')
  void createEvidencePack(pack, { actor: 'orb-founder' }).catch(() => undefined)

  const limitations = pack.limitations.slice(0, 4).join(' ')
  return {
    answer: `I have generated a draft ${audience} evidence pack: "${pack.title}". Status: ${pack.status} — approval is required before external use. Data basis: ${pack.dataBasis}. Limitations: ${limitations || 'Live data may be limited.'} Review it at /founder/evidence/${pack.id}.`,
    usedSources: ['Founder Evidence Engine', 'Founder Memory', 'Quality Lab', 'Founder Telemetry'],
    suggestedFollowUps: [
      'What evidence is missing?',
      'What are the current limitations?',
      'What claims are unsafe to make?'
    ],
    confidence: pack.safetyReview.safe ? 'medium' : 'low'
  }
}

export function answerProviderEvidence(): FounderOrbAnswer {
  const sources = buildEvidenceSources()
  const points = [...sources.productEvidence, ...sources.growthEvidence].slice(0, 4)
  const summary = points.length > 0
    ? points.map((p) => p.claim).join(' ')
    : 'No live provider evidence yet — state limitations honestly.'

  return {
    answer: `Provider evidence available: ${summary} Limitations: ${sources.limitations.slice(0, 3).join(' ')}`,
    usedSources: ['Founder Evidence Engine', 'Ofsted Readiness', 'Hours Returned Engine'],
    suggestedFollowUps: ['Build a pilot partner pack.', 'What claims are unsafe to make?'],
    confidence: points.length > 0 ? 'medium' : 'low'
  }
}

export function answerOpenAiSafeNarrative(): FounderOrbAnswer {
  const sources = buildEvidenceSources()
  const safe = [...sources.safetyEvidence, ...sources.qualityEvidence].slice(0, 3)
  return {
    answer: `Safe OpenAI narrative: ${safe.map((p) => p.claim).join(' ')} Do not share identifiable operational data. All external packs require approval.`,
    usedSources: ['Founder Evidence Engine', 'Quality Lab', 'Data Protection and Safety'],
    suggestedFollowUps: ['Generate an investor evidence pack.', 'What evidence is missing?'],
    confidence: 'medium'
  }
}

export function answerInnovateUkApplication(): FounderOrbAnswer {
  const pack = generateEvidencePack('innovate-uk', 'orb-founder')
  return {
    answer: `Innovate UK application should include: ${pack.sections.map((s) => s.title).join(', ')}. Data basis: ${pack.dataBasis}. Limitations: ${pack.limitations.join(' ')}`,
    usedSources: ['Founder Evidence Engine', 'Innovate UK Pack Template'],
    suggestedFollowUps: ['What evidence is missing?', 'Generate an Innovate UK pack at /founder/evidence'],
    confidence: 'medium'
  }
}

export function answerMissingEvidence(): FounderOrbAnswer {
  const sources = buildEvidenceSources()
  const missing: string[] = []
  if (sources.telemetryEvidence.every((p) => p.confidence === 'low')) missing.push('live telemetry')
  if (sources.qualityEvidence.every((p) => p.confidence === 'low')) missing.push('Quality Lab runs')
  if (sources.growthEvidence.every((p) => p.confidence === 'low')) missing.push('traction metrics')
  if (sources.commercialEvidence.length === 0) missing.push('billing and revenue data')

  return {
    answer: missing.length > 0
      ? `Missing or limited evidence: ${missing.join(', ')}. Do not invent figures for these areas.`
      : 'Core evidence sources are connected. Still include limitations and route packs through approval.',
    usedSources: ['Founder Evidence Engine'],
    suggestedFollowUps: ['What are the current limitations?', 'What claims are unsafe to make?'],
    confidence: missing.length > 0 ? 'high' : 'medium'
  }
}

export function answerCurrentLimitations(): FounderOrbAnswer {
  const sources = buildEvidenceSources()
  return {
    answer: `Current limitations: ${sources.limitations.join(' ')}`,
    usedSources: ['Founder Evidence Engine', 'Data Source Status'],
    suggestedFollowUps: ['What evidence is missing?', 'Generate an investor evidence pack.'],
    confidence: 'high'
  }
}

export function answerUnsafeClaims(): FounderOrbAnswer {
  const packs = getEvidencePacks()
  const latest = packs[0]
  const unsafe = latest ? getUnsafeClaims(latest) : []
  const general = [
    'Invented user or provider counts',
    'Revenue or MRR without live billing data',
    'Provider names unless approved in founder memory',
    'Child or staff names',
    'Safeguarding narratives'
  ]

  return {
    answer: `Unsafe claims to avoid: ${general.join('; ')}.${unsafe.length > 0 ? ` Flagged in latest pack: ${unsafe.join('; ')}.` : ''}`,
    usedSources: ['Founder Evidence Engine', 'Data Protection and Safety'],
    suggestedFollowUps: ['What can I safely say to OpenAI?', 'What evidence do we have for providers?'],
    confidence: 'high'
  }
}

export function matchesEvidenceQuestion(question: string): boolean {
  const q = question.toLowerCase()
  return (
    /evidence\s*pack/.test(q) ||
    /generate.*investor.*evidence/.test(q) ||
    /evidence.*provider/.test(q) ||
    /safely say.*openai/.test(q) ||
    /innovate\s*uk.*application/.test(q) ||
    /evidence.*missing/.test(q) ||
    /current limitations/.test(q) ||
    /pilot partner pack/.test(q) ||
    /unsafe.*claim/.test(q) ||
    /what claims are unsafe/.test(q)
  )
}

export function answerEvidenceQuestion(question: string): FounderOrbAnswer | null {
  const q = question.toLowerCase()
  if (/generate.*investor.*evidence|investor evidence pack/.test(q)) return answerEvidencePackGenerate(question)
  if (/evidence.*provider|providers\?/.test(q)) return answerProviderEvidence()
  if (/safely say.*openai|safe.*openai/.test(q)) return answerOpenAiSafeNarrative()
  if (/innovate\s*uk/.test(q)) return answerInnovateUkApplication()
  if (/evidence.*missing|missing evidence/.test(q)) return answerMissingEvidence()
  if (/current limitations|what are the limitations/.test(q)) return answerCurrentLimitations()
  if (/pilot partner pack|build a pilot/.test(q)) {
    const pack = generateEvidencePack('pilot-partner', 'orb-founder')
    void createEvidencePack(pack, { actor: 'orb-founder' }).catch(() => undefined)
    return {
      answer: `Pilot partner pack generated: "${pack.title}". Includes scope, measurement, privacy and success criteria. Limitations: ${pack.limitations.slice(0, 3).join(' ')} Approval required before sharing.`,
      usedSources: ['Founder Evidence Engine'],
      suggestedFollowUps: ['What evidence is missing?', 'What claims are unsafe to make?'],
      confidence: 'medium'
    }
  }
  if (/unsafe.*claim|what claims are unsafe/.test(q)) return answerUnsafeClaims()
  if (/evidence\s*pack/.test(q)) return answerEvidencePackGenerate(question)
  return null
}

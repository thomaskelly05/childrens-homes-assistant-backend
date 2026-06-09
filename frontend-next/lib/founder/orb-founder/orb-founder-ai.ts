/**
 * ORB Founder — hybrid AI response layer.
 * Gathers founder context, calls existing ORB chat infrastructure, falls back to rule-based engine on error.
 */

import type { AgentId } from '@/lib/founder/agents'
import { queryStandaloneOrbConversation } from '@/lib/orb/standalone-client'

import {
  answerFounderQuestion,
  type FounderOrbAnswer,
  type FounderOrbConfidence,
  type FounderOrbContext
} from './orb-founder-engine'
import { getOrbFounderContext, serializeOrbFounderContextForAi } from './orb-founder-context'
import { buildOrbFounderSystemPrompt } from './orb-founder-system-prompt'

export type FounderOrbAiAnswer = FounderOrbAnswer & {
  responseMode: 'ai' | 'fallback'
}

export type FounderOrbAiOptions = {
  context?: FounderOrbContext
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  signal?: AbortSignal
}

const DEFAULT_AI_SOURCES = ['Founder Intelligence Layer', 'ORB Founder AI']
const FALLBACK_SOURCES = ['Founder Intelligence Layer', 'Rule-based Engine']

const DEFAULT_FOLLOW_UPS = [
  'What should I build next and why?',
  'What is the biggest operational risk before provider rollout?',
  'How do I reduce AI cost without weakening ORB quality?'
]

function mapConfidence(raw?: string | null): FounderOrbConfidence {
  if (!raw) return 'medium'
  const normalised = raw.toLowerCase()
  if (normalised.includes('high')) return 'high'
  if (normalised.includes('low')) return 'low'
  return 'medium'
}

function extractSourcesFromResponse(
  sources?: Array<{ label?: string }>
): string[] {
  if (!sources?.length) return DEFAULT_AI_SOURCES
  const labels = sources
    .map((s) => s.label?.trim())
    .filter((label): label is string => Boolean(label))
  return labels.length > 0 ? labels.slice(0, 5) : DEFAULT_AI_SOURCES
}

/**
 * Call existing ORB standalone conversation API with founder context.
 * Isolated to ORB Founder — does not access child records.
 */
async function callOrbFounderAiCompletion(
  question: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  signal?: AbortSignal
): Promise<{ answer: string; sources: string[]; confidence: FounderOrbConfidence } | null> {
  try {
    const response = await queryStandaloneOrbConversation(
      {
        message: question,
        mode: 'ORB Founder',
        history,
        project_memory: systemPrompt,
        client_route_hint: '/founder/orb',
        source_surface: 'chat',
        detail: 'concise'
      },
      signal
    )

    if (!response.answer?.trim()) return null

    return {
      answer: response.answer.trim(),
      sources: extractSourcesFromResponse(response.sources ?? response.citations),
      confidence: mapConfidence(response.confidence)
    }
  } catch {
    return null
  }
}

function buildAiAnswer(
  aiResult: { answer: string; sources: string[]; confidence: FounderOrbConfidence },
  ruleBasedHint?: FounderOrbAnswer
): FounderOrbAiAnswer {
  return {
    answer: aiResult.answer,
    usedSources: aiResult.sources,
    suggestedFollowUps: ruleBasedHint?.suggestedFollowUps ?? DEFAULT_FOLLOW_UPS,
    confidence: aiResult.confidence,
    responseMode: 'ai'
  }
}

function buildFallbackAnswer(ruleBased: FounderOrbAnswer): FounderOrbAiAnswer {
  return {
    ...ruleBased,
    usedSources: [...new Set([...ruleBased.usedSources, ...FALLBACK_SOURCES])],
    responseMode: 'fallback'
  }
}

/**
 * Answer a founder question using hybrid intelligence:
 * 1. Gather founder context from existing engines
 * 2. Pass context to ORB chat infrastructure
 * 3. Fall back to rule-based answerFounderQuestion() on error
 */
export async function answerFounderQuestionWithAI(
  question: string,
  options?: FounderOrbAiOptions
): Promise<FounderOrbAiAnswer> {
  const trimmed = question.trim()
  const ruleBasedContext = options?.context
  const ruleBasedFallback = answerFounderQuestion(trimmed, ruleBasedContext)

  if (!trimmed) {
    return buildFallbackAnswer(ruleBasedFallback)
  }

  const founderContext = getOrbFounderContext()
  const contextJson = serializeOrbFounderContextForAi(founderContext)
  const systemPrompt = buildOrbFounderSystemPrompt(contextJson)

  const history = (options?.history ?? []).slice(-6).map((msg) => ({
    role: msg.role,
    content: msg.content
  }))

  const aiResult = await callOrbFounderAiCompletion(trimmed, systemPrompt, history, options?.signal)

  if (!aiResult) {
    return buildFallbackAnswer(ruleBasedFallback)
  }

  return buildAiAnswer(aiResult, ruleBasedFallback)
}

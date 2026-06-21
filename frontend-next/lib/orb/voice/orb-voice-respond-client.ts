import { authFetch } from '@/lib/auth/api'

import type { OrbVoiceRespondRequest, OrbVoiceRespondResult } from './orb-voice-free-flowing-conversation'

function normaliseRespondBody(payload: OrbVoiceRespondRequest): Record<string, unknown> {
  const transcript = (payload.transcript || payload.message || '').trim()
  const sessionTurns =
    payload.sessionTurns ||
    (payload.history || []).map((turn) => ({
      role: (turn.role === 'assistant' || turn.role === 'orb' ? 'orb' : 'adult') as 'adult' | 'orb',
      text: String(turn.content || turn.text || '').trim()
    })).filter((turn) => turn.text)

  return {
    mode: payload.mode,
    transcript,
    message: transcript,
    sessionTurns,
    history: sessionTurns.map((turn) => ({
      role: turn.role === 'orb' ? 'assistant' : 'user',
      content: turn.text
    })),
    session_memory: payload.sessionMemory || payload.session_memory
  }
}

export async function requestOrbVoiceRespond(
  payload: OrbVoiceRespondRequest,
  signal?: AbortSignal
): Promise<OrbVoiceRespondResult> {
  const response = await authFetch('/orb/voice/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normaliseRespondBody(payload)),
    signal
  })
  if (!response || typeof response !== 'object') {
    throw new Error('ORB Voice did not return a response.')
  }
  const body = response as Record<string, unknown>
  const reply = String(body.reply ?? body.answer ?? '').trim()
  if (!reply) {
    throw new Error('ORB Voice returned an empty reply.')
  }
  const contextUsed = (body.context_used || {}) as Record<string, unknown>
  return {
    ok: Boolean(body.ok ?? true),
    reply,
    mode: typeof body.mode === 'string' ? body.mode : undefined,
    safetyBoundaryApplied: Boolean(body.safetyBoundaryApplied),
    shouldEscalateToPolicyReminder: Boolean(body.shouldEscalateToPolicyReminder),
    prompt_tier: String(body.promptTier ?? body.prompt_tier ?? contextUsed.prompt_tier ?? 'voice_fast'),
    embeddings_used: Boolean(body.embeddings_used ?? contextUsed.embeddings_used),
    retrieval_used: Boolean(body.retrieval_used ?? contextUsed.retrieval_used)
  }
}

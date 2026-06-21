import { authFetch } from '@/lib/auth/api'

import type { OrbVoiceRespondRequest, OrbVoiceRespondResult } from './orb-voice-free-flowing-conversation'

export async function requestOrbVoiceRespond(
  payload: OrbVoiceRespondRequest,
  signal?: AbortSignal
): Promise<OrbVoiceRespondResult> {
  const response = await authFetch('/orb/voice/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
    prompt_tier: String(body.prompt_tier ?? contextUsed.prompt_tier ?? 'voice_fast'),
    embeddings_used: Boolean(body.embeddings_used ?? contextUsed.embeddings_used),
    retrieval_used: Boolean(body.retrieval_used ?? contextUsed.retrieval_used)
  }
}

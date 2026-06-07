/**
 * ORB Voice transcript assembly — interim vs final chunk handling.
 */

/** Append a final STT chunk without overwriting earlier committed text. */
export function appendOrbVoiceFinalTranscriptChunk(previous: string, chunk: string): string {
  const piece = chunk.trim()
  if (!piece) return previous.trim()
  const base = previous.trim()
  if (!base) return piece
  if (base.endsWith(piece)) return base
  if (piece.startsWith(base)) return piece
  return `${base} ${piece}`.trim()
}

/** Display line while listening — committed finals plus live interim only. */
export function buildOrbVoiceDisplayTranscript(transcript: string, interimTranscript: string): string {
  const committed = transcript.trim()
  const interim = interimTranscript.trim()
  if (!committed) return interim
  if (!interim) return committed
  if (committed.endsWith(interim)) return committed
  return `${committed} ${interim}`.trim()
}

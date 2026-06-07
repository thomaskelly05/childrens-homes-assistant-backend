/**
 * Shared ORB brain entrypoint — used by ORB Chat and ORB Voice.
 */

import {
  routeOrbBrainIntent,
  type AskOrbBrainContext,
  type OrbBrainRoute,
  type OrbBrainRouteDecision,
  type OrbBrainSource,
  type OrbBrainToolExtension
} from './orb-brain-router-intent'
import {
  queryStandaloneOrbConversation,
  sendStandaloneOrbMessageStream,
  type StandaloneOrbConversationRequest,
  type StandaloneOrbConversationResponse,
  type StandaloneOrbStreamCallbacks
} from './standalone-client'

export type {
  AskOrbBrainContext,
  OrbBrainRoute,
  OrbBrainRouteDecision,
  OrbBrainSource,
  OrbBrainToolExtension
}

export { routeOrbBrainIntent }

export type AskOrbBrainOptions = {
  request: StandaloneOrbConversationRequest
  context?: AskOrbBrainContext
  signal?: AbortSignal
  stream?: StandaloneOrbStreamCallbacks
}

/** Attach lightweight brain routing metadata for the standalone API (message body only). */
export function buildOrbBrainConversationRequest(
  request: StandaloneOrbConversationRequest,
  context?: AskOrbBrainContext
): StandaloneOrbConversationRequest {
  const route = routeOrbBrainIntent(request.message, request.mode, context)
  const source = context?.source ?? 'chat'
  const locationLine = context?.locationHint?.trim()
    ? `Location context (if relevant): ${context.locationHint.trim()}`
    : null
  const routingBlock = [
    '[ORB brain routing]',
    `source: ${source}`,
    `route: ${route.route}`,
    route.toolExtension ? `tool_extension: ${route.toolExtension}` : null,
    locationLine
  ]
    .filter(Boolean)
    .join('\n')

  return {
    ...request,
    message: `${routingBlock}\n\n${request.message}`
  }
}

/**
 * Shared ORB brain — stream first, same entry as ORB Chat.
 */
export async function askOrbBrain(
  options: AskOrbBrainOptions
): Promise<StandaloneOrbConversationResponse> {
  const prepared = buildOrbBrainConversationRequest(options.request, options.context)
  if (options.stream) {
    return sendStandaloneOrbMessageStream(prepared, options.stream, options.signal)
  }
  return queryStandaloneOrbConversation(prepared, options.signal)
}

/** Alias for askOrbBrain — shared runtime entrypoint name. */
export const runOrbBrain = askOrbBrain

export const createOrbResponse = askOrbBrain

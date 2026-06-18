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

/**
 * Attach lightweight client route hints for telemetry — backend ``/brain-route`` is authoritative.
 * The user message is sent unchanged; routing metadata is structured fields only.
 */
export function buildOrbBrainConversationRequest(
  request: StandaloneOrbConversationRequest,
  context?: AskOrbBrainContext
): StandaloneOrbConversationRequest {
  const route = routeOrbBrainIntent(request.message, request.mode, context)
  const source = context?.source ?? 'chat'
  if (source === 'voice') {
    return {
      ...request,
      source_surface: 'voice',
      requested_action: 'voice_conversation',
      client_route_hint: route.route,
      location_hint: context?.locationHint?.trim() || undefined
    }
  }
  return {
    ...request,
    source_surface: source,
    client_route_hint: route.route,
    location_hint: context?.locationHint?.trim() || undefined
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

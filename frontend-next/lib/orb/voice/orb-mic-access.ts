/**
 * ORB mic access for React — resolves developer mode from the client store.
 */

import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'

import {
  canUseLiveVoice,
  isOrbTestMode,
  type OrbMicAccessContext
} from './orb-voice-readiness'

export {
  canUseComposerMic,
  canUseDictateMic,
  canUseLiveVoice,
  isOrbTestMode,
  orbMicDevLog,
  type OrbMicAccessContext
} from './orb-voice-readiness'

export function resolveOrbMicAccessContext(input: {
  subscriptionActive: boolean
  isAdminUser?: boolean
  developerMode?: boolean
}): OrbMicAccessContext & { canUseLiveVoice: boolean } {
  const isDeveloperMode = input.developerMode ?? isOrbDeveloperMode()
  const isTestMode = isOrbTestMode()
  const ctx: OrbMicAccessContext = {
    subscriptionActive: input.subscriptionActive,
    isAdminUser: input.isAdminUser,
    isDeveloperMode,
    isTestMode
  }
  return { ...ctx, canUseLiveVoice: canUseLiveVoice(ctx) }
}

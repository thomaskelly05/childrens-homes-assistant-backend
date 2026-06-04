import { ORB_DATA_BOUNDARY, ORB_DATA_BOUNDARY_SHORT, ORB_PRODUCT_NAME } from '@/lib/orb/orb-product-copy'
import {
  buildAdultProfilePromptBlock,
  normalizeAdultProfileRole,
  readAdultProfile,
  roleBasedEmptyStarters,
  type AdultProfile
} from '@/lib/orb/adult-profile-store'
import {
  personalisedEmptyHeading,
  personalisedWelcomeMessage
} from '@/lib/orb/orb-personalised-greeting'
import {
  STANDALONE_ORB_SIGN_IN_PATH,
  STANDALONE_ORB_SIGN_IN_REQUIRED_ANSWER,
  isStandaloneOrbSignInPromptMessage,
  isStandaloneOrbSafetyAcceptanceMessage,
  isOrbMinimalTurn,
  standaloneGreetingLocalAnswer,
  tryStandaloneGuestLocalAnswer
} from '@/lib/orb/standalone-guest-response'
import { profileInitialsFromName } from '@/lib/orb/orb-profile-initials'
import { OrbHelpPanel } from '@/components/orb-standalone/orb-help-panel'
import { OrbVoiceSettingsPanel } from '@/components/orb-standalone/orb-voice-settings-panel'
import {
  agentForMode,
  atmosphereClassForMode,
  type ResidentialAgentDefinition
} from '@/lib/orb/residential-agents'
import { streamTextIntoView } from '@/lib/orb/streaming-text'
import {
  defaultStandaloneOrbAccessibility,
  loadStandaloneOrbAccessibility,
  type StandaloneOrbAccessibilityPreferences,
  saveStandaloneOrbAccessibility,
  standaloneOrbAccessibilityClassNames
} from '@/lib/orb/standalone-accessibility'
import { useAuth } from '@/contexts/auth-context'
import { useOrbAccountState } from '@/hooks/use-orb-account-state'
import { normaliseRole } from '@/lib/auth/permissions'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import {
  canUseComposerMic,
  orbMicDevLog,
  resolveOrbMicAccessContext
} from '@/lib/orb/voice/orb-mic-access'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { isOrbRealtimeVoiceAvailable } from '@/lib/orb/voice/orb-realtime-availability'
import { isSafariBrowser } from '@/lib/orb/voice/orb-voice-readiness'
import { useOrbSessionGate } from '@/hooks/use-orb-session-gate'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  dictateMobilePrimaryButton,
  dictateMobileShowsCapturedCard,
  dictateMobileStatusLine,
  isTechnicalDictateStatus
} from '../../lib/orb/dictate/orb-dictate-mobile-copy.ts'
import {
  orbVoiceUiDetailLine,
  orbVoiceUiPrimaryLabel,
  orbVoiceUiStatusLine,
  type OrbVoiceUiState
} from '../../lib/orb/voice/orb-voice-ui-state.ts'

function voiceMobilePrimaryButton(input: {
  uiState: OrbVoiceUiState
  sessionLive?: boolean
  starting?: boolean
}): string {
  if (input.sessionLive) return 'End'
  if (input.starting) return 'Connecting…'
  return orbVoiceUiPrimaryLabel(input.uiState)
}

function voiceMobileStatusLine(input: {
  uiState: OrbVoiceUiState
  permissionDenied?: boolean
  blockedReason?: string | null
}): string {
  if (input.permissionDenied) return 'Microphone access is blocked'
  if (input.blockedReason?.trim()) return input.blockedReason.trim()
  return orbVoiceUiStatusLine(input.uiState)
}

function voiceMobileUnavailableDetail(dictateRealtimeReady?: boolean): string {
  return orbVoiceUiDetailLine('provider_unavailable', dictateRealtimeReady) ?? 'You can still type to ORB or use Dictate.'
}
import {
  ORB_VOICE_DEBUG_CONFIG_HINT,
  sanitizeOrbVoiceUserMessage
} from '../../lib/orb/voice/orb-voice-user-messages.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile home shell', () => {
  it('mobile home greeting is visible and uses strong heading tokens', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(companion, /data-orb-empty-heading-mobile/)
    assert.match(
      companion,
      /ORB_RESIDENTIAL_MOBILE_EMPTY_HEADING|personalisedEmptyHeading|orbPersonalisedGreeting|personalisedWelcomeMessage/
    )
    assert.match(mobileCss, /data-orb-empty-heading-mobile/)
    assert.match(mobileCss, /#0a1628|#f7faff/)
  })

  it('starter prompts render as premium cards not hidden on mobile', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(companion, /data-orb-starter-cards/)
    assert.match(companion, /data-orb-starter-card/)
    assert.match(mobileCss, /\[data-orb-starter-cards\]/)
    assert.match(mobileCss, /\[data-orb-starter-card\]/)
    assert.doesNotMatch(mobileCss, /\[data-orb-starter-cards\]\s*\{[^}]*display:\s*none/)
  })

  it('mobile layout avoids horizontal overflow on empty state', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(mobileCss, /overflow-x:\s*hidden/)
    assert.match(mobileCss, /max-width:\s*100vw/)
  })
})

describe('ORB mobile premium Dictate copy', () => {
  it('idle shows Start recording', () => {
    assert.equal(
      dictateMobilePrimaryButton({ dictateState: 'ready', recordingUiState: 'idle', hasTranscript: false }),
      'Start recording'
    )
    assert.match(
      dictateMobileStatusLine({
        dictateState: 'ready',
        recordingUiState: 'idle',
        hasTranscript: false,
        speechError: null,
        userStatus: null,
        listening: false
      }),
      /Ready to record/
    )
  })

  it('listening shows Stop recording', () => {
    assert.equal(
      dictateMobilePrimaryButton({ dictateState: 'listening', recordingUiState: 'recording', hasTranscript: false }),
      'Stop recording'
    )
    assert.equal(
      dictateMobileStatusLine({
        dictateState: 'listening',
        recordingUiState: 'recording',
        hasTranscript: false,
        speechError: null,
        userStatus: null,
        listening: true
      }),
      'Listening…'
    )
  })

  it('transcript ready shows Record more not Start speech transcript', () => {
    assert.equal(
      dictateMobilePrimaryButton({ dictateState: 'transcript_ready', recordingUiState: 'stopped', hasTranscript: true }),
      'Record more'
    )
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(dictate, /OrbDictateMobileExperience/)
    assert.match(mobile, /data-orb-dictate-primary-action/)
    assert.doesNotMatch(dictate, /Start speech transcript/)
    assert.doesNotMatch(mobile, /Start speech transcript/)
  })

  it('idle does not show old START grid by default on mobile', () => {
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(mobile, /data-orb-dictate-recording-options-toggle/)
    assert.match(mobile, /Recording options/)
    assert.match(station, /useOrbMobileViewport/)
    assert.match(station, /isMobile \?/)
    assert.doesNotMatch(mobile, /<h3[^>]*>Start<\/h3>/)
  })

  it('transcript ready shows captured transcript card and sticky generate', () => {
    assert.equal(dictateMobileShowsCapturedCard({ hasTranscript: true, dictateState: 'transcript_ready' }), true)
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(mobile, /data-orb-dictate-captured-card/)
    assert.match(mobile, /data-orb-dictate-generate-sticky/)
    assert.match(mobile, /data-orb-dictate-generate-idle/)
    assert.match(mobile, /disabled=\{generating \|\| !effectiveInputText\.trim\(\)\}/)
  })

  it('advanced transcript editing is collapsed by default', () => {
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(mobile, /Advanced transcript editing/)
    assert.match(mobile, /aria-expanded=\{mobileAdvancedOpen\}/)
    assert.doesNotMatch(mobile, /data-orb-dictate-advanced-body[\s\S]*mobileAdvancedOpen \? null/)
  })

  it('runtime mobile layout marker and desktop START grid split', () => {
    const hook = readComponent('components/orb-standalone/use-orb-responsive-mode.ts')
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')

    assert.match(hook, /MOBILE_MAX_WIDTH_PX = 768/)
    assert.match(hook, /width < MOBILE_MAX_WIDTH_PX/)
    assert.match(hook, /orientationchange/)
    assert.match(station, /data-orb-dictate-layout=\{/)
    assert.match(station, /mobile-runtime/)
    assert.match(station, /desktop-runtime/)
    assert.match(station, /isMobile \?/)
    assert.match(station, /<h3[^>]*>Start<\/h3>/)
    assert.doesNotMatch(station, /hidden min-h-0 flex-1 gap-4 overflow-hidden md:grid/)
    assert.doesNotMatch(station, /OrbDictateMobileExperience[\s\S]*md:hidden/)
    assert.doesNotMatch(station, /Start speech transcript/)
    assert.match(mobile, /mobileRecordingOpen \?/)
    assert.match(mobile, /Record debrief/)
    const beforeRecordingOptions = mobile.slice(0, mobile.indexOf('data-orb-dictate-recording-options-toggle'))
    assert.doesNotMatch(beforeRecordingOptions, /Record debrief/)
    assert.doesNotMatch(beforeRecordingOptions, /Dictate mode/)
    assert.doesNotMatch(beforeRecordingOptions, /Note type/)
  })

  it('technical realtime copy appears only with debugVoice', () => {
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(mobile, /isOrbVoiceDebugMode/)
    assert.match(mobile, /Realtime transcription ready/)
    assert.ok(isTechnicalDictateStatus('Start server realtime transcription'))
    const userFacing = mobile.replace(/voiceDebug[\s\S]*?Realtime transcription ready/g, '')
    assert.doesNotMatch(userFacing, /Start speech transcript/)
    assert.doesNotMatch(userFacing, /server realtime transcription/)
  })
})

describe('ORB mobile premium Voice copy', () => {
  it('idle shows one primary Start voice control', () => {
    assert.equal(voiceMobilePrimaryButton({ uiState: 'ready', sessionLive: false, starting: false }), 'Start voice')
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(voice, /OrbVoiceMobileExperience/)
    assert.match(mobile, /OrbVoiceActions/)
    assert.match(actions, /data-orb-voice-primary-action|orbVoiceUiPrimaryLabel/)
    assert.match(voice, /ORB_VOICE_PANEL_SUBTITLE/)
  })

  it('provider unavailable shows Use Dictate and Type instead via shared actions', () => {
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const actions = readComponent('components/orb-standalone/orb-voice-actions.tsx')
    assert.match(mobile, /OrbVoiceActions/)
    assert.match(actions, /data-orb-voice-use-dictate/)
    assert.match(mobile, /data-orb-voice-type-instead/)
    assert.doesNotMatch(mobile, /data-orb-voice-open-dictate/)
    assert.equal(
      voiceMobileStatusLine({ uiState: 'provider_unavailable', blockedReason: null }),
      'Live voice could not connect.'
    )
    assert.equal(
      voiceMobileUnavailableDetail(true),
      'You can still type to ORB or use Dictate.'
    )
  })

  it('does not expose env var names unless debugVoice', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    const messages = readComponent('lib/orb/voice/orb-voice-user-messages.ts')
    assert.match(voice, /sanitizeOrbVoiceUserMessage/)
    assert.match(mobile, /resolveOrbVoiceUiState|orb-voice-ui-state/)
    assert.match(messages, /ORB_VOICE_DEBUG_CONFIG_HINT/)
    assert.equal(
      sanitizeOrbVoiceUserMessage('Set OPENAI_API_KEY and ORB_REALTIME_ENABLED=true', { debug: false }),
      'You can still use Dictate or type to ORB.'
    )
    assert.equal(
      sanitizeOrbVoiceUserMessage('Set OPENAI_API_KEY and ORB_REALTIME_ENABLED=true', {
        debug: false,
        dictateRealtimeReady: true
      }),
      'You can still type to ORB or use Dictate.'
    )
    assert.match(sanitizeOrbVoiceUserMessage('Set OPENAI_API_KEY', { debug: true }) ?? '', /OPENAI_API_KEY/)
    assert.doesNotMatch(voice, /OPENAI_API_KEY/)
    assert.match(messages, /Realtime voice not configured/)
  })

  it('active session shows one End via primary action wiring', () => {
    assert.equal(voiceMobilePrimaryButton({ uiState: 'listening', sessionLive: true, starting: false }), 'End')
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.match(readComponent('components/orb-standalone/orb-voice-station.tsx'), /if \(voiceSessionLive\) handleEnd\(\)/)
  })

  it('post-session shows Dictate copy and new conversation without duplicate fallbacks', () => {
    const mobile = readComponent('components/orb-standalone/orb-voice-mobile-experience.tsx')
    assert.match(mobile, /data-orb-voice-post-session/)
    assert.match(mobile, /Send to Dictate/)
    assert.match(mobile, /Copy transcript/)
    assert.match(mobile, /Start new voice conversation|New conversation/)
    assert.doesNotMatch(mobile, /Open Dictate instead/)
    assert.doesNotMatch(mobile, /Open Dictate again/)
  })
})

describe('ORB mobile shell and composer', () => {
  it('composer mic opens Dictate by default on mobile', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /return 'dictate'/)
    assert.match(companion, /openOrbDictatePanel\(\)/)
    assert.doesNotMatch(companion, /Start speech transcript when you are ready/)
    assert.match(companion, /Open ORB Dictate/)
  })

  it('no duplicate conflicting mic buttons in mobile composer rail', () => {
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    const micButtons = (composer.match(/<button[^>]*data-orb-composer-mic/g) || []).length
    assert.ok(micButtons >= 1 && micButtons <= 2, 'compact and desktop layouts each expose one mic control')
    assert.match(mobileCss, /data-orb-composer-mic/)
  })

  it('mobile product tokens are defined', () => {
    const tokens = readComponent('app/orb/orb-premium-tokens.css')
    for (const name of [
      '--orb-mobile-bg',
      '--orb-mobile-card',
      '--orb-primary-blue',
      '--orb-text',
      '--orb-muted'
    ]) {
      assert.match(tokens, new RegExp(name))
    }
  })
})

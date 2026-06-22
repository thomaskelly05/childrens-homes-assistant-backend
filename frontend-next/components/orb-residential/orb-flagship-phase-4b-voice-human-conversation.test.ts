import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  ORB_KATHERINE_VOICE_DESCRIPTION,
  ORB_KATHERINE_VOICE_ID,
  ORB_VOICE_PAUSE_CONVERSATION,
  ORB_VOICE_RESET_CONVERSATION,
  ORB_VOICE_SLOW_THINKING_MESSAGE,
  ORB_VOICE_STOP_ORB
} from '../../lib/orb/voice/orb-voice-human-conversation.ts'
import {
  ORB_VOICE_ADULT_REVIEW_LABEL,
  ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE,
  ORB_VOICE_BUTTON_START,
  ORB_VOICE_BUTTON_STOP_LISTENING,
  ORB_VOICE_BUTTON_STOP_ORB,
  ORB_VOICE_BUTTON_THINKING,
  ORB_VOICE_CONVERSATION_SUBLABEL,
  ORB_VOICE_MIC_ERROR
} from '../../lib/orb/voice/orb-voice-reflective-copy.ts'
import { DEFAULT_ORB_VOICE_PROFILE_ID } from '../../lib/orb/voice/orb-voice-profiles.ts'
import { orbVoiceUiPrimaryLabel } from '../../lib/orb/voice/orb-voice-ui-state.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 4B Voice human conversation', () => {
  it('build version marker is phase-5i-voice-showstopper-convergence', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5i-voice-showstopper-convergence')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('single primary voice station and conversation path', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /orb-voice-station/)
    assert.match(station, /useOrbVoiceV2/)
    assert.match(hook, /requestOrbVoiceV2Respond/)
    assert.match(station, /data-orb-voice-conversation-panel/)
    assert.doesNotMatch(station, /orb-voice-station-duplicate/i)
  })

  it('Katherine is primary ORB voice with server TTS mapping', () => {
    const profiles = read('lib/orb/voice/orb-voice-profiles.ts')
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    const tts = read('../services/orb_voice_tts_service.py')
    assert.equal(DEFAULT_ORB_VOICE_PROFILE_ID, ORB_KATHERINE_VOICE_ID)
    assert.match(profiles, /id: 'katherine'/)
    assert.match(profiles, /ORB voice: Katherine/)
    assert.equal(ORB_KATHERINE_VOICE_DESCRIPTION, 'ORB voice: Katherine — British, calm and professional')
    assert.match(hook, /resolveTtsVoiceProfileId/)
    assert.match(hook, /requestOrbPremiumTts/)
    assert.match(tts, /"katherine"/)
  })

  it('graceful TTS fallback when premium voice unavailable', () => {
    const hook = read('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /browser_fallback/)
    assert.match(hook, /speechSynthesis/)
    assert.match(hook, /useBrowserFallback/)
  })

  it('turn-taking controls use Phase 4B labels', () => {
    const uiState = read('lib/orb/voice/orb-voice-ui-state.ts')
    const live = read('components/orb-standalone/orb-voice-live-panel.tsx')
    assert.equal(ORB_VOICE_BUTTON_START, 'Start conversation')
    assert.equal(ORB_VOICE_BUTTON_STOP_LISTENING, 'Stop')
    assert.equal(ORB_VOICE_BUTTON_THINKING, 'ORB is thinking…')
    assert.equal(ORB_VOICE_BUTTON_STOP_ORB, 'Stop ORB')
    assert.equal(orbVoiceUiPrimaryLabel('speaking'), 'Stop ORB')
    assert.match(uiState, /Listening…/)
    assert.match(live, /ORB is responding…/)
    assert.match(live, /ORB_VOICE_STOP_ORB/)
  })

  it('conversation transcript uses Adult and ORB labels', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /Adult/)
    assert.match(station, /ORB/)
    assert.match(station, /ORB_VOICE_V2_TRANSCRIPT_NOTE/)
  })

  it('auto speak and slow thinking are wired in voice v2 hook', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.match(hook, /transitionState\('thinking'\)/)
    assert.match(hook, /voicePreparing/)
  })

  it('pause, reset and stop ORB controls exist', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(station, /pauseConversation/)
    assert.match(station, /resetLiveSession/)
    assert.match(station, /stopOrbAudio/)
    assert.match(hook, /pauseConversation/)
    assert.match(hook, /resetLiveSession/)
    assert.match(hook, /stopOrbAudio/)
  })

  it('summary and handoff preserve voice metadata', () => {
    const handoff = read('lib/orb/voice-v2/orb-voice-v2-summary.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(handoff, /selectedVoice/)
    assert.match(handoff, /audioStored: false/)
    assert.match(handoff, /conversationTranscript/)
    assert.match(station, /handoffPayload/)
    assert.equal(ORB_VOICE_ADULT_REVIEW_LABEL, 'Generated for adult review')
  })

  it('voice settings show Katherine and audio not stored', () => {
    const settings = read('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(settings, /Katherine/)
    assert.match(settings, /ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE/)
    assert.match(ORB_VOICE_AUDIO_TRANSCRIPT_REVIEW_NOTE, /Audio is not stored/)
    assert.match(settings, /push-to-talk/i)
  })

  it('mic error copy and reduced motion respected', () => {
    const uiState = read('lib/orb/voice/orb-voice-ui-state.ts')
    const head = read('components/orb-residential/orb-voice-head.tsx')
    assert.equal(ORB_VOICE_MIC_ERROR, 'Voice could not start. Check microphone permission or type your reflection instead.')
    assert.match(uiState, /ORB_VOICE_MIC_ERROR/)
    assert.match(head, /prefers-reduced-motion/)
  })

  it('single shell CSS import and no compliance guarantee language', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(shell, /phase-5i-voice-showstopper-convergence/)
    assert.doesNotMatch(station, /Ofsted approved|compliance guarantee/i)
    assert.doesNotMatch(station, /ORB makes safeguarding decisions/i)
  })
})

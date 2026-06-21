import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { detectSpeechRecognitionSupported } from '../../lib/orb/voice/orb-voice-readiness.ts'
import { resolveOrbVoiceLaunchUiState } from '../../lib/orb/voice/orb-voice-launch-mode.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Voice start fix — shell marker', () => {
  it('canonical data-orb-shell is only on OrbShell wrapper', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(shell, /data-orb-shell="true"/)
    assert.match(companion, /data-orb-companion-root="true"/)
    assert.doesNotMatch(companion, /data-orb-shell="true"/)
  })
})

describe('ORB Voice start fix — WebKit speech recognition', () => {
  it('detectSpeechRecognitionSupported checks webkitSpeechRecognition', () => {
    const readiness = readComponent('lib/orb/voice/orb-voice-readiness.ts')
    assert.match(readiness, /w\.SpeechRecognition \|\| w\.webkitSpeechRecognition/)
    const hook = readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /w\.SpeechRecognition \|\| w\.webkitSpeechRecognition/)
  })

  it('Safari-style window is treated as supported in tests', () => {
    const original = globalThis.window
    try {
      ;(globalThis as { window?: Window }).window = {
        isSecureContext: true,
        webkitSpeechRecognition: function MockRecognition() {
          return {}
        }
      } as unknown as Window
      assert.equal(detectSpeechRecognitionSupported(), true)
    } finally {
      ;(globalThis as { window?: Window }).window = original
    }
  })
})

describe('ORB Voice start fix — start click path', () => {
  const station = () => readComponent('components/orb-standalone/orb-voice-station.tsx')
  const legacyHook = () => readComponent('components/orb-standalone/use-standalone-orb-voice.ts')
  const hook = () => readComponent('lib/orb/voice-v2/use-orb-voice-v2.ts')

  it('Start click routes through handlePrimary and startConversation', () => {
    assert.match(station(), /handlePrimary/)
    assert.match(station(), /voice\.startConversation/)
    assert.match(hook(), /startConversation/)
    assert.match(station(), /data-orb-voice-start-conversation/)
  })

  it('v2 capture starts without legacy browser/realtime branch', () => {
    assert.match(hook(), /startOrbVoiceV2Capture/)
    assert.match(hook(), /fetchOrbVoiceV2Status/)
    assert.doesNotMatch(station(), /handleBrowserVoicePrimary/)
  })

  it('capture start is not delayed by pre-unlock audio awaits', () => {
    const hookSrc = hook()
    assert.doesNotMatch(hookSrc, /await preUnlock\.play\(\)/)
    assert.match(hookSrc, /startOrbVoiceV2Capture/)
  })

  it('optimistic requesting_microphone state prevents idle UI after click', () => {
    assert.match(hook(), /transitionState\('requesting_microphone'\)/)
    assert.match(station(), /requesting_microphone/)
  })

  it('voice station uses v2 hook and capture loop', () => {
    assert.match(station(), /useOrbVoiceV2/)
    assert.match(hook(), /startOrbVoiceV2Capture/)
    assert.match(hook(), /captureRef\.current\?\.dispose/)
  })

  it('mic errors surface typed fallback in v2 hook', () => {
    assert.match(hook(), /ORB_VOICE_V2_TRANSCRIPTION_ERROR/)
    assert.match(hook(), /setShowTypeFallback\(true\)/)
  })

  it('immediate UI uses v2 connecting copy', () => {
    assert.match(readComponent('lib/orb/voice-v2/orb-voice-v2-state.ts'), /Requesting microphone…/)
    assert.match(hook(), /transitionState\('requesting_microphone'\)/)
  })

  it('launch UI maps requesting_permission to starting state', () => {
    assert.equal(
      resolveOrbVoiceLaunchUiState({
        launchMode: 'browser_ptt',
        captureState: 'requesting_permission',
        phase: 'idle',
        listening: false,
        speaking: false
      }),
      'starting'
    )
  })

  it('voice station exposes v2 ui state markers', () => {
    assert.match(station(), /data-orb-voice-ui-state=\{voice\.state\}/)
    assert.match(station(), /data-orb-voice-v2/)
    assert.match(station(), /data-orb-voice-primary/)
  })

  it('station wires handlePrimary on start conversation button', () => {
    assert.match(station(), /onClick=\{handlePrimary\}/)
    assert.match(station(), /data-orb-voice-start-conversation/)
  })

  it('legacy standalone hook still guards empty recognition', () => {
    assert.match(legacyHook(), /ORB_VOICE_NO_HEAR_MESSAGE/)
  })
})

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
  const actions = () => readComponent('components/orb-standalone/orb-voice-actions.tsx')
  const hook = () => readComponent('components/orb-standalone/use-standalone-orb-voice.ts')

  it('Start click emits debug events through handlePrimary and handleStart', () => {
    const events = [
      'voice_start_click_received',
      'voice_start_handle_primary_called',
      'voice_start_handle_start_called',
      'voice_start_capabilities',
      'voice_start_branch_selected',
      'voice_start_attempt_browser_fallback',
      'voice_start_browser_fallback_start_called',
      'voice_start_browser_fallback_success',
      'voice_start_browser_fallback_failed',
      'voice_start_unsupported_visible',
      'voice_start_realtime_attempt',
      'voice_start_realtime_failed',
      'voice_start_noop_prevented'
    ]
    const sources = `${actions()}\n${station()}`
    for (const event of events) {
      assert.match(sources, new RegExp(event))
    }
  })

  it('handleStart calls handleBrowserVoicePrimary when realtime unavailable', () => {
    assert.match(station(), /!realtimeVoiceReady[\s\S]*handleBrowserVoicePrimary/)
    assert.match(station(), /voice_start_branch_selected[\s\S]*browser_fallback_no_realtime/)
  })

  it('browser launch path is not delayed by pre-unlock audio awaits', () => {
    const body = station().match(/async function handleStart\(\)[\s\S]*?async function handleBrowserVoicePrimary/m)?.[0] ?? ''
    const browserBranch = body.indexOf("branch: 'browser_launch'")
    const fallbackBranch = body.indexOf("branch: 'browser_fallback_no_realtime'")
    const firstAudioAwait = body.indexOf('await preUnlock.play()')
    assert.ok(browserBranch >= 0)
    assert.ok(fallbackBranch >= 0)
    assert.equal(firstAudioAwait, -1, 'browser SpeechRecognition start must not be preceded by awaited audio unlock')
  })

  it('browser fallback has an optimistic starting launch state so the UI cannot stay ready after click', () => {
    assert.match(station(), /BrowserStartStage/)
    assert.match(station(), /browserStartStage === 'starting'[\s\S]*\? 'starting'/)
    assert.match(station(), /setBrowserStartStage\('starting'\)/)
  })

  it('browser voice requests microphone permission before starting recognition', () => {
    const body = hook().match(/const beginUserVoiceCapture[\s\S]*?^  const endDictateSpeechCapture/m)?.[0] ?? ''
    const micRequest = body.indexOf('const granted = await requestMicrophonePermission')
    const firstStart = body.indexOf('const startResult = await startRecognitionSessionConfirmed')
    assert.ok(micRequest >= 0)
    assert.ok(firstStart >= 0)
    assert.ok(micRequest < firstStart, 'mic permission must precede recognition start')
    assert.match(body, /captureMode: 'active' \| 'continuous' = 'continuous'/)
  })

  it('mic permission is requested on fallback after recognition start fails', () => {
    assert.match(hook(), /setVoiceCaptureState\('requesting_permission'\)/)
    assert.match(hook(), /ORB_VOICE_MIC_BLOCKED_MESSAGE/)
  })

  it('immediate UI uses staged opening copy', () => {
    assert.match(station(), /Opening microphone…/)
    assert.match(hook(), /setVoiceCaptureState\('starting'\)/)
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

  it('empty recognition shows visible no-hear message', () => {
    assert.match(hook(), /ORB_VOICE_NO_HEAR_MESSAGE/)
    assert.match(hook(), /I didn't catch that\. Try again or use Chat\./)
  })

  it('voice station exposes launch and error data markers', () => {
    assert.match(station(), /data-orb-voice-launch-state/)
    assert.match(station(), /data-orb-voice-browser-supported/)
    assert.match(station(), /data-orb-voice-mic-permission/)
    assert.match(station(), /data-orb-voice-start-error/)
  })

  it('OrbVoiceActions wires handlePrimary to onPrimary for ready state', () => {
    assert.match(actions(), /onClick=\{handlePrimary\}/)
    assert.match(station(), /onPrimary=\{\(\) => void handleStart\(\)\}/)
  })
})

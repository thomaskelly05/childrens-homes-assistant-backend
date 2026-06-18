import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  isOrbWebRealtimeVoiceEnabled,
  ORB_WEB_REALTIME_DISABLED_REASON,
  ORB_WEB_REALTIME_VOICE_ENABLED
} from './orb-web-voice-config.ts'
import { resolveOrbVoiceLaunchMode } from './orb-voice-launch-mode.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const configuredRealtime = {
  ok: true,
  realtime_enabled: true,
  provider: 'openai',
  reason: 'configured' as const
}

describe('ORB web voice config — residential launch', () => {
  it('realtime voice is disabled by default for ORB Residential web', () => {
    assert.equal(ORB_WEB_REALTIME_VOICE_ENABLED, false)
    assert.equal(isOrbWebRealtimeVoiceEnabled(), false)
  })

  it('launch mode stays browser when backend realtime is configured', () => {
    assert.equal(
      resolveOrbVoiceLaunchMode({
        realtimeStatus: configuredRealtime,
        recognitionAvailable: true,
        synthesisAvailable: true,
        liveVoiceAllowed: true
      }),
      'browser_ptt'
    )
  })

  it('voice station forces browser path when realtime launch is disabled', () => {
    const station = readSource('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /isOrbWebRealtimeVoiceEnabled\(\)/)
    assert.match(station, /browser_speech_recognition/)
    assert.match(station, /ORB_WEB_REALTIME_DISABLED_REASON/)
  })

  it('ORB_VOICE_DIAG exposes residential browser capture fields', () => {
    const diag = readSource('lib/orb/voice/orb-voice-diag.ts')
    assert.match(diag, /realtimeAttempted/)
    assert.match(diag, /realtimeDisabledReason/)
    assert.match(diag, /voiceCaptureMode/)
    assert.match(diag, /dictateCaptureAvailable/)
    assert.match(diag, /recognitionStartCount/)
    assert.match(diag, /orbBrainAttempted/)
    assert.match(diag, /ttsProvider/)
  })

  it('disabled reason constant matches product copy', () => {
    assert.equal(ORB_WEB_REALTIME_DISABLED_REASON, 'disabled_for_orb_residential_launch')
  })
})

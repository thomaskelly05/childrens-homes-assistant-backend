import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_VOICE_V2_ACKNOWLEDGEMENTS,
  ORB_VOICE_V2_BARGE_IN_COPY,
  ORB_VOICE_V2_THINKING_COPY,
  mapVoiceStateToShowstopperWave,
  pickOrbVoiceV2Acknowledgement,
  resolveSpeakVoiceId,
  traceOrbVoiceV2BargeIn
} from './orb-voice-v2-showstopper.ts'

describe('ORB Voice v2 showstopper helpers', () => {
  it('wave state mapping covers live states', () => {
    assert.equal(mapVoiceStateToShowstopperWave('idle'), 'idle')
    assert.equal(mapVoiceStateToShowstopperWave('listening'), 'listening')
    assert.equal(mapVoiceStateToShowstopperWave('thinking'), 'thinking')
    assert.equal(mapVoiceStateToShowstopperWave('speaking'), 'speaking')
    assert.equal(mapVoiceStateToShowstopperWave('interrupted'), 'interrupted')
    assert.equal(mapVoiceStateToShowstopperWave('summary_ready'), 'summary')
    assert.equal(mapVoiceStateToShowstopperWave('error'), 'error')
  })

  it('acknowledgement rotates and avoids immediate repeat', () => {
    const first = pickOrbVoiceV2Acknowledgement([])
    assert.ok(ORB_VOICE_V2_ACKNOWLEDGEMENTS.includes(first as (typeof ORB_VOICE_V2_ACKNOWLEDGEMENTS)[number]))
    const second = pickOrbVoiceV2Acknowledgement([first])
    assert.notEqual(second, first)
  })

  it('unconfigured voice falls back to Katherine with notice', () => {
    const resolved = resolveSpeakVoiceId('alex', true)
    assert.equal(resolved.voice, 'katherine')
    assert.match(resolved.fallbackNotice ?? '', /not configured yet/)
  })

  it('thinking and barge-in copy are stable', () => {
    assert.equal(ORB_VOICE_V2_THINKING_COPY, 'Thinking this through…')
    assert.match(ORB_VOICE_V2_BARGE_IN_COPY, /listening/i)
  })

  it('barge-in trace emits safe event only', () => {
    const logs: unknown[] = []
    const original = console.debug
    console.debug = (...args: unknown[]) => {
      logs.push(args)
    }
    try {
      traceOrbVoiceV2BargeIn()
      assert.equal(logs.length, 1)
      const payload = logs[0] as unknown[]
      assert.deepEqual(payload[1], { event: 'orb_voice_v2_barge_in' })
    } finally {
      console.debug = original
    }
  })
})

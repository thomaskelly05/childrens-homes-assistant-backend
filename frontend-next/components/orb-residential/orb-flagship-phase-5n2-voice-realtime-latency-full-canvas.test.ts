import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import {
  VOICE_FAST_MAX_WORDS,
  VOICE_TTS_CHAR_SOFT_CAP
} from '../../lib/orb/voice-v2/orb-voice-v2-spoken-compression.ts'
import {
  ORB_VOICE_V2_ACKNOWLEDGEMENTS,
  ORB_VOICE_V2_THINKING_COPY
} from '../../lib/orb/voice-v2/orb-voice-v2-showstopper.ts'
import {
  isOrbVoiceWebRtcMode,
  isOrbVoiceWebRtcSupported,
  resolveOrbVoiceRealtimeMode,
  resolveOrbVoiceRealtimeSetupCaptureLabel
} from '../../lib/orb/voice-v2/orb-voice-v2-realtime-beta.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 5N.2 Voice realtime latency and full canvas', () => {
  it('build marker is phase-5n2-voice-realtime-latency-full-canvas', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5n2-voice-realtime-latency-full-canvas')
    assert.match(read('app/orb/orb-residential-shell.css'), /phase-5n2-voice-realtime-latency-full-canvas/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('Voice full canvas removes max-width and centred card constraints', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(content, /max-w-none/)
    assert.match(content, /items-stretch/)
    assert.doesNotMatch(content, /max-w-\[88rem\]/)
    assert.match(shell, /min-height: calc\(100vh - 76px\)/)
    assert.match(shell, /max-width: none/)
    assert.match(shell, /border: none/)
  })

  it('main canvas uses full available width and integrated grid', () => {
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(shell, /min-height: calc\(100vh - 150px\)/)
    assert.match(shell, /border-radius: clamp\(28px, 3vw, 48px\)/)
    assert.match(shell, /grid-template-columns: minmax\(0, 1fr\) clamp\(380px, 28vw, 460px\)/)
    assert.match(read('components/orb-standalone/orb-voice-station-content.tsx'), /orb-voice-full-canvas-grid/)
  })

  it('right rail integrated width 380–460px on desktop', () => {
    const content = read('components/orb-standalone/orb-voice-station-content.tsx')
    const shell = read('app/orb/orb-residential-shell.css')
    assert.match(content, /md:min-w-\[23\.75rem\]/)
    assert.match(content, /md:max-w-\[28\.75rem\]/)
    assert.match(shell, /min-width: 380px/)
    assert.match(shell, /max-width: 460px/)
    assert.match(read('components/orb-standalone/orb-voice-live-rail.tsx'), /h-full/)
  })

  it('immediate acknowledgement pool is safe and local', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.ok(ORB_VOICE_V2_ACKNOWLEDGEMENTS.length >= 4)
    for (const phrase of ORB_VOICE_V2_ACKNOWLEDGEMENTS) {
      assert.doesNotMatch(phrase, /diagnos|safeguarding decision|guarantee/i)
    }
    assert.match(hook, /fireInstantAcknowledgement/)
    assert.match(hook, /onEndOfTurnFromTranscript[\s\S]{0,400}fireInstantAcknowledgement/)
  })

  it('thinking copy appears before backend response completes', () => {
    assert.equal(ORB_VOICE_V2_THINKING_COPY, 'ORB is thinking this through')
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /transitionState\('thinking'\)/)
    const block = hook.slice(
      hook.indexOf('onEndOfTurnFromTranscript'),
      hook.indexOf('onEndOfTurnFromAudio')
    )
    assert.match(block, /fireInstantAcknowledgement\(\)/)
    assert.match(block, /transitionState\('thinking'\)/)
  })

  it('written answer renders before TTS audio path in commit flow', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const commitStart = hook.indexOf('const commitAdultTurn = useCallback')
    const commitEnd = hook.indexOf('const commitAdultTurnRef = useRef', commitStart)
    const commitBlock = hook.slice(commitStart, commitEnd)
    const writtenIndex = commitBlock.indexOf("createOrbVoiceV2Turn('orb', writtenReply)")
    const speakIndex = commitBlock.indexOf('speakReplyRef.current')
    assert.ok(writtenIndex > -1 && speakIndex > writtenIndex)
    assert.doesNotMatch(commitBlock, /transitionState\('speaking'\)[\s\S]{0,80}speakReplyRef/)
  })

  it('TTS uses compressed spoken reply capped at 180 chars', () => {
    assert.equal(VOICE_TTS_CHAR_SOFT_CAP, 180)
    assert.equal(VOICE_FAST_MAX_WORDS, 40)
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /spokenReply/)
    assert.match(hook, /writtenReply/)
    assert.match(read('../services/orb_voice_respond_service.py'), /writtenReply/)
    assert.match(read('../services/orb_voice_respond_service.py'), /spokenReply/)
  })

  it('WebRTC mode is selected when status available and browser supports it', () => {
    const status = {
      available: true,
      provider: 'openai',
      mode: 'webrtc',
      model: 'gpt-realtime',
      transcriptionModel: 'whisper-1',
      transport: 'openai_realtime'
    } as const
    assert.equal(
      resolveOrbVoiceRealtimeMode(status, true, true),
      'webrtc'
    )
    assert.ok(isOrbVoiceWebRtcMode('webrtc'))
    assert.match(
      resolveOrbVoiceRealtimeSetupCaptureLabel('webrtc', 'Realtime available'),
      /WebRTC capture/
    )
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /startOrbVoiceV2RealtimeWebRtcCapture/)
    assert.match(hook, /orb_voice_realtime_mode_selected/)
  })

  it('WebRTC failure falls back safely without care content in traces', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    const webrtc = read('lib/orb/voice-v2/orb-voice-v2-realtime-webrtc-capture.ts')
    const trace = read('lib/orb/voice-v2/orb-voice-v2-realtime-trace.ts')
    assert.match(hook, /orb_voice_realtime_fallback/)
    assert.match(webrtc, /traceOrbVoiceRealtime\('orb_voice_realtime_session_started'\)/)
    assert.match(webrtc, /traceOrbVoiceRealtime\('orb_voice_realtime_partial_received'\)/)
    assert.match(webrtc, /traceOrbVoiceRealtime\('orb_voice_realtime_final_received'\)/)
    assert.doesNotMatch(trace, /console\.debug\([\s\S]*transcript/i)
    assert.equal(
      resolveOrbVoiceRealtimeMode({ available: false } as never, true, isOrbVoiceWebRtcSupported()),
      'fallback'
    )
  })

  it('barge-in stops active audio and Katherine remains', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /stopOrbAudio/)
    assert.match(hook, /speakGenerationRef/)
    assert.match(hook, /traceOrbVoiceV2BargeIn/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-client.ts'), /\/orb\/voice\/v2\/speak/)
    assert.match(read('../services/orb_voice_v2_service.py'), /katherine/i)
  })

  it('v2 fallback specialist brain and save routes remain', () => {
    const client = read('lib/orb/voice-v2/orb-voice-v2-client.ts')
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(client, /\/orb\/voice\/v2\/transcribe/)
    assert.match(client, /\/orb\/voice\/v2\/respond/)
    assert.match(client, /\/orb\/voice\/v2\/status/)
    assert.match(read('lib/orb/voice-v2/orb-voice-v2-realtime-client.ts'), /\/orb\/voice\/realtime\/status/)
    assert.match(station, /Records & Drafts/)
    assert.match(read('../services/orb_voice_brain_router_service.py'), /voice_specialist/)
    assert.doesNotMatch(read('lib/orb/voice-v2/orb-voice-v2-copy.ts'), /compliance guarantee|ofsted approved/i)
  })

  it('single shell CSS import and no duplicate Voice station', () => {
    const layout = read('app/orb/layout.tsx')
    const matches = layout.match(/orb-residential-shell\.css/g) ?? []
    assert.equal(matches.length, 1)
    assert.doesNotMatch(read('components/orb-standalone/orb-workspace-frame.tsx'), /OrbVoiceStation[\s\S]*OrbVoiceStation/)
  })
})

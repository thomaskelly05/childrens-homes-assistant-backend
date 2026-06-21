import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readLib(relativePath: string) {
  return readFileSync(join(root, 'lib', relativePath), 'utf8')
}

describe('ORB OpenAI realtime voice response flow', () => {
  const webrtcClient = readLib('orb/voice/orb-openai-realtime-webrtc-client.ts')
  const network = readLib('orb/network/index.ts')
  const diag = readLib('orb/voice/orb-voice-diag.ts')
  const debug = readLib('orb/orb-client-debug.ts')
  const audio = readLib('orb/audio/index.ts')
  const station = readFileSync(join(root, 'components/orb-standalone/orb-voice-station.tsx'), 'utf8')

  it('defers network session.update until voice client sends supported config', () => {
    assert.match(network, /deferInitialSessionUpdate/)
    assert.match(webrtcClient, /deferInitialSessionUpdate: true/)
    assert.match(webrtcClient, /voice_session_update_sent/)
    assert.match(webrtcClient, /REALTIME_AUDIO_OUTPUT_MODALITIES = \['audio'\]/)
    assert.match(webrtcClient, /modalities: this\.transcriptionOnly \? \['text'\] : \[\.\.\.REALTIME_AUDIO_OUTPUT_MODALITIES\]/)
    assert.doesNotMatch(webrtcClient, /modalities: this\.transcriptionOnly \? \['text'\] : \['audio', 'text'\]/)
    assert.match(webrtcClient, /create_response: !this\.transcriptionOnly/)
  })

  it('dictate remains transcription-only', () => {
    const dictate = readLib('orb/dictate/orb-dictate-realtime.ts')
    assert.match(dictate, /transcriptionOnly: true/)
    assert.match(webrtcClient, /transcriptionOnly \? \['text'\]/)
  })

  it('sends response.create fallback after speech stopped when server VAD does not auto-create', () => {
    assert.match(webrtcClient, /voice_response_create_sent/)
    assert.match(webrtcClient, /scheduleResponseCreateFallback/)
    assert.match(webrtcClient, /input_audio_buffer\.speech_stopped/)
    assert.match(webrtcClient, /server_vad_fallback/)
  })

  it('resets responseCreateSent guard so later turns can send response.create', () => {
    assert.match(webrtcClient, /responseCreateSent = false/)
    assert.match(webrtcClient, /voice_response_ready_for_next_turn/)
    assert.match(webrtcClient, /markResponseReady/)
    assert.match(
      webrtcClient,
      /input_audio_buffer\.speech_started[\s\S]*markResponseReady\('speech_started'\)/
    )
    assert.match(
      webrtcClient,
      /case 'response\.done':[\s\S]*markResponseReady\('response_done'\)/
    )
    assert.match(
      webrtcClient,
      /case 'error':[\s\S]*markResponseReady\('error'\)/
    )
    assert.match(
      webrtcClient,
      /interrupt\(\)[\s\S]*markResponseReady\('interrupt'\)/
    )
  })

  it('response.create uses audio-only output_modalities not response.modalities or audio plus text', () => {
    assert.match(webrtcClient, /output_modalities: \[\.\.\.REALTIME_AUDIO_OUTPUT_MODALITIES\]/)
    assert.match(webrtcClient, /output_modalities: REALTIME_AUDIO_OUTPUT_MODALITIES/)
    assert.doesNotMatch(webrtcClient, /response:\s*\{\s*modalities:/)
    assert.doesNotMatch(webrtcClient, /output_modalities:\s*\['audio',\s*'text'\]/)
    assert.match(webrtcClient, /speakAssistantReply/)
    assert.match(
      webrtcClient,
      /speakAssistantReply[\s\S]*output_modalities:\s*\[\.\.\.REALTIME_AUDIO_OUTPUT_MODALITIES\]/
    )
  })

  it('marks committed and conversation item events as handled', () => {
    for (const event of [
      'input_audio_buffer.committed',
      'conversation.item.added',
      'conversation.item.done'
    ]) {
      assert.match(webrtcClient, new RegExp(`'${event.replace(/\./g, '\\.')}'`))
    }
  })

  it('handles GA realtime event names for state and bubbles', () => {
    for (const event of [
      'input_audio_buffer.speech_started',
      'input_audio_buffer.speech_stopped',
      'response.created',
      'response.audio_transcript.delta',
      'response.done',
      'error'
    ]) {
      assert.match(webrtcClient, new RegExp(event.replace(/\./g, '\\.')))
    }
    assert.match(webrtcClient, /onAssistantDelta/)
    assert.match(webrtcClient, /onFinalTranscript/)
    assert.match(webrtcClient, /voice_realtime_event_unhandled/)
  })

  it('records audio play attempt and success or failure', () => {
    assert.match(network, /voice_audio_play_attempt/)
    assert.match(network, /voice_audio_play_success/)
    assert.match(network, /voice_audio_play_failed/)
    assert.match(audio, /audio\.muted = false/)
    assert.match(audio, /audio\.volume = 1/)
  })

  it('ORB_VOICE_DIAG includes audio and transcript details', () => {
    assert.match(diag, /lastRawEventTypes/)
    assert.match(diag, /responseCreateSent/)
    assert.match(diag, /sessionUpdateSent/)
    assert.match(diag, /userTranscriptLength/)
    assert.match(diag, /assistantTranscriptLength/)
    assert.match(diag, /audioPlayAttempted/)
    assert.match(diag, /remoteAudioMuted/)
    assert.match(diag, /localMicTrackEnabled/)
  })

  it('ORB_VOICE_EVENTS_ONLY and ORB_VOICE_RESET_DEBUG helpers exist', () => {
    assert.match(diag, /ORB_VOICE_EVENTS_ONLY/)
    assert.match(diag, /ORB_VOICE_RESET_DEBUG/)
    assert.match(debug, /getOrbVoiceDebugEventsOnly/)
    assert.match(debug, /clearOrbVoiceDebugEvents/)
  })

  it('voice station unlocks audio via v2 speak path', () => {
    const content = readFileSync(join(root, 'components/orb-standalone/orb-voice-station-content.tsx'), 'utf8')
    const hook = readFileSync(join(root, 'lib/orb/voice-v2/use-orb-voice-v2.ts'), 'utf8')
    assert.match(hook, /requestOrbVoiceV2Speak/)
    assert.match(hook, /playOrbVoiceV2Audio|unlockOrbVoiceV2AudioPlayback/)
    assert.match(station, /ORB_VOICE_V2_PREPARING_VOICE|voicePreparing/)
    assert.match(content, /data-orb-voice-station-content/)
  })

  it('flight recorder events exist after transport live', () => {
    for (const event of [
      'voice_session_update_sent',
      'voice_response_create_sent',
      'voice_input_audio_started',
      'voice_input_audio_stopped',
      'voice_user_transcript_delta',
      'voice_user_transcript_done',
      'voice_response_created',
      'voice_response_output_item_added',
      'voice_response_audio_delta',
      'voice_assistant_transcript_delta',
      'voice_response_done',
      'voice_server_error'
    ]) {
      assert.match(`${webrtcClient}\n${network}\n${diag}`, new RegExp(event))
    }
  })
})
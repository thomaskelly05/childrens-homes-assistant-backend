import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  isSafariRecognitionNoSpeechError,
  promoteInterimTranscriptCommitted,
  recognitionErrorUserMessage,
  resolveBrowserSpeechCaptureText
} from './orb-browser-speech-capture.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-browser-speech-capture', () => {
  it('promotes interim transcript when final is empty', () => {
    assert.equal(
      promoteInterimTranscriptCommitted('', 'help me write a record'),
      'help me write a record'
    )
  })

  it('resolves capture text from interim when committed is empty', () => {
    assert.equal(
      resolveBrowserSpeechCaptureText({
        transcript: '',
        interimTranscript: 'hello orb',
        displayTranscript: 'hello orb'
      }),
      'hello orb'
    )
  })

  it('voice and dictate share beginBrowserSpeechCapture', () => {
    const hook = readSource('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /beginBrowserSpeechCapture/)
    assert.match(hook, /beginBrowserSpeechCapture\('dictate'\)/)
    assert.match(hook, /beginBrowserSpeechCapture\('voice'\)/)
  })

  it('voice does not await getUserMedia before browser speech start', () => {
    const hook = readSource('components/orb-standalone/use-standalone-orb-voice.ts')
    const body =
      hook.match(/const beginUserVoiceCapture[\s\S]*?^  const endDictateSpeechCapture/m)?.[0] ?? ''
    assert.doesNotMatch(body, /await requestMicrophonePermission/)
    assert.match(hook, /SpeechRecognition\.start\(\) must run without awaiting getUserMedia first/)
  })

  it('voice promotes interim on stop and submits captured transcript', () => {
    const hook = readSource('components/orb-standalone/use-standalone-orb-voice.ts')
    const station = readSource('components/orb-standalone/orb-voice-station.tsx')
    assert.match(hook, /finalizeBrowserSpeechCapture/)
    assert.match(hook, /promoteInterimTranscriptCommitted/)
    assert.match(hook, /stopListeningAndFinalize/)
    assert.match(station, /voiceEngine\.stop/)
    assert.match(station, /appendUserTurn\(text\)/)
    assert.match(station, /voiceEngine\.displayTranscript/)
  })

  it('voice only reports no-catch when capture purpose is voice', () => {
    const hook = readSource('components/orb-standalone/use-standalone-orb-voice.ts')
    assert.match(hook, /browserSpeechPurposeRef\.current !== 'voice'/)
    assert.match(hook, /ORB_VOICE_NO_HEAR_MESSAGE/)
  })

  it('realtime remains disabled for residential web voice', () => {
    const config = readSource('lib/orb/voice/orb-web-voice-config.ts')
    assert.match(config, /ORB_WEB_REALTIME_VOICE_ENABLED = false/)
  })

  it('maps Safari no-speech and aborted errors to explicit fallback copy', () => {
    assert.equal(isSafariRecognitionNoSpeechError('no-speech'), true)
    assert.equal(isSafariRecognitionNoSpeechError('aborted', 'No speech detected'), true)
    assert.equal(
      recognitionErrorUserMessage('aborted', 'No speech detected', 'voice'),
      'Safari did not capture speech. Dictate is available, or you can use Chat instead.'
    )
    assert.match(recognitionErrorUserMessage('network', 'offline', 'voice'), /didn't catch that/i)
  })

  it('Safari Voice blocks browser SpeechRecognition and recommends Dictate', () => {
    const capture = readSource('lib/orb/voice/orb-browser-speech-capture.ts')
    const hook = readSource('components/orb-standalone/use-standalone-orb-voice.ts')
    const station = readSource('components/orb-standalone/orb-voice-station.tsx')
    assert.match(capture, /shouldBlockSafariBrowserVoice/)
    assert.match(capture, /ORB_VOICE_SAFARI_NO_SPEECH_MESSAGE/)
    assert.match(hook, /shouldBlockSafariBrowserVoice/)
    assert.match(station, /data-orb-voice-safari-fallback/)
    assert.match(station, /Open Dictate/)
    assert.match(station, /Use Chat/)
  })

  it('voice brain submit uses client fetch not server actions', () => {
    const submit = readSource('lib/orb/voice/orb-voice-submit-client.ts')
    const companion = readSource('components/orb-standalone/orb-care-companion.tsx')
    assert.match(submit, /clientFetchUsedForVoice/)
    assert.match(submit, /serverActionUsedForVoice: false/)
    assert.match(submit, /isStaleServerActionError/)
    assert.match(companion, /markOrbVoiceClientBrainFetch/)
    assert.doesNotMatch(companion, /'use server'/)
  })
})

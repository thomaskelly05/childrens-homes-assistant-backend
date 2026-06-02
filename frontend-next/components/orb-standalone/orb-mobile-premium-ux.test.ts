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
  voiceMobilePrimaryButton,
  voiceMobileStatusLine
} from '../../lib/orb/voice/orb-voice-mobile-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

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
    assert.match(dictate, /data-orb-dictate-primary-action/)
    assert.doesNotMatch(dictate, /Start speech transcript/)
  })

  it('transcript ready shows captured card and generate enabled wiring', () => {
    assert.equal(dictateMobileShowsCapturedCard({ hasTranscript: true, dictateState: 'transcript_ready' }), true)
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /data-orb-dictate-captured-card/)
    assert.match(dictate, /data-orb-dictate-generate-sticky/)
    assert.match(dictate, /disabled=\{generating \|\| !effectiveInputText\.trim\(\)\}/)
  })

  it('error without transcript does not show captured state', () => {
    assert.equal(dictateMobileShowsCapturedCard({ hasTranscript: false, dictateState: 'error' }), false)
    assert.equal(
      dictateMobilePrimaryButton({ dictateState: 'error', recordingUiState: 'error', hasTranscript: false }),
      'Try again'
    )
  })
})

describe('ORB mobile premium Voice copy', () => {
  it('idle shows one primary Start control', () => {
    assert.equal(voiceMobilePrimaryButton({ sessionLive: false, starting: false }), 'Start')
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /data-orb-voice-primary-action/)
    assert.match(voice, /Talk with ORB/)
  })

  it('unavailable shows Dictate and Type fallback without fake active state', () => {
    const voice = readComponent('components/orb-standalone/orb-voice-station.tsx')
    assert.match(voice, /Live voice is not available right now/)
    assert.match(voice, /data-orb-voice-open-dictate/)
    assert.match(voice, /Type instead/)
    assert.match(voice, /voice_fake_active_prevented/)
    assert.equal(
      voiceMobileStatusLine({ phase: 'unavailable', blockedReason: null }),
      'Live voice is not available right now'
    )
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

  it('non-debug UI avoids technical dictate copy strings', () => {
    const dictate = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /isOrbDeveloperMode/)
    assert.match(dictate, /isTechnicalDictateStatus/)
    assert.ok(isTechnicalDictateStatus('Start server realtime transcription'))
    assert.ok(isTechnicalDictateStatus('Speech transcript captured — review'))
    const userFacing = dictate.replace(/developerMode[\s\S]*?<\/div>/g, '')
    assert.doesNotMatch(userFacing, /Start speech transcript/)
    assert.doesNotMatch(userFacing, /server realtime transcription/)
  })
})

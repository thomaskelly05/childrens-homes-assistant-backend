import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE,
  ORB_COMPOSER_SPEECH_START_TIMEOUT_MS,
  composerSpeechImmediateStatus
} from '../../lib/orb/orb-composer-inline-voice-fallback.ts'
import {
  isOrbSpeechRecognitionErrorMessage,
  orbVoiceCalmSpeechNotice
} from '../../lib/orb/voice/orb-voice-speech-notice.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('ORB live mobile correction pass', () => {
  it('mobile composer action rail has no shield trigger in source', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.doesNotMatch(composer, /OrbResidentialPrivacyGuidanceIcon/)
    assert.doesNotMatch(composer, /data-orb-privacy-guidance-trigger/)
    assert.match(mobileCss, /\[data-orb-composer-action-rail\] \[data-orb-privacy-guidance-trigger\]/)
    assert.match(mobileCss, /display: none !important/)
  })

  it('desktop composer hides privacy shield trigger', () => {
    const desktopCss = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    assert.match(desktopCss, /\[data-orb-composer-action-rail\] \[data-orb-privacy-guidance-trigger\]/)
  })

  it('composer speech tap provides immediate status and dictate fallback wiring', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(companion, /handleComposerPrimaryAction/)
    assert.match(companion, /ORB_COMPOSER_SPEECH_OPENING_MIC_COPY/)
    assert.match(companion, /armComposerSpeechTimeout/)
    assert.match(companion, /ORB_COMPOSER_SPEECH_START_TIMEOUT_MS/)
    assert.match(composer, /data-orb-composer-open-dictate-fallback/)
    assert.match(composer, /handleVoiceTouchStart/)
    assert.equal(composerSpeechImmediateStatus({ recognitionAvailable: true, preferDictate: false }), 'Listening…')
    assert.equal(composerSpeechImmediateStatus({ recognitionAvailable: false }), 'Opening microphone…')
    assert.ok(ORB_COMPOSER_SPEECH_START_TIMEOUT_MS > 0)
    assert.match(ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE, /Open Dictate/)
  })

  it('voice station keeps speech recognition failures calm and actionable', () => {
    const station = read('components/orb-standalone/orb-voice-station.tsx')
    assert.match(station, /ORB_VOICE_V2_TRANSCRIPTION_ERROR|voice\.detailLine/)
    assert.match(read('lib/orb/voice-v2/use-orb-voice-v2.ts'), /setShowTypeFallback\(true\)/)
    assert.match(read('components/orb-standalone/orb-voice-station-content.tsx'), /detailLine/)
    const calm = orbVoiceCalmSpeechNotice('Speech recognition could not start. Open Dictate or type instead.')
    assert.ok(calm)
    assert.doesNotMatch(calm!, /could not start/i)
    assert.equal(isOrbSpeechRecognitionErrorMessage('Speech recognition could not start'), true)
  })

  it('ORB presence uses shared liquid orb classes', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    const liquid = read('app/orb/_legacy-ui-archive/orb-liquid-glass.css')
    assert.match(presence, /orb-liquid-orb/)
    assert.match(liquid, /--orb-liquid-orb-aura/)
    assert.match(liquid, /\.orb-liquid-orb::after/)
  })

  it('desktop plus menu and privacy settings remain wired', () => {
    const plus = read('components/orb-standalone/orb-composer-plus-menu.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(plus, /privacy_guidance/)
    assert.match(tools, /privacy_guidance/)
    assert.match(plus, /take_photo/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { dictateMobileStatusLine } from '../../lib/orb/dictate/orb-dictate-mobile-copy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Dictate mobile capture polish', () => {
  it('idle capture panel includes compact ORB visual and premium capture shell', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(dictate, /GlassOrbMark/)
    assert.match(dictate, /variant="dictate"/)
    assert.match(dictate, /data-orb-dictate-capture-orb/)
    assert.match(dictate, /orb-dictate-mobile-orb/)
    assert.match(dictate, /data-orb-dictate-capture-panel=\{showCapturedCard \? undefined : 'true'\}/)
    assert.match(mobileCss, /orb-dictate-mobile-orb-wrap/)
    assert.match(mobileCss, /\[data-orb-dictate-capture-panel='true'\]/)
    assert.match(mobileCss, /prefers-reduced-motion: reduce/)
  })

  it('record type selector, start recording, paste, upload, privacy and options remain on idle mobile', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const selector = read('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    assert.match(dictate, /data-orb-dictate-mobile-record-type/)
    assert.match(dictate, /OrbDictateTemplateSelector/)
    assert.match(dictate, /appearance="capture"/)
    assert.match(dictate, /data-orb-dictate-primary-action/)
    assert.match(dictate, /Start recording|mobilePrimaryLabel/)
    assert.match(dictate, /data-orb-dictate-paste-secondary/)
    assert.match(dictate, /data-orb-dictate-upload-secondary/)
    assert.match(dictate, /OrbDictateBoundaryCopy/)
    assert.match(dictate, /data-orb-dictate-options-chip/)
    assert.match(selector, /data-orb-dictate-template-selector-appearance/)
    assert.match(selector, /Record type:/)
  })

  it('idle status copy uses Ready to capture and framework purpose line stays template-aware', () => {
    assert.equal(
      dictateMobileStatusLine({
        dictateState: 'ready',
        recordingUiState: 'idle',
        hasTranscript: false,
        speechError: null,
        userStatus: null,
        listening: false
      }),
      'Ready to capture'
    )
    const selector = read('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    assert.match(selector, /recordType\.when_to_use/)
    assert.match(selector, /data-orb-dictate-template-purpose/)
  })

  it('desktop dictate station branch is unchanged and mobile orb is not duplicated in station shell', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    assert.match(station, /isMobile \?/)
    assert.match(station, /OrbDictateMobileExperience/)
    assert.doesNotMatch(station, /<GlassOrbMark/)
    assert.match(dictate, /GlassOrbMark/)
  })
})

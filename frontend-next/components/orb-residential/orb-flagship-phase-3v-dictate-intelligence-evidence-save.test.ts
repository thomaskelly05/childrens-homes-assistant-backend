import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3V Dictate intelligence evidence save', () => {
  it('build version marker is phase-5c-voice-v2-audio-playback-unlock', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5c-voice-v2-audio-playback-unlock')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('dictate intelligence request module exists and is wired', () => {
    const intelligence = read('lib/orb/dictate/orb-dictate-intelligence-request.ts')
    const asyncIntelligence = read('lib/orb/dictate/orb-dictate-intelligence.ts')
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(intelligence, /OrbDictateIntelligenceRequest/)
    assert.match(intelligence, /buildDictateSavePacket/)
    assert.match(asyncIntelligence, /requestWorkingDocumentFromOrb/)
    assert.match(studio, /requestWorkingDocumentFromOrb/)
    assert.match(studio, /applyDictateIntelligenceEdit/)
    assert.match(station, /buildDictateIntelligenceRequest/)
    assert.match(station, /buildCleanDictateCopy/)
  })

  it('working document sections support source evidence UI', () => {
    const workingDoc = read('components/orb/dictate/OrbDictateWorkingDocument.tsx')
    const util = read('lib/orb/dictate/orb-dictate-working-document.ts')
    assert.match(util, /sourceSnippets/)
    assert.match(util, /sourceType/)
    assert.match(workingDoc, /data-orb-dictate-section-source/)
    assert.match(workingDoc, /Not captured in transcript/)
  })

  it('people panel supports add, confirm and structured fields', () => {
    const people = read('components/orb/dictate/OrbDictatePeopleConfirm.tsx')
    const util = read('lib/orb/dictate/orb-dictate-people-identification.ts')
    assert.match(people, /data-orb-dictate-people-add/)
    assert.match(util, /basis/)
    assert.match(util, /sourceSnippet/)
    assert.match(util, /createManualPersonConfirmItem/)
  })

  it('missing-information review appears before safer draft flow', () => {
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const review = read('components/orb/dictate/OrbDictateMissingInfoReview.tsx')
    assert.match(review, /Before final draft, check/)
    assert.match(studio, /OrbDictateMissingInfoReview/)
  })

  it('save and handoff preserve dictate packet metadata', () => {
    const adapters = read('lib/orb/orb-saved-output-adapters.ts')
    const handoff = read('lib/orb/write/orb-write-handoff.ts')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(adapters, /transcript_privacy_mode/)
    assert.match(adapters, /dictate_save_packet/)
    assert.match(handoff, /transcript_privacy_mode/)
    assert.match(station, /buildDictateSavePacket/)
    assert.match(station, /ORB_DICTATE_MEDIA_SAVED_LOCAL_NOTE/)
  })

  it('backend edit respects internal working privacy mode', () => {
    const editService = readFileSync(join(root, '..', 'services', 'orb_dictate_edit_service.py'), 'utf8')
    const schema = readFileSync(join(root, '..', 'schemas', 'orb_dictate.py'), 'utf8')
    assert.match(editService, /internal_working/)
    assert.match(schema, /transcript_privacy_mode/)
  })

  it('single shell and no compliance guarantee language', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(read('components/orb/dictate/OrbDictateStudioWorkspace.tsx'), /guarantee compliance|Ofsted approved/i)
  })
})

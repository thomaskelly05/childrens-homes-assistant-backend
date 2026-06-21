import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_BUILD_VISUAL_VERSION, ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'
import { ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE } from '../../lib/orb/dictate/orb-dictate-transcript-privacy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3U Dictate identity mapping', () => {
  it('build version marker is phase-5b-voice-v2-safari-katherine-hardening', () => {
    assert.equal(ORB_BUILD_VISUAL_VERSION, 'phase-5b-voice-v2-safari-katherine-hardening')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-residential-shell\.css/)
    assert.deepEqual(ORB_LAYOUT_CSS_FILES, ['app/orb/orb-residential-shell.css'])
  })

  it('dictate default transcript privacy mode is internal working', () => {
    assert.equal(ORB_DICTATE_DEFAULT_TRANSCRIPT_PRIVACY_MODE, 'internal_working')
    const privacy = read('lib/orb/dictate/orb-dictate-transcript-privacy.ts')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const client = read('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(privacy, /internal_working/)
    assert.match(station, /transcriptBundle/)
    assert.match(station, /data-orb-dictate-transcript-privacy-mode/)
    assert.match(client, /transcriptBundle/)
    assert.match(client, /originalTranscript/)
  })

  it('backend dictate transcribe preserves original transcript for internal working', () => {
    const governance = readFileSync(join(root, '..', 'services', 'ai_external_call_governance.py'), 'utf8')
    const dictateService = readFileSync(join(root, '..', 'services', 'orb_dictate_service.py'), 'utf8')
    assert.match(governance, /original_transcript/)
    assert.match(governance, /FEATURE_DICTATE/)
    assert.match(dictateService, /original_transcript/)
    assert.match(dictateService, /transcript_privacy_mode/)
  })

  it('people detection and supervision mapping utilities exist', () => {
    const people = read('lib/orb/dictate/orb-dictate-people-identification.ts')
    const working = read('lib/orb/dictate/orb-dictate-working-document.ts')
    assert.match(people, /extractPresentPeopleNames/)
    assert.match(people, /here with/)
    assert.match(working, /mapSupervisionReflection/)
    assert.match(working, /mapTeamMeetingIntroduction/)
  })

  it('privacy copy does not claim silent anonymisation', () => {
    const captureCopy = read('lib/orb/dictate/orb-dictate-capture-copy.ts')
    const strip = read('components/orb/dictate/OrbDictatePrivacyStrip.tsx')
    assert.match(captureCopy, /ORB_DICTATE_TRANSCRIPT_PRIVACY_NOTE/)
    assert.match(strip, /data-orb-dictate-transcript-privacy-note/)
    assert.doesNotMatch(strip, /automatically anonymised/i)
  })

  it('anonymise remains an explicit adult action', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /action === 'anonymise'/)
    assert.doesNotMatch(station, /anonymiseText\(merged/)
  })

  it('single shell and no compliance guarantee language', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(read('components/orb/dictate/OrbDictateStudioWorkspace.tsx'), /guarantee compliance|Ofsted approved/i)
  })
})

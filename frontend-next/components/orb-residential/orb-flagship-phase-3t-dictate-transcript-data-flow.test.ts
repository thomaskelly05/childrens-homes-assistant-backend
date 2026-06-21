import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_LAYOUT_CSS_FILES } from '../../lib/orb/orb-visual-build.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential Phase 3T Dictate transcript data flow', () => {
  it('transcript mapping utilities and lifecycle hooks exist', () => {
    const util = read('lib/orb/dictate/orb-dictate-working-document.ts')
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(util, /mapTranscriptToSections/)
    assert.match(util, /extractTranscriptSignals/)
    assert.match(util, /isWorkingDocumentUnmappedScaffold/)
    assert.match(studio, /hasAdultEditedWorkingDocument/)
    assert.match(studio, /isWorkingDocumentUnmappedScaffold/)
    assert.match(studio, /buildInitialWorkingDocument\(committedText/)
    assert.match(station, /setTranscript\(merged\)/)
    assert.match(station, /buildPeopleToConfirm/)
  })

  it('working document regenerates when transcript arrives and preserves adult edits', () => {
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(studio, /if \(hasAdultEditedWorkingDocument\) return/)
    assert.match(studio, /handleWorkingDocumentChange/)
    assert.match(studio, /setHasAdultEditedWorkingDocument\(true\)/)
    assert.match(studio, /data-orb-dictate-has-adult-edited-working-document/)
  })

  it('people detection handles contractions and redacted names', () => {
    const people = read('lib/orb/dictate/orb-dictate-people-identification.ts')
    assert.ok(people.includes("my name(?:'s| is)"))
    assert.ok(people.includes('[NAME_'))
    assert.ok(people.includes('registered manager'))
    assert.match(read('components/orb/dictate/OrbDictatePeopleConfirm.tsx'), /data-orb-dictate-people-confirm-confirm/)
  })

  it('template remapping and ORB review use working document content', () => {
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const client = read('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(studio, /hasAdultEditedWorkingDocument/)
    assert.match(studio, /reshapeWorkingDocument/)
    assert.match(studio, /reviewInputText/)
    assert.match(studio, /input_text: reviewInputText/)
    assert.match(studio, /editOrbDictateDocument/)
    assert.match(client, /team meeting|introduction|introduce/)
  })

  it('single shell and no compliance guarantee language', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const layout = read('app/orb/layout.tsx')
    assert.match(companion, /orb-app-shell/)
    assert.match(layout, /import '\.\/orb-residential-shell\.css'/)
    assert.doesNotMatch(read('components/orb/dictate/OrbDictateStudioWorkspace.tsx'), /guarantee compliance|Ofsted approved/i)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Templates Write Knowledge Library wiring', () => {
  it('template card Open in ORB Write uses template handoff', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const handoff = readComponent('lib/orb/write/orb-write-template-handoff.ts')
    assert.match(companion, /convergedTemplateHandoff/)
    assert.match(handoff, /orb-write-template-handoff-v1/)
  })

  it('template card Start in Dictate selects record type', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /studioTemplateId: recordType\.studio_template_id/)
    const station = readComponent('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(station, /initialStudioTemplateId/)
  })

  it('Use with Document opens Knowledge Library with record type', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    const panel = readComponent('components/orb-standalone/orb-document-panel.tsx')
    assert.match(companion, /setDocumentImportRecordTypeId/)
    assert.match(panel, /initialRecordTypeId/)
    assert.match(panel, /data-orb-knowledge-library-tabs/)
  })

  it('Knowledge Library tabs and official guidance render', () => {
    const panel = readComponent('components/orb-standalone/orb-document-panel.tsx')
    const official = readComponent(
      'components/orb-standalone/knowledge-library/orb-knowledge-official-guidance-section.tsx'
    )
    assert.match(panel, /Official Guidance/)
    assert.match(official, /data-orb-official-guidance-metadata/)
    assert.match(official, /data-orb-official-guidance-entry/)
  })

  it('ORB Write guidance chip without child profile or brain metadata', () => {
    const guidance = readComponent('components/orb-write/orb-write-guidance-panel.tsx')
    assert.match(guidance, /data-orb-write-guidance-chip/)
    assert.doesNotMatch(guidance, /brain_metadata/)
    assert.doesNotMatch(guidance, /childProfile/)
  })
})

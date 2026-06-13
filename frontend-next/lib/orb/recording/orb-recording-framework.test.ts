import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), relativePath), 'utf8'))
}

describe('ORB recording framework frontend', () => {
  it('defines 24 record types in shared JSON', () => {
    const data = readJson('orb-recording-framework.json')
    assert.equal(data.record_types.length, 24)
  })

  it('studio templates derive from shared framework', () => {
    const studio = readComponent('lib/orb/dictate/orb-dictate-studio-templates.ts')
    assert.match(studio, /orbRecordingStudioTemplates/)
    assert.match(studio, /recordTypeId/)
    const data = readJson('orb-recording-framework.json')
    const studioCount = data.record_types.filter((r: { studio_template_id: string | null }) => r.studio_template_id).length
    assert.ok(studioCount >= 13)
  })

  it('selected template card renders framework fields', () => {
    const card = readComponent('components/orb/dictate/OrbDictateSelectedTemplateCard.tsx')
    assert.match(card, /data-orb-dictate-selected-template-card/)
    assert.match(card, /data-orb-dictate-template-purpose/)
    assert.match(card, /data-orb-dictate-orb-checks/)
    assert.match(card, /resolveOrbRecordingRecordType/)
  })

  it('suggested outputs component uses record type', () => {
    const outputs = readComponent('components/orb/dictate/OrbDictateSuggestedOutputs.tsx')
    assert.match(outputs, /suggestedOutputsForRecordType/)
    assert.match(outputs, /data-orb-suggested-outputs-record-type/)
  })

  it('brain panel shows template-aware sections', () => {
    const brain = readComponent('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.match(brain, /data-orb-brain-orb-check/)
    assert.match(brain, /required_sections/)
    assert.match(brain, /data-orb-brain-quality-guidance/)
  })

  it('write editor shows record type badge without brain metadata', () => {
    const editor = readComponent('components/orb-write/orb-write-editor.tsx')
    assert.match(editor, /data-orb-write-record-type-badge/)
    assert.doesNotMatch(editor, /brain_metadata/)
  })

  it('pdf export uses record type structure', () => {
    const exp = readComponent('lib/orb/write/orb-write-export.ts')
    assert.match(exp, /formatBodyWithHeadings/)
    assert.match(exp, /Generated with ORB Residential, powered by IndiCare Intelligence/)
  })

  it('no child profile selector in dictate studio', () => {
    const workspace = readComponent('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.doesNotMatch(workspace, /child.profile/i)
    assert.doesNotMatch(workspace, /childProfile/)
  })

  it('templates page recording cards carry dictate and write actions', () => {
    const cards = readComponent('components/orb/recording/OrbRecordingLibraryCards.tsx')
    assert.match(cards, /data-orb-recording-start-dictate/)
    assert.match(cards, /data-orb-recording-open-write/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

/** Contract tests — ensure visual v2 pass does not remove routes, APIs, or panel wiring. */
describe('ORB visual regression contract', () => {
  it('core API routes remain referenced in client code', () => {
    const dictateClient = read('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(dictateClient, /DICTATE_BASE\s*=\s*'\/orb\/dictate'/)
    assert.match(dictateClient, /DICTATE_BASE\s*\+\s*'\/analyze'/)
    assert.match(dictateClient, /DICTATE_BASE\s*\+\s*'\/generate'/)
    assert.match(dictateClient, /DICTATE_BASE\s*\+\s*'\/finalise'/)
    assert.match(dictateClient, /DICTATE_BASE\s*\+\s*'\/edit'/)
  })

  it('station panel registry unchanged', () => {
    const types = read('components/orb-standalone/orb-standalone-panel-types.ts')
    for (const id of [
      'orb_dictate',
      'orb_write',
      'documents',
      'templates',
      'saved_outputs',
      'shift_builder',
      'billing',
      'settings'
    ]) {
      assert.match(types, new RegExp(`'${id}'`))
    }
  })

  it('care companion wires all residential stations', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /OrbDictateStation/)
    assert.match(companion, /OrbWriteStandalonePanel/)
    assert.match(companion, /OrbDocumentPanel/)
    assert.match(companion, /OrbTemplatesPanel/)
    assert.match(companion, /OrbSavedOutputsPanel/)
    assert.match(companion, /OrbShiftBuilderPanel/)
    assert.match(companion, /OrbVoiceStation/)
    assert.match(companion, /OrbReviewPanel/)
    assert.match(companion, /OrbInspectionReadinessPanel/)
    assert.match(companion, /OrbSafeguardingThinkingPanel/)
    assert.match(companion, /OrbRecordProperlyPanel/)
  })

  it('ORB Write menu still opens standalone write station', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(sidebar, /orb_write/)
    assert.match(companion, /openOrbWritePanel|stationParam === 'write'/)
  })

  it('template handoffs to write and dictate preserved', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const writeHandoff = read('lib/orb/write/orb-write-template-handoff.ts')
    assert.match(templates, /onRecordingAction|OrbRecordingLibraryAction/)
    assert.match(writeHandoff, /orb-write-template-handoff/)
  })

  it('billing stripe checkout wiring preserved', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(billing, /startOrbCheckout/)
    assert.match(billing, /fetchOrbAccess/)
  })

  it('no new standalone child profile storage', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.doesNotMatch(companion, /child_profiles|ChildProfileSelector/)
    assert.doesNotMatch(write, /child_profiles|ChildProfileSelector/)
  })
})

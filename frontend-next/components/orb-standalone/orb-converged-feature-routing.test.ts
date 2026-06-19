import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB converged feature routing', () => {
  it('templates surface common workflows and recording actions', () => {
    const templates = readComponent('components/orb-standalone/orb-templates-panel.tsx')
    const cards = readComponent('components/orb/recording/OrbRecordingLibraryCards.tsx')
    assert.match(templates, /OrbRecordingLibraryCards/)
    assert.match(cards, /data-orb-recording-common-workflows/)
    assert.match(cards, /Start in Dictate/)
    assert.match(cards, /Open in ORB Write/)
    assert.match(cards, /Use with Document/)
    assert.match(cards, /Continue in Chat/)
  })

  it('ORB Write assistant includes converged practice workflow actions', () => {
    const registry = readComponent('lib/orb/orb-converged-actions.ts')
    const panel = readComponent('components/orb-write/orb-write-ai-panel.tsx')
    assert.match(panel, /ORB_CONVERGED_WRITE_PANEL_GROUPS/)
    for (const label of [
      'Review this record',
      'Help me record this properly',
      'Add safeguarding lens',
      'Add Ofsted/inspection lens',
      'Create handover',
      'Create manager summary',
      'Create chronology entry',
      'Create action plan',
      'What am I missing?',
      'Check against selected guidance',
      'Remove blame language',
      'Check recording quality',
      'Check child voice',
      'Check manager oversight'
    ]) {
      assert.match(registry, new RegExp(label))
    }
  })

  it('documents panel exposes converged lenses and cross-room actions', () => {
    const lenses = readComponent('lib/orb/document-intelligence.ts')
    const panel = readComponent('components/orb-standalone/orb-document-panel.tsx')
    assert.match(lenses, /Inspection evidence preparation/)
    assert.match(lenses, /Recording requirements/)
    assert.match(lenses, /RESIDENTIAL_DOCUMENT_CROSS_ACTIONS/)
    assert.match(panel, /data-orb-document-cross-actions/)
    assert.match(panel, /RESIDENTIAL_DOCUMENT_CROSS_ACTIONS/)
    assert.match(panel, /data-orb-document-cross-action/)
  })

  it('dictate hero outputs include handover, manager and action plan', () => {
    const hero = readComponent('lib/orb/dictate/orb-dictate-hero-output-types.ts')
    assert.match(hero, /handover_note/)
    assert.match(hero, /manager_oversight_note/)
    assert.match(hero, /action_plan/)
    assert.match(hero, /chronology_entry/)
    assert.match(hero, /safeguarding_concern_record/)
  })

  it('legacy panel components remain for compatibility', () => {
    const practice = readComponent('components/orb-standalone/orb-practice-panels.tsx')
    const shift = readComponent('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')
    const review = readComponent('components/orb-standalone/orb-review-panel.tsx')
    const knowledge = readComponent('components/orb-standalone/orb-knowledge-library.tsx')
    assert.match(practice, /Deprecated from primary nav/)
    assert.match(shift, /Deprecated from primary nav/)
    assert.match(review, /OrbReviewPanel/)
    assert.match(knowledge, /OrbKnowledgeLibraryPanel/)
  })

  it('deep-link routes still exist', () => {
    assert.match(readComponent('app/orb/review/page.tsx'), /station=orb_write/)
    assert.match(readComponent('app/orb/learn/page.tsx'), /redirect\('\/orb'\)/)
    assert.match(readComponent('app/orb-residential/shift-builder/page.tsx'), /redirect\('\/orb'\)/)
  })

  it('does not expose child profile selector or brain metadata in residential shell', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /childProfileSelector/)
    assert.doesNotMatch(companion, /brain_metadata/)
  })
})

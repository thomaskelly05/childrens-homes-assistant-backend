import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB document comparison', () => {
  it('Documents panel shows Compare Documents tab and section', () => {
    const panel = read('components/orb-standalone/orb-document-panel.tsx')
    assert.match(panel, /Compare Documents/)
    assert.match(panel, /OrbDocumentComparisonSection/)
  })

  it('comparison section accepts Document A and B with spellcheck', () => {
    const section = read('components/orb-standalone/orb-document-comparison-section.tsx')
    assert.match(section, /data-orb-document-a-text/)
    assert.match(section, /data-orb-document-b-text/)
    assert.match(section, /spellCheck/)
  })

  it('comparison lens selector renders', () => {
    const lib = read('lib/orb/document-comparison.ts')
    const section = read('components/orb-standalone/orb-document-comparison-section.tsx')
    assert.match(lib, /ORB_DOCUMENT_COMPARISON_LENSES/)
    assert.match(section, /data-orb-document-comparison-lens-selector/)
    assert.match(section, /data-orb-comparison-lens=/)
  })

  it('comparison output has Open in ORB Write and save actions', () => {
    const section = read('components/orb-standalone/orb-document-comparison-section.tsx')
    assert.match(section, /data-orb-open-comparison-in-write/)
    assert.match(section, /OrbOutputSaveActions/)
    assert.match(section, /data-orb-open-action-plan-in-write/)
  })

  it('uses governed compare route not a new brain', () => {
    const lib = read('lib/orb/document-comparison.ts')
    const client = read('lib/orb/standalone-client.ts')
    assert.match(lib, /policy_comparison/)
    assert.match(client, /compareOrbStandaloneDocuments/)
    assert.match(client, /\/orb\/standalone\/documents\/compare/)
    assert.doesNotMatch(lib, /createBrain|newAiBrain|standaloneBrain/i)
  })

  it('comparison build payload requires both documents', () => {
    const lib = read('lib/orb/document-comparison.ts')
    assert.match(lib, /DOCUMENT A/)
    assert.match(lib, /DOCUMENT B/)
    assert.match(lib, /adult review required/i)
  })
})

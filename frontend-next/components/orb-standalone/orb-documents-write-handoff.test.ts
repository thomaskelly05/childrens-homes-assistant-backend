import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB documents to Write handoff', () => {
  it('comparison output opens in ORB Write via converged handoff', () => {
    const comparison = read('components/orb-standalone/orb-document-comparison-section.tsx')
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    const content = read('lib/orb/write/orb-write-content-handoff.ts')
    assert.match(comparison, /onOpenOrbWrite/)
    assert.match(comparison, /data-orb-open-comparison-in-write/)
    assert.match(handoff, /convergedHandoffToOrbWrite/)
    assert.match(content, /handoffTextToOrbWrite/)
  })

  it('care companion passes document comparison handoff to write', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /convergedHandoffToOrbWrite/)
    assert.match(companion, /Documents & Guidance/)
  })

  it('saved output handoff supports document comparison source', () => {
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(handoff, /document_comparison/)
  })

  it('comparison saved output uses policy_comparison or action_plan types', () => {
    const lib = read('lib/orb/document-comparison.ts')
    assert.match(lib, /comparisonSavedOutputType/)
    assert.match(lib, /policy_comparison/)
  })

  it('handoff payload includes adult review via content handoff', () => {
    const content = read('lib/orb/write/orb-write-content-handoff.ts')
    assert.match(content, /ORB_WRITE_REVIEW_STATEMENT/)
    assert.match(content, /review_required_statement/)
  })
})

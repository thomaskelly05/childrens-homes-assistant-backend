import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Documents converged lenses', () => {
  it('converged document lenses mirror residential first-class lenses', () => {
    const lenses = read('lib/orb/document-intelligence.ts')
    const registry = read('lib/orb/orb-converged-actions.ts')
    assert.match(registry, /ORB_CONVERGED_DOCUMENT_LENSES/)
    assert.match(registry, /RESIDENTIAL_FIRST_CLASS_LENSES/)
    assert.match(lenses, /Analyse Reg 44 report/)
    assert.match(lenses, /Create easy-read summary/)
    assert.match(lenses, /Inspection readiness/)
  })

  it('documents panel renders lenses and cross-room actions', () => {
    const panel = read('components/orb-standalone/orb-document-panel.tsx')
    assert.match(panel, /RESIDENTIAL_FIRST_CLASS_LENSES/)
    assert.match(panel, /RESIDENTIAL_DOCUMENT_CROSS_ACTIONS/)
    assert.match(panel, /data-orb-document-cross-actions/)
  })

  it('cross actions include ORB Write and Template handoff', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    const lenses = read('lib/orb/document-intelligence.ts')
    assert.match(registry, /ORB_CONVERGED_DOCUMENT_CROSS_ACTIONS/)
    assert.match(lenses, /use_write/)
    assert.match(lenses, /use_template/)
  })

  it('documents panel includes compare documents workflow', () => {
    const panel = read('components/orb-standalone/orb-document-panel.tsx')
    const comparison = read('components/orb-standalone/orb-document-comparison-section.tsx')
    assert.match(panel, /Compare Documents/)
    assert.match(panel, /OrbDocumentComparisonSection/)
    assert.match(comparison, /data-orb-compare-with-orb/)
  })
})

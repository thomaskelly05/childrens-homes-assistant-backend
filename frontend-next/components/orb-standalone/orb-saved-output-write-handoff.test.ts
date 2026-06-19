import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB saved output write handoff', () => {
  it('converged handoff builds saved output payload', () => {
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(handoff, /buildSavedOutputWriteHandoff/)
    assert.match(handoff, /handoffSavedOutputToOrbWrite/)
  })

  it('saved output detail exposes Open in ORB Write', () => {
    const detail = read('components/orb-standalone/orb-saved-output-detail-actions.tsx')
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(detail, /data-orb-saved-output-open-write/)
    assert.match(panel, /onOpenSavedOutputInOrbWrite/)
    assert.match(companion, /handoffSavedOutputToOrbWrite/)
  })

  it('empty state points to Create document and Start in Dictate', () => {
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /data-orb-saved-output-empty-state/)
    assert.match(panel, /ORB_RECORDS_EMPTY_TITLE/)
    assert.match(panel, /data-orb-saved-start-dictate/)
    assert.match(panel, /data-orb-saved-start-write/)
    assert.match(panel, /Create document/)
    assert.match(panel, /Start in Dictate/)
  })
})

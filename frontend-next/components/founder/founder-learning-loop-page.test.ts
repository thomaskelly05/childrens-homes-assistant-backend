import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Learning Loop page', () => {
  it('includes governance disclaimer and approval gates', () => {
    const source = readSource('components/founder/founder-learning-loop-page.tsx')
    assert.match(source, /LEARNING_LOOP_DISCLAIMER/)
    assert.match(source, /learning-loop-disclaimer/)
    assert.match(source, /Approval required/)
    assert.match(source, /No auto-merge pathway exists/)
    assert.match(source, /syntheticDataOnly: true/)
  })

  it('exposes required data-testids', () => {
    const source = readSource('components/founder/founder-learning-loop-page.tsx')
    const requiredIds = [
      'founder-learning-loop-page',
      'learning-loop-start-btn',
      'learning-loop-detect-weaknesses-btn',
      'learning-loop-generate-scenarios-btn',
      'learning-loop-approve-proposal-btn',
      'learning-loop-create-build-brief-btn',
      'learning-loop-autonomy-settings'
    ]
    for (const id of requiredIds) {
      assert.match(source, new RegExp(`data-testid="${id}"`))
    }
  })
})

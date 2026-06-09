import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ensureFastOpeningSpacing,
  isOrbFastOpeningOnlyCompletion,
  isOrbFastOpeningPlaceholder,
  resolveOrbStreamedAnswer
} from './orb-fast-opening.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('orb fast opening helpers', () => {
  it('detects residential deep placeholder', () => {
    assert.equal(
      isOrbFastOpeningPlaceholder(
        'Start with what is safest and most practical right now — the full guidance is on the way.'
      ),
      true
    )
  })

  it('does not treat full incident guidance as placeholder', () => {
    const full =
      'Start with what is safest and most practical right now — the full guidance is on the way.\n\n' +
      '### Incident report draft\nSummary: Jamie was dysregulated after family contact.'
    assert.equal(isOrbFastOpeningPlaceholder(full), false)
  })

  it('prefers longer streamed partial over shorter metadata answer', () => {
    const partial =
      'Opening line.\n\n### Incident report draft\nSummary and structured sections follow.'
    const resolved = resolveOrbStreamedAnswer('Opening line.', partial)
    assert.equal(resolved, partial)
  })

  it('fixes joined fast opening and immediate heading', () => {
    const glued =
      'Start with what is safest and most practical right now — the full guidance is on the way.' +
      'Immediate Safety'
    const fixed = ensureFastOpeningSpacing(glued)
    assert.ok(!fixed.includes('way.Immediate'))
    assert.ok(fixed.includes('on the way.\n\nImmediate'))
  })

  it('flags placeholder-only completion when error detail is present', () => {
    assert.equal(
      isOrbFastOpeningOnlyCompletion(
        'Start with what is safest and most practical right now — the full guidance is on the way.',
        { errorDetail: 'stream_incomplete' }
      ),
      true
    )
  })
})

describe('orb care companion stream completion wiring', () => {
  it('uses fast-opening resolution before marking assistant complete', () => {
    const companion = readFileSync(
      join(root, 'components/orb-standalone/orb-care-companion.tsx'),
      'utf8'
    )
    assert.match(companion, /resolveOrbStreamedAnswer/)
    assert.match(companion, /entry\.status !== 'streaming'/)
  })
})

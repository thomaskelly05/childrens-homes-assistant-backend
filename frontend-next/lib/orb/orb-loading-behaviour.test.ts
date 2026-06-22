import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_DEFERRED_SUMMARY_PANELS,
  scheduleOrbDeferredLoad,
  shouldFetchOrbSavedOutputsSummaryImmediately
} from './orb-loading-behaviour.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB loading behaviour', () => {
  it('defers saved outputs summary until panel or idle schedule', () => {
    assert.equal(shouldFetchOrbSavedOutputsSummaryImmediately(null), false)
    assert.equal(shouldFetchOrbSavedOutputsSummaryImmediately('orb_voice'), false)
    assert.equal(shouldFetchOrbSavedOutputsSummaryImmediately('saved_outputs'), true)
    assert.equal(shouldFetchOrbSavedOutputsSummaryImmediately('memory'), true)
    assert.deepEqual(ORB_DEFERRED_SUMMARY_PANELS, ['saved_outputs', 'memory'])
  })

  it('scheduleOrbDeferredLoad runs after delay', async () => {
    let ran = false
    const cancel = scheduleOrbDeferredLoad(() => {
      ran = true
    }, 20)
    assert.equal(ran, false)
    await new Promise((resolve) => setTimeout(resolve, 40))
    assert.equal(ran, true)
    cancel()
  })

  it('OrbCareCompanion does not block initial render on summary fetch', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /scheduleOrbDeferredLoad/)
    assert.match(companion, /shouldFetchOrbSavedOutputsSummaryImmediately/)
    assert.match(companion, /savedOutputsSummaryLoadedRef/)
  })

  it('voice status only fetched when Voice station is open', () => {
    const hook = read('lib/orb/voice-v2/use-orb-voice-v2.ts')
    assert.match(hook, /if \(!open\)/)
    assert.match(hook, /fetchOrbVoiceV2Status/)
    assert.match(hook, /fetchOrbVoiceRealtimeBetaStatus/)
  })
})

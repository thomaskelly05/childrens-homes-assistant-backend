import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-no-product-api-before-ready', () => {
  it('projects resilience checks bootstrap guard', () => {
    const source = read('lib/orb/orb-projects-resilience.ts')
    assert.match(source, /shouldAllowOrbProductFetch/)
    assert.match(source, /recordOrbProjectBootstrapRequest/)
  })

  it('saved outputs summary checks bootstrap guard', () => {
    const source = read('lib/orb/orb-saved-outputs-resilience.ts')
    assert.match(source, /shouldAllowOrbProductFetch/)
    assert.match(source, /recordOrbOutputsSummaryBootstrapRequest/)
  })

  it('standalone config checks bootstrap guard', () => {
    const source = read('lib/orb/standalone-client.ts')
    assert.match(source, /shouldAllowOrbProductFetch\('standalone_config'\)/)
  })

  it('voice session status checks bootstrap guard', () => {
    const source = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(source, /shouldAllowOrbProductFetch\('voice_session_status'\)/)
  })

  it('OrbCareCompanion guards bootstrap effects', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /shouldAllowOrbProductFetch\('projects'\)/)
    assert.match(companion, /shouldAllowOrbProductFetch\('standalone_config'\)/)
    assert.match(companion, /shouldAllowOrbProductFetch\('saved_outputs_summary'\)/)
  })
})

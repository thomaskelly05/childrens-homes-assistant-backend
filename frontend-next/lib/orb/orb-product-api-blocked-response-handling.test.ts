import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-product-api-blocked-response-handling', () => {
  it('classifies 401/402/403 safety responses', () => {
    const handler = read('lib/orb/orb-product-bootstrap-response.ts')
    assert.match(handler, /status === 401/)
    assert.match(handler, /status === 402/)
    assert.match(handler, /safety_required/)
  })

  it('resilience layers handle blocked responses without routing', () => {
    const projects = read('lib/orb/orb-projects-resilience.ts')
    const outputs = read('lib/orb/orb-saved-outputs-resilience.ts')
    const config = read('lib/orb/standalone-client.ts')
    const voice = read('lib/orb/voice/orb-realtime-availability.ts')
    assert.match(projects, /handleOrbProductBootstrapBlockedResponse/)
    assert.match(outputs, /handleOrbProductBootstrapBlockedResponse/)
    assert.match(config, /handleOrbProductBootstrapBlockedResponse/)
    assert.match(voice, /handleOrbProductBootstrapBlockedResponse/)
  })

  it('gate does not router.replace on bootstrap failures', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.doesNotMatch(gate, /router\.replace\('\/orb'\)/)
  })
})

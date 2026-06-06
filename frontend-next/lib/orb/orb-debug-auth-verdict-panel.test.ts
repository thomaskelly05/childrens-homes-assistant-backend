import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB debug auth verdict panel', () => {
  it('debug panel shows verdict and backend build counters', () => {
    const panel = read('components/orb-residential/orb-auth-debug-panel.tsx')
    assert.match(panel, /verdictRequestCount/)
    assert.match(panel, /authMeRequestCount/)
    assert.match(panel, /backendBuild/)
  })

  it('OrbAuthGate passes backend build to debug panel', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /backendBuild=\{backendBuild\}/)
    assert.match(gate, /getOrbBootstrapRequestCounts/)
  })
})

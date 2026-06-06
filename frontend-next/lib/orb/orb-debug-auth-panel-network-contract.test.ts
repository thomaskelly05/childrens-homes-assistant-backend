import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-debug-auth-panel-network-contract', () => {
  it('debug panel exposes bootstrap network counters', () => {
    const panel = read('components/orb-residential/orb-auth-debug-panel.tsx')
    assert.match(panel, /childrenMounted/)
    assert.match(panel, /productBootstrapAllowed/)
    assert.match(panel, /accessRequestCount/)
    assert.match(panel, /projectRequestCount/)
    assert.match(panel, /configRequestCount/)
    assert.match(panel, /voiceStatusRequestCount/)
    assert.match(panel, /outputsSummaryRequestCount/)
    assert.match(panel, /lastBlockedBootstrapReason/)
    assert.match(panel, /loopGuard/)
  })

  it('auth gate passes debug network props', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /getOrbAccessRequestCount/)
    assert.match(gate, /getOrbBootstrapNetworkCounts/)
    assert.match(gate, /getLastBlockedBootstrapReason/)
  })
})

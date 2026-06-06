import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('orb-debug-bootstrap-lock', () => {
  it('debug panel exposes bootstrap lock counters', () => {
    const panel = readFileSync(join(root, 'components/orb-residential/orb-auth-debug-panel.tsx'), 'utf8')
    const gate = readFileSync(join(root, 'components/orb-residential/orb-auth-gate.tsx'), 'utf8')
    assert.match(panel, /bootstrapLock/)
    assert.match(panel, /blockedBootstrapCalls/)
    assert.match(panel, /passkeyStatusRequestCount/)
    assert.match(panel, /productMounted/)
    assert.match(gate, /getOrbBootstrapLockDebugSnapshot/)
    assert.match(gate, /getPasskeyStatusRequestCount/)
  })
})

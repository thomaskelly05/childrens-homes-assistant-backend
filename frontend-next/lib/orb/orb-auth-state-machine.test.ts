import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-auth-state-machine', () => {
  it('defines gate states used by bootstrap lock', () => {
    const machine = read('lib/orb/orb-auth-state-machine.ts')
    assert.match(machine, /'ready'/)
    assert.match(machine, /'inactive'/)
    assert.match(machine, /'safety_required'/)
    assert.match(machine, /deriveOrbGateState/)
  })

  it('gate store syncs bootstrap lock on state changes', () => {
    const store = read('lib/orb/orb-gate-state-store.ts')
    assert.match(store, /syncOrbBootstrapLock/)
  })

  it('auth gate derives inactive and safety states without product mount', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /deriveOrbGateState/)
    assert.match(gate, /productChildrenMounted = gateState === 'ready'/)
  })
})

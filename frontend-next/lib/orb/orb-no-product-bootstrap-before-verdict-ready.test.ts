import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB no product bootstrap before verdict ready', () => {
  it('product children mount only when gateState is ready', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /productChildrenMounted = gateState === 'ready'/)
    assert.match(gate, /case 'ready':[\s\S]*OrbAccountStateProvider/)
  })

  it('account access probe is disabled until verdict ready provider mounts', () => {
    const account = read('contexts/orb-account-context.tsx')
    assert.match(account, /accessProbeEnabled/)
    const hook = read('hooks/use-orb-account-state.ts')
    assert.match(hook, /if \(!accessProbeEnabled\) return/)
  })

  it('upgrade screen uses verdict access payload when provided', () => {
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    assert.match(upgrade, /initialAccess/)
    assert.match(upgrade, /if \(initialAccess\)/)
  })
})

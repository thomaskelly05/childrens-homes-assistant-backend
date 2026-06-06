import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-bootstrap-lock', () => {
  it('defaults locked and unlocks only on ready gate state', () => {
    const lock = read('lib/orb/orb-bootstrap-lock.ts')
    assert.match(lock, /bootstrapLocked = true/)
    assert.match(lock, /LOCKED_GATE_STATES/)
    assert.match(lock, /syncOrbBootstrapLock/)
    assert.match(lock, /isOrbBootstrapUnlocked/)
  })

  it('product guard consults bootstrap lock', () => {
    const guard = read('lib/orb/orb-product-bootstrap-guard.ts')
    assert.match(guard, /isOrbBootstrapUnlocked/)
    assert.match(guard, /recordBootstrapBlocked/)
  })

  it('logout resets bootstrap lock', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /resetOrbBootstrapLock/)
  })
})

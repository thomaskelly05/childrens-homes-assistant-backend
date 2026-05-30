import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('useOrbAccountState', () => {
  it('exports converged account fields and data sources', () => {
    const source = readFileSync(join(root, 'hooks/use-orb-account-state.ts'), 'utf8')
    assert.match(source, /useAuth\(\)/)
    assert.match(source, /fetchOrbAccess/)
    assert.match(source, /fetchOrbPasskeyStatus/)
    assert.match(source, /readAdultProfile/)
    assert.match(source, /isLoading/)
    assert.match(source, /isSignedIn/)
    assert.match(source, /mergeProfileWithAuthUser/)
  })
})

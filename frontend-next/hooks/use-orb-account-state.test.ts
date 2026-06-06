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
    assert.match(source, /fetchOrbAccessCached/)
    assert.match(source, /fetchOrbPasskeyStatus/)
    assert.match(source, /loadPasskeyStatus/)
    assert.match(source, /useOrbAccountStateInternal/)
    assert.match(source, /readAdultProfile/)
    assert.match(source, /isLoading/)
    assert.match(source, /isSignedIn/)
    assert.match(source, /hasBackendSession/)
    assert.match(source, /profileDisplayMode/)
    assert.match(source, /hasConfirmedAccess/)
    assert.match(source, /accessFetchStatus/)
    assert.match(source, /accessFailureKind/)
    assert.match(source, /safetyAccepted/)
    assert.match(source, /safety_accepted/)
    assert.match(source, /adminBypass/)
    assert.match(source, /mergeProfileWithAuthUser/)
  })

  it('does not treat local profile as signed-in account', () => {
    const source = readFileSync(join(root, 'hooks/use-orb-account-state.ts'), 'utf8')
    assert.match(source, /const isSignedIn = hasBackendSession/)
    assert.match(source, /profileDisplayMode: OrbProfileDisplayMode = isSignedIn \? 'signed_in_account' : 'local_profile'/)
  })
})

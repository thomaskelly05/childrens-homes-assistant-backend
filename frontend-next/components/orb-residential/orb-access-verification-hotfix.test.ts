import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB access verification hotfix', () => {
  it('shows verifying-access copy only while authenticated access is loading', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /Verifying your ORB access…/)
    assert.match(gate, /case 'checking_access'/)
    assert.match(gate, /accessStatus === 'loading'/)
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')
    assert.match(loading, /Checking your session…/)
  })

  it('access hook classifies HTTP failures without infinite loading', () => {
    const hook = read('hooks/use-orb-account-state.ts')
    assert.match(hook, /accessFailureKind/)
    assert.match(hook, /classifyAccessFailure/)
    assert.match(hook, /Promise\.race\(\[[\s\S]*fetchOrbAccessCached/)
    assert.match(hook, /setAccessLoading\(false\)/)
  })

  it('fetchOrbAccess propagates non-200 statuses via AuthApiError', () => {
    const client = read('lib/orb/orb-billing-client.ts')
    assert.match(client, /authFetchResponse\(ORB_BILLING_API\.access/)
    assert.match(client, /if \(!response\.ok\)/)
    assert.match(client, /AuthApiError/)
  })

  it('gate handles 401, 402, 403 safety, 429, and timeout branches', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /accessFailureKind !== 'unauthorized'/)
    assert.match(gate, /case 'inactive'/)
    assert.match(gate, /case 'safety_required'/)
    assert.match(gate, /case 'access_retry'/)
    assert.match(gate, /deriveOrbGateState/)
    assert.match(gate, /OrbAccessRetryScreen/)
  })
})

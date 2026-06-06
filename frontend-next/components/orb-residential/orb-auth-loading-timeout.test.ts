import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB auth loading timeout fallback', () => {
  it('loading screen shows branded checking copy and timeout actions', () => {
    const loading = read('components/orb-residential/orb-auth-loading-screen.tsx')
    assert.match(loading, /Checking your session/)
    assert.match(loading, /Taking longer than expected/)
    assert.match(loading, /data-orb-auth-loading-retry/)
    assert.match(loading, /data-orb-auth-loading-back/)
    assert.match(loading, /OrbHeroSphere/)
    assert.doesNotMatch(loading, />Loading…</)
  })

  it('auth context times out session checks instead of hanging', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /ORB_AUTH_LOADING_TIMEOUT_MS/)
    assert.match(auth, /Promise\.race/)
    assert.match(auth, /setStatus\('unauthenticated'\)/)
  })

  it('OrbAuthGate wires retry and back-to-sign-in handlers', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /onRetry=\{handleRetry\}/)
    assert.match(gate, /onBackToSignIn=\{handleBackToSignIn\}/)
    assert.match(gate, /accessTimedOut/)
  })
})

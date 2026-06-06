import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB auth gate timeout to login', () => {
  it('shows branded loading while auth status is loading', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'checking_auth'[\s\S]*OrbAuthLoadingScreen/)
  })

  it('renders embedded login after auth gate timeout', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /authFallback[\s\S]*OrbLoginScreen[\s\S]*embedded/)
    assert.match(gate, /AUTH_FALLBACK_MESSAGE/)
  })

  it('renders login immediately when unauthenticated', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'unauthenticated'[\s\S]*OrbLoginScreen/)
  })

  it('access hang falls through to safe retry screen with access message', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /accessFallback/)
    assert.match(gate, /ACCESS_FALLBACK_MESSAGE/)
    assert.match(gate, /OrbAccessRetryScreen/)
  })

  it('authenticated inactive users still reach upgrade screen', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /OrbUpgradeScreen/)
    assert.match(gate, /case 'inactive'/)
  })

  it('authenticated active users still render children', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'ready'[\s\S]*\{children\}/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB security — no product flash', () => {
  it('middleware converges legacy login routes to /orb without server-side product HTML', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /redirectToOrbFrontDoor/)
    assert.match(middleware, /\/orb\/login/)
    assert.match(middleware, /returnUrl/)
    assert.doesNotMatch(middleware, /isOrbProductPath\(pathname\) && !hasSessionCookie/)
  })

  it('middleware keeps billing and signup public', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /\/orb\/signup/)
    assert.match(middleware, /\/orb\/billing/)
    assert.match(middleware, /\/orb\/billing\/success/)
    assert.match(middleware, /\/orb\/billing\/cancel/)
  })

  it('middleware sets no-store cache for ORB product paths', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /Cache-Control/)
    assert.match(middleware, /no-store/)
  })

  it('OrbAuthGate never mounts product children while loading or unauthenticated', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'checking_auth':/)
    assert.match(gate, /case 'unauthenticated':[\s\S]*OrbLoginScreen/)
    assert.match(gate, /productChildrenMounted = gateState === 'ready'/)
    assert.match(gate, /case 'ready':[\s\S]*\{children\}/)
    const readyOnlyChildren = gate.split("case 'ready'")[1]?.split("case 'signing_out'")[0] ?? ''
    assert.match(readyOnlyChildren, /\{children\}/)
  })

  it('product shell stays behind OrbAuthGate', () => {
    const shell = read('components/orb/orb-shell.tsx')
    assert.match(shell, /<OrbAuthGate mode="product">/)
    assert.match(shell, /OrbProductShell/)
    assert.match(shell, /data-orb-product-mounted/)
  })
})

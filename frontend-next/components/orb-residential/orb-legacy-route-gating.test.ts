import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB legacy route gating', () => {
  const legacyPages = [
    'app/orb/ask/page.tsx',
    'app/orb/profile/page.tsx',
    'app/orb/intelligence-map/page.tsx',
  ]

  for (const page of legacyPages) {
    it(`${page} is wrapped in OrbAuthGate mode product`, () => {
      const source = read(page)
      assert.match(source, /OrbAuthGate/)
      assert.match(source, /mode="product"/)
      assert.doesNotMatch(source, /OrbCareCompanion/)
    })
  }

  it('middleware treats legacy paths as ORB product paths', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /isOrbProductPath/)
    assert.match(middleware, /\/orb\/login/)
    assert.doesNotMatch(middleware, /\/orb\/ask[\s\S]*orbPublicPrefixes/)
  })

  it('legacy pages preserve returnUrl via OrbAuthGate', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /returnUrl=\{returnUrl\}/)
    assert.match(gate, /usePathname/)
  })

  it('public ORB paths remain outside product gate', () => {
    const middleware = read('middleware.ts')
    assert.match(middleware, /\/orb\/signup/)
    assert.match(middleware, /\/orb\/billing/)
    assert.match(middleware, /\/orb\/onboarding/)
  })
})

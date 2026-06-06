import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-access-request-dedupe', () => {
  it('access cache module dedupes in-flight requests', () => {
    const cache = read('lib/orb/orb-access-request-cache.ts')
    assert.match(cache, /let inFlight/)
    assert.match(cache, /if \(inFlight && !force\)/)
    assert.match(cache, /ACCESS_CACHE_MS/)
    assert.match(cache, /resetOrbAccessRequestCache/)
  })

  it('account state uses cached access fetch', () => {
    const hook = read('hooks/use-orb-account-state.ts')
    assert.match(hook, /fetchOrbAccessCached/)
    assert.match(hook, /accessInFlight/)
    assert.match(hook, /resetOrbAccessRequestCache\('retry'\)/)
  })

  it('logout clears access cache', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /resetOrbAccessRequestCache\('logout'\)/)
  })
})

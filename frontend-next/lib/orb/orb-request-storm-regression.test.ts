import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB request storm regression guard', () => {
  it('request storm guard tracks bootstrap routes', () => {
    const guard = read('lib/orb/orb-request-storm-guard.ts')
    assert.match(guard, /recordOrbBootstrapRequest/)
    assert.match(guard, /BOOTSTRAP_WINDOW_MS/)
    assert.match(guard, /verdict/)
    assert.match(guard, /auth_me/)
    assert.match(guard, /conversation_stream/)
  })

  it('access cache records bootstrap access calls', () => {
    const cache = read('lib/orb/orb-access-request-cache.ts')
    assert.match(cache, /recordOrbBootstrapRequest\('access'\)/)
  })
})

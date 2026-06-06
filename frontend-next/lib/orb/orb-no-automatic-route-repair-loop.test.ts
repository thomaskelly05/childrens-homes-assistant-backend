import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB no automatic route repair loop', () => {
  it('orb auth gate does not auto replace /orb during gate boot', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.doesNotMatch(gate, /router\.replace\('\/orb'\)/)
    assert.doesNotMatch(gate, /router\.push\('\/orb'\)/)
    assert.match(gate, /wrapOrbRouter/)
  })

  it('auth context skips redirect loop on ORB surface', () => {
    const auth = read('contexts/auth-context.tsx')
    assert.match(auth, /if \(isOrbSurfacePath\(pathname\)\) return/)
  })
})

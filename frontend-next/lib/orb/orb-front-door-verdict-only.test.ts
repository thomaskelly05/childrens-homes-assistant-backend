import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB front-door verdict-only bootstrap', () => {
  it('OrbAuthGate fetches /orb/front-door/verdict once on mount', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /fetchOrbFrontDoorVerdict/)
    assert.match(gate, /verdictFetchedRef/)
    assert.doesNotMatch(gate, /useOrbAccountState\(/)
  })

  it('verdict client dedupes in-flight requests', () => {
    const client = read('lib/orb/orb-front-door-verdict-client.ts')
    assert.match(client, /verdictInFlight/)
    assert.match(client, /ORB_FRONT_DOOR_VERDICT_PATH/)
  })
})

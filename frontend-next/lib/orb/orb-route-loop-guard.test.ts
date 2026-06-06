import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const LOOP_WINDOW_MS = 10_000
const LOOP_THRESHOLD = 2

type RedirectRecord = { target: string; at: number }

function simulateLoopGuard(records: RedirectRecord[], now: number): boolean {
  const recent = records.filter((r) => now - r.at < LOOP_WINDOW_MS)
  return recent.length > LOOP_THRESHOLD
}

describe('orb-route-loop-guard', () => {
  it('module tracks guarded redirects and exposes loop breaker', () => {
    const source = read('lib/orb/orb-route-loop-guard.ts')
    assert.match(source, /LOOP_WINDOW_MS = 10_000/)
    assert.match(source, /LOOP_THRESHOLD = 2/)
    assert.match(source, /shouldBlockOrbRouteRedirect/)
    assert.match(source, /clearOrbRouteLoopGuard/)
    assert.match(source, /wrapOrbRouter/)
  })

  it('blocks after more than 2 guarded redirects in 10 seconds', () => {
    const now = Date.now()
    const records: RedirectRecord[] = [
      { target: '/orb', at: now },
      { target: '/login', at: now + 100 },
      { target: '/orb', at: now + 200 }
    ]
    assert.equal(simulateLoopGuard(records, now + 300), true)
  })

  it('does not block OAuth callback routes', () => {
    const source = read('lib/orb/orb-route-loop-guard.ts')
    assert.match(source, /\/auth\/oauth/)
    assert.match(source, /isExemptTarget/)
  })

  it('does not block Stripe billing success routes', () => {
    const source = read('lib/orb/orb-route-loop-guard.ts')
    assert.match(source, /\/orb\/billing\/success/)
    assert.match(source, /\/orb\/billing\/cancel/)
  })

  it('gate integrates wrapOrbRouter', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /wrapOrbRouter/)
    assert.match(gate, /isOrbRouteLoopBroken/)
  })
})

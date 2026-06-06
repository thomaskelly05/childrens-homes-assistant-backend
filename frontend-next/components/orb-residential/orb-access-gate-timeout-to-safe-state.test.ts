import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB access gate timeout to safe state', () => {
  it('uses module-level access deadline that survives remounts', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    const deadline = read('lib/orb/orb-access-loading-deadline.ts')
    assert.match(gate, /ORB_ACCESS_GATE_FALLBACK_MS/)
    assert.match(gate, /markOrbAccessLoadingStart/)
    assert.match(gate, /hasOrbAccessLoadingDeadlinePassed/)
    assert.match(deadline, /orbAccessLoadingStartedAt/)
  })

  it('authenticated access timeout renders retry screen not login', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /if \(\s*accessFallback[\s\S]*OrbAccessRetryScreen/)
    assert.doesNotMatch(gate, /if \(\s*accessFallback[\s\S]*OrbLoginScreen/)
  })

  it('retry screen exposes try again and back to sign in actions', () => {
    const retry = read('components/orb-residential/orb-access-retry-screen.tsx')
    assert.match(retry, /Try again/)
    assert.match(retry, /Back to sign in/)
    assert.match(retry, /data-orb-access-retry/)
  })

  it('manual retry resets access deadline', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /resetOrbAccessLoadingDeadline/)
    assert.match(gate, /handleAccessRetry/)
  })
})

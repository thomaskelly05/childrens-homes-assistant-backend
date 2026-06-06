import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('orb-passkey-status-dedupe', () => {
  it('passkey cache dedupes in-flight and tracks page lifecycle count', () => {
    const cache = read('lib/auth/passkey-status-cache.ts')
    assert.match(cache, /pageLifecycleRequestCount/)
    assert.match(cache, /inFlight/)
    assert.match(cache, /allowedContext === 'none'/)
  })

  it('gate no longer triggers passkey status on remount', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.doesNotMatch(gate, /loadPasskeyStatus/)
  })

  it('settings security section allows passkey context', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(settings, /allowPasskeyStatusFetch\('settings'\)/)
  })

  it('account hook uses cached passkey fetch for settings only', () => {
    const account = read('hooks/use-orb-account-state.ts')
    assert.match(account, /fetchPasskeyStatusCached/)
    assert.match(account, /allowPasskeyStatusFetch\('settings'\)/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB OAuth provider diagnostics wiring', () => {
  it('login screen fetches provider availability from /orb/auth/providers', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const billing = read('lib/orb/orb-billing-client.ts')
    assert.match(billing, /authProviders:\s*'\/orb\/auth\/providers'/)
    assert.match(login, /ORB_BILLING_API\.authProviders/)
    assert.match(login, /providers\.google/)
    assert.match(login, /providers\.microsoft/)
    assert.match(login, /providers\.apple/)
  })

  it('disabled OAuth buttons use professional unavailable copy', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /Google sign-in unavailable/)
    assert.match(login, /Microsoft sign-in unavailable/)
    assert.match(login, /Apple sign-in unavailable/)
    assert.doesNotMatch(login, /Google — not configured/)
  })

  it('OAuth start URLs use backend standalone routes', () => {
    const client = read('lib/orb/orb-billing-client.ts')
    const nav = read('lib/orb/orb-oauth-navigation.ts')
    assert.match(client, /\/orb\/standalone\/auth\/oauth\//)
    assert.match(nav, /navigateOrbOAuthStart/)
  })

  it('backend diagnostics endpoint documents routes without secrets', () => {
    const repoRoot = join(root, '..')
    const service = readFileSync(join(repoRoot, 'services/orb_production_config_service.py'), 'utf8')
    const routes = readFileSync(join(repoRoot, 'routers/orb_launch_routes.py'), 'utf8')
    assert.match(service, /oauth_provider_diagnostics/)
    assert.match(service, /required_env_vars/)
    assert.match(service, /redirect_uri/)
    assert.doesNotMatch(service, /client_secret/)
    assert.match(routes, /oauth_diagnostics/)
  })
})

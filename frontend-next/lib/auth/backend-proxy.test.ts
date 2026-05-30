import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('backend proxy route', () => {
  it('route handler forwards all HTTP methods and uses shared proxy helper', () => {
    const route = readFileSync(join(root, 'app/backend/[...path]/route.ts'), 'utf8')
    assert.match(route, /proxyRequestToBackend/)
    assert.match(route, /export const GET/)
    assert.match(route, /export const POST/)
    assert.match(route, /export const DELETE/)
  })

  it('proxy helper preserves status, strips hop-by-hop headers, and forwards cookies', () => {
    const helper = readFileSync(join(root, 'lib/auth/backend-proxy.ts'), 'utf8')
    assert.match(helper, /sanitizeResponseHeaders/)
    assert.match(helper, /HOP_BY_HOP_HEADERS/)
    assert.match(helper, /cookie/)
    assert.match(helper, /x-csrf-token/i)
    assert.match(helper, /upstream\.body/)
    assert.match(helper, /status: upstream\.status/)
  })

  it('auth client prefixes ORB and auth paths with resolveAuthApiPath', () => {
    const api = readFileSync(join(root, 'lib/auth/api.ts'), 'utf8')
    assert.match(api, /resolveAuthApiPath/)
    assert.match(api, /ORB_AUTH_SIGN_IN_MESSAGE/)
  })

  it('standalone client maps auth failures to sign-in message', () => {
    const client = readFileSync(join(root, 'lib/orb/standalone-client.ts'), 'utf8')
    assert.match(client, /ORB_AUTH_SIGN_IN_MESSAGE/)
    assert.match(client, /isOrbAuthRequiredStatus/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const repoRoot = join(root, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readRepo(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

describe('ORB OAuth session handoff', () => {
  it('callback redirects through app /backend session complete proxy', () => {
    const routes = readRepo('routers/orb_oauth_routes.py')
    assert.match(routes, /\/backend\/orb\/standalone\/auth\/oauth\/session\/complete/)
    assert.match(routes, /store_oauth_session_handoff/)
    assert.match(routes, /establish_browser_session/)
  })

  it('session complete route sets auth cookies on response', () => {
    const routes = readRepo('routers/orb_oauth_routes.py')
    assert.match(routes, /async def orb_oauth_session_complete/)
    assert.match(routes, /_set_session_cookie/)
    assert.match(routes, /_set_csrf_cookie/)
  })

  it('front-door gate routes inactive authenticated users to billing not login', () => {
    const gate = read('components/orb-residential/orb-auth-gate.tsx')
    assert.match(gate, /case 'inactive'/)
    assert.match(gate, /OrbUpgradeScreen/)
    const verdictClient = read('lib/orb/orb-front-door-verdict-client.ts')
    assert.match(verdictClient, /case 'inactive'/)
  })
})

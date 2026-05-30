import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('standalone ORB auth errors', () => {
  it('maps 401/403 auth failures to sign-in CTA copy', () => {
    const api = readFileSync(join(root, 'auth/api.ts'), 'utf8')
    const client = readFileSync(join(root, 'orb/standalone-client.ts'), 'utf8')
    const guest = readFileSync(join(root, 'orb/standalone-guest-response.ts'), 'utf8')

    assert.match(api, /ORB_AUTH_SIGN_IN_MESSAGE = 'Please sign in to use ORB Residential\.'/)
    assert.match(api, /isOrbAuthRequiredStatus/)
    assert.match(client, /ORB_AUTH_SIGN_IN_MESSAGE/)
    assert.match(client, /isOrbAuthRequiredStatus\(response\.status/)
    assert.match(client, /message: ORB_AUTH_SIGN_IN_MESSAGE/)
    assert.match(guest, /please sign in to use orb residential/i)
  })

  it('orb care companion shows sign-in CTA for auth prompt messages', () => {
    const companion = readFileSync(
      join(root, '..', 'components/orb-standalone/orb-care-companion.tsx'),
      'utf8'
    )
    assert.match(companion, /isStandaloneOrbSignInPromptMessage\(error\)/)
    assert.match(companion, /OrbSignInCallToAction/)
    assert.match(companion, /hasBackendSession/)
  })
})

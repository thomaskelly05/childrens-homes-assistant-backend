import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB OAuth login buttons', () => {
  it('renders Google and Microsoft launch providers only', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /Continue with Google/)
    assert.match(authCard, /Continue with Microsoft/)
    assert.doesNotMatch(authCard, /Continue with Apple/)
    assert.doesNotMatch(authCard, /provider="apple"/)
  })

  it('shows Microsoft button only when enabled in provider config', () => {
    const authCard = read('components/orb-residential/orb-login-auth-card.tsx')
    assert.match(authCard, /oauth\.microsoft \?/)
    assert.match(authCard, /orbOAuthStartUrl\('microsoft', returnUrl\)/)
  })

  it('uses Microsoft OAuth start route via orbOAuthStartUrl', () => {
    const client = read('lib/orb/orb-billing-client.ts')
    assert.match(client, /\/orb\/standalone\/auth\/oauth\/\$\{provider\}\/start/)
    assert.match(client, /orbOAuthStartUrl/)
  })

  it('login screen hydrates Google and Microsoft from /orb/auth/providers', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /providers\.google/)
    assert.match(login, /providers\.microsoft/)
    assert.doesNotMatch(login, /providers\.apple/)
  })

  it('OrbUserAvatar supports initials fallback for users without avatar_url', () => {
    const avatar = read('components/orb-residential/orb-user-avatar.tsx')
    assert.match(avatar, /data-orb-user-avatar-initials/)
    assert.match(avatar, /avatarUrl/)
  })
})

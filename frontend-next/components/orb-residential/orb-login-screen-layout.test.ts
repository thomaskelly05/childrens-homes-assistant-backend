import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB premium login screen layout', () => {
  it('desktop two-column layout markers exist', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-login-center.css')

    assert.match(login, /data-orb-login-two-column/)
    assert.match(login, /lg:grid-cols-2/)
    assert.match(login, /data-orb-login-hero-centered/)
    assert.match(login, /data-orb-login-panel-centered/)
    assert.match(css, /orb-login-hero/)
    assert.match(css, /orb-login-panel/)
  })

  it('right sign-in panel is centred in a premium card', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /orb-login-card/)
    assert.match(login, /orb-login-panel-inner/)
    assert.match(login, /justify-center/)
    assert.match(login, /max-w-md/)
  })

  it('left hero is balanced with trust copy and sphere', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /ORB Residential/)
    assert.match(login, /Powered by IndiCare Intelligence/)
    assert.match(login, /Record better\. Reflect faster\. Respond safer\./)
    assert.match(login, /data-orb-login-trust-points/)
    assert.match(login, /orb-login-hero-sphere-wrap/)
    assert.match(login, /OrbHeroSphere/)
  })

  it('mobile layout is single column', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /data-orb-login-mobile-single-column/)
    assert.match(login, /lg:hidden/)
    assert.match(login, /hidden flex-col justify-center lg:flex/)
  })

  it('authenticated users on login route redirect away', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /status === 'authenticated'/)
    assert.match(login, /resolvePostLoginRoute/)
  })

  it('OAuth, email, passkey and create account remain available', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /Continue with Microsoft/)
    assert.match(login, /data-testid="orb-login-email"/)
    assert.match(login, /data-orb-passkey-sign-in/)
    assert.match(login, /href="\/orb\/signup"/)
    assert.match(login, /OrbLegalLinks/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile login layout', () => {
  it('uses single-column mobile markers and scrollable shell', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-login-center.css')
    assert.match(login, /data-orb-login-mobile-single-column/)
    assert.match(login, /data-orb-login-scrollable/)
    assert.match(css, /100svh/)
    assert.match(css, /safe-area-inset-bottom/)
    assert.match(css, /overflow-y:\s*auto/)
  })

  it('scales down mobile sphere and adds safe bottom padding', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const css = read('app/orb/orb-login-center.css')
    assert.match(login, /data-orb-login-mobile-hero/)
    assert.match(login, /scale-\[0\.62\]/)
    assert.match(css, /data-orb-login-safe-bottom/)
    assert.match(css, /data-orb-login-mobile-hero/)
  })

  it('OAuth buttons are readable when disabled', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const button = read('components/orb-residential/ui/orb-auth-button.tsx')
    const css = read('app/orb/orb-login-center.css')
    assert.match(login, /sign-in unavailable/)
    assert.match(button, /unavailableLabel/)
    assert.match(css, /orb-auth-button--disabled/)
  })

  it('passkey section can collapse on compact viewports', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    assert.match(login, /compactViewport/)
    assert.match(login, /data-orb-passkey-toggle/)
  })
})

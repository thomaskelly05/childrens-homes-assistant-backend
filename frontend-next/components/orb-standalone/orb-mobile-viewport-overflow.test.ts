import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB mobile viewport overflow guards', () => {
  it('residential sidebar grid is desktop-only (no reserved column on mobile)', () => {
    const premium = readComponent('app/orb/orb-premium-tokens.css')
    const gridBlock = premium.match(
      /@media \(min-width: 1024px\)\s*\{[\s\S]*?\.orb-chat-layout--residential \.orb-chat-shell\s*\{[\s\S]*?grid-template-columns/
    )
    assert.ok(gridBlock, 'residential shell grid must live inside lg breakpoint')
    assert.doesNotMatch(
      premium.slice(0, premium.indexOf('@media (min-width: 1024px)')),
      /\.orb-chat-layout--residential \.orb-chat-shell\s*\{[\s\S]*?grid-template-columns/
    )
  })

  it('mobile CSS uses flex shell and viewport-bounded composer', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(mobileCss, /\[data-orb-shell='true'\]/)
    assert.match(mobileCss, /\.orb-residential-root/)
    assert.match(mobileCss, /\.orb-chat-shell\s*\{[^}]*display:\s*flex/)
    assert.match(mobileCss, /grid-template-columns:\s*none/)
    assert.match(mobileCss, /\.orb-composer-dock\s*\{[^}]*calc\(100vw - 24px/)
    assert.match(mobileCss, /box-sizing:\s*border-box/)
  })

  it('shell root class constrains width on mobile', () => {
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(theme, /max-w-\[100vw\]/)
    assert.match(theme, /overflow-x-hidden/)
  })

  it('exports a browser audit for visible shell width at 390px', () => {
    const audit = readComponent('components/orb-standalone/orb-ui-audit.ts')
    assert.match(audit, /export function auditOrbMobileViewportOverflow/)
    assert.match(audit, /ORB_MOBILE_VIEWPORT_AUDIT/)
    assert.match(audit, /\[data-orb-starter-cards\]/)
  })
})

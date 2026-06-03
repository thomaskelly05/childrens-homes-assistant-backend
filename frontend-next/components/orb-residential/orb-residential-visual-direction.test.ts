import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential visual direction regressions', () => {
  it('OrbPresence uses static brand image asset (no CSS sphere recreation)', () => {
    const brandCss = read('app/orb/orb-brand-asset.css')
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-brand-asset\.css/)
    assert.match(brandCss, /orb-brand-image/)
    assert.match(brandCss, /display:\s*none !important/)
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    assert.match(presence, /OrbBrandImage/)
    assert.doesNotMatch(presence, /OrbSphere|premium-mobile-orb__sphere|glass-orb-mark__sphere/)
    const glow = read('components/orb-standalone/orb-glow.tsx')
    assert.match(glow, /OrbBrandImage/)
    assert.doesNotMatch(glow, /OrbSphere/)
  })

  it('light mode mobile workspace must not use launch dark lock panel colours', () => {
    const mobile = read('app/orb/orb-mobile.css')
    assert.doesNotMatch(mobile, /launch dark lock/i)
    const lightWs = mobile.match(
      /\.orb-chat-layout--residential\.orb-theme-light \.orb-main-workspace[\s\S]*?\}/
    )?.[0]
    assert.ok(lightWs, 'expected light main-workspace rule')
    assert.match(lightWs!, /#f7fbff|var\(--orb-mobile-ws-panel/)
    assert.doesNotMatch(lightWs!, /#070b14/)
    assert.match(lightWs!, /#0f172a|var\(--orb-mobile-ws-text/)
    assert.doesNotMatch(lightWs!, /#f7faff/)
  })

  it('desktop residential tailwind remap is scoped to dark theme only', () => {
    const desktop = read('app/orb/orb-desktop.css')
    assert.doesNotMatch(
      desktop,
      /\.orb-chat-layout--residential \.bg-slate-50[\s\S]*#05070d/
    )
    assert.match(desktop, /\.orb-chat-layout--residential\.orb-theme-dark \.bg-slate-50/)
  })

  it('dark-only surfaces in premium tokens are scoped to orb-theme-dark', () => {
    const premium = read('app/orb/orb-premium-tokens.css')
    assert.match(premium, /\.orb-theme-dark \[data-orb-app-modal='true'\] \.orb-panel-modal/)
    assert.match(premium, /\.orb-theme-light \[data-orb-app-modal='true'\] \.orb-panel-modal/)
    assert.match(premium, /\.orb-theme-light \.orb-document-panel \.orb-doc-glass-card/)
    assert.match(premium, /\.orb-theme-dark \.orb-document-panel \.orb-doc-glass-card/)
  })

  it('residential root fallbacks default to light palette before theme hydration', () => {
    const premium = read('app/orb/orb-premium-tokens.css')
    const rootBlock = premium.match(/\.orb-residential-root\s*\{[^}]+\}/s)?.[0]
    assert.ok(rootBlock, 'expected .orb-residential-root block')
    assert.match(rootBlock!, /--orb-premium-bg-deep:[\s\S]*#f7fbff/)
    assert.match(rootBlock!, /--orb-premium-text:[\s\S]*#0f172a/)
    assert.doesNotMatch(rootBlock!, /--orb-premium-bg-deep:[\s\S]*#05070d/)
  })

  it('header brand text has explicit light and dark residential rules', () => {
    const premium = read('app/orb/orb-premium-tokens.css')
    assert.match(premium, /\.orb-theme-light[\s\S]*\[data-orb-header-title\][\s\S]*#0f172a/)
    assert.match(premium, /\.orb-theme-light[\s\S]*\[data-orb-mobile-header-tagline\][\s\S]*#475569/)
    assert.match(premium, /\.orb-theme-dark[\s\S]*\[data-orb-mobile-header-tagline\][\s\S]*#94a3b8/)
    const layout = read('components/orb/orb-layout.tsx')
    assert.match(layout, /data-orb-header-brand-title/)
    assert.match(layout, /font-bold/)
  })

  it('light mode composer input text is not forced to premium white', () => {
    const mobile = read('app/orb/orb-mobile.css')
    assert.match(mobile, /orb-theme-light[\s\S]*orb-composer-glass[\s\S]*#0f172a|var\(--orb-res-text/)
    assert.doesNotMatch(
      mobile,
      /html\[data-orb-residential='1'\] \.orb-composer-glass[\s\S]*#f7faff/
    )
  })

  it('account and billing light modal cards use white semantic surfaces on mobile', () => {
    const mobile = read('app/orb/orb-mobile.css')
    assert.match(mobile, /orb-theme-light[\s\S]*\[data-orb-billing-modal\][\s\S]*#ffffff/)
    assert.match(mobile, /orb-theme-light[\s\S]*\[data-orb-account-modal\][\s\S]*#ffffff/)
  })

  it('residential mobile tokens use light fallbacks not launch-dark lock', () => {
    const premium = read('app/orb/orb-premium-tokens.css')
    assert.doesNotMatch(premium, /residential launch is dark-only/i)
    const mobileBlock = premium.match(/html\[data-orb-residential='1'\]\s*\{[^}]+\}/s)?.[0]
    assert.ok(mobileBlock)
    assert.match(mobileBlock!, /--orb-mobile-bg: var\(--orb-mobile-ws-panel, #f7fbff\)/)
    assert.match(mobileBlock!, /--orb-text: var\(--orb-mobile-ws-text, #0f172a\)/)
    assert.doesNotMatch(mobileBlock!, /--orb-mobile-bg: #070b14/)
  })
})

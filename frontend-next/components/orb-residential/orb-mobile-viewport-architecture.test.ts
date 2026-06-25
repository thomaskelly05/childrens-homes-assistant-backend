import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile viewport architecture pass', () => {
  const css = read('app/orb/orb-residential-shell.css')
  const layout = read('components/orb/orb-layout.tsx')
  const companion = read('components/orb-standalone/orb-care-companion.tsx')
  const shell = read('components/orb-residential/orb-mobile-shell.tsx')
  const workspaceFrame = read('components/orb-standalone/orb-workspace-frame.tsx')
  const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
  const write = read('components/orb-write/orb-write-standalone-panel.tsx')
  const writeEditor = read('components/orb-write/orb-write-editor.tsx')
  const voice = read('components/orb-standalone/orb-voice-station-content.tsx')
  const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
  const help = read('components/orb-standalone/orb-help-panel.tsx')
  const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
  const appPanel = read('components/orb-standalone/orb-app-panel-shell.tsx')
  const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')

  it('mobile shell has fixed top bar, scrollable content region, fixed bottom composer', () => {
    assert.match(shell, /ORB_MOBILE_SHELL_TOP_BAR_ATTR/)
    assert.match(shell, /ORB_MOBILE_SHELL_SCROLL_ATTR/)
    assert.match(shell, /ORB_MOBILE_SHELL_BOTTOM_COMPOSER_ATTR/)
    assert.match(layout, /data-orb-mobile-shell-scroll/)
    assert.match(companion, /data-orb-mobile-shell-bottom-composer/)
    assert.match(companion, /data-orb-mobile-shell-scroll-region/)
    assert.match(css, /Mobile viewport architecture pass/)
    assert.match(css, /\[data-orb-mobile-shell-top-bar\]/)
    assert.match(css, /\[data-orb-mobile-shell-scroll\]/)
    assert.match(css, /\[data-orb-mobile-shell-bottom-composer\]/)
    assert.match(css, /overflow:\s*hidden/)
    assert.match(css, /100dvh/)
  })

  it('composer is anchored to bottom and not pushed upward by judgement text', () => {
    assert.match(companion, /data-orb-mobile-shell-bottom-composer/)
    assert.match(companion, /data-orb-composer-judgement-compact/)
    assert.match(css, /\[data-orb-mobile-shell-bottom-composer\]/)
    assert.match(css, /margin-top:\s*0/)
    assert.match(css, /\[data-orb-composer-judgement-compact\]/)
    assert.match(css, /padding-bottom:\s*0/)
  })

  it('judgement text is compact and inside bottom composer area', () => {
    assert.match(companion, /orb-composer-dock-judgement/)
    assert.match(companion, /data-orb-composer-judgement-compact/)
    assert.match(companion, /data-orb-composer-safety-line/)
    assert.match(css, /\[data-orb-composer-judgement-compact\]/)
    assert.match(css, /font-size:\s*0\.625rem/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('home quick actions live in scrollable content not under composer', () => {
    assert.match(companion, /data-orb-home-quick-actions-mobile/)
    assert.match(companion, /data-orb-mobile-shell-scroll-region/)
    assert.match(css, /\[data-orb-home-quick-actions-mobile='true'\]/)
    assert.match(css, /\[data-orb-mobile-shell-scroll-region\]/)
  })

  it('station headers use compact mobile class and attributes', () => {
    assert.match(shell, /ORB_MOBILE_STATION_HEADER_CLASS/)
    assert.match(layout, /data-orb-mobile-station-header/)
    assert.match(workspaceFrame, /orb-mobile-station-header/)
    assert.match(workspaceFrame, /data-orb-mobile-station-header/)
    assert.match(dictate, /data-orb-mobile-station-header/)
    assert.match(write, /data-orb-mobile-station-header/)
    assert.match(appPanel, /data-orb-mobile-station-header/)
    assert.match(css, /\.orb-mobile-station-header/)
    assert.match(css, /\[data-orb-mobile-station-header\]/)
  })

  it('Voice tabs and content have bottom safe padding not hidden behind Safari', () => {
    assert.match(voice, /data-orb-voice-mobile-action-dock/)
    assert.match(css, /\[data-orb-voice-live-rail-slot\]/)
    assert.match(css, /\[data-orb-voice-mobile-action-dock\]/)
    assert.match(css, /safe-area-inset-bottom/)
    assert.match(css, /min-height:\s*clamp\(8\.5rem,\s*24vh,\s*12rem\)/)
  })

  it('ORB Write editor has internal scroll and bottom safe padding', () => {
    assert.match(write, /data-orb-write-mobile-layout/)
    assert.match(writeEditor, /data-orb-write-notepad-body/)
    assert.match(workspaceFrame, /data-orb-mobile-shell-scroll-region/)
    assert.match(css, /\[data-orb-write-notepad-body\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('Records list and detail use internal scroll and safe padding', () => {
    assert.match(saved, /data-orb-records-mobile-list/)
    assert.match(saved, /data-orb-records-mobile-detail/)
    assert.match(css, /\[data-orb-records-mobile-list='true'\]/)
    assert.match(css, /\[data-orb-records-mobile-mode='detail'\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('Help and Safety final paragraph is reachable above Safari toolbar', () => {
    assert.match(help, /data-orb-help-panel-safe-bottom/)
    assert.match(help, /data-orb-help-panel-scroll/)
    assert.match(css, /\[data-orb-help-panel-scroll\]/)
    assert.match(css, /\[data-orb-help-panel-safe-bottom\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('Settings final options are reachable on mobile stack', () => {
    assert.match(settings, /data-orb-settings-mobile-layout/)
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(css, /\[data-orb-settings-mobile-layout='stack'\]/)
    assert.match(css, /safe-area-inset-bottom/)
  })

  it('no station horizontal overflow on mobile shell', () => {
    assert.match(companion, /data-orb-no-horizontal-overflow/)
    assert.match(css, /max-width:\s*100vw/)
    assert.match(css, /overflow-x:\s*hidden/)
  })

  it('drawer close behaviour from previous pass still works', () => {
    assert.match(sidebar, /onClose\?\.\(\)/)
    assert.match(sidebar, /handleVisibleNavClick\(item\.id\)/)
    assert.match(companion, /setSidebarOpen\(false\)/)
  })
})

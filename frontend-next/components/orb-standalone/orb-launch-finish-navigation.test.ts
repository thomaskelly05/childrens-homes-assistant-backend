import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB launch finish navigation', () => {
  it('sidebar Chat opens chat directly without starting a new chat', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(sidebar, /onOpenChat/)
    assert.match(sidebar, /if \(isChat\) \{[\s\S]*onOpenChat\?\.\(\)/)
    assert.match(companion, /onOpenChat=\{openChatPanel\}/)
    assert.match(companion, /const openChatPanel = useCallback\(\(\) => \{[\s\S]*closePanel\(\)/)
  })

  it('primary stations open workspace panels in the main thread', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    for (const station of ['orb_dictate', 'orb_voice', 'orb_write', 'templates', 'documents', 'saved_outputs']) {
      assert.match(companion, new RegExp(`open=\\{activePanel === '${station}'`))
    }
  })

  it('settings and account use overlay drawer shell not workspace swap', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    const appModal = read('components/orb-standalone/orb-app-modal.tsx')
    assert.match(appModal, /orbOverlayDrawerShellProps/)
    assert.match(settings, /orbOverlayDrawerShellProps/)
    assert.match(settings, /data-orb-settings-drawer/)
    assert.match(account, /orbOverlayDrawerShellProps/)
    assert.doesNotMatch(settings, /orbStationShellProps\(true/)
  })

  it('billing opens as modal overlay', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    assert.match(companion, /OrbBillingModal[\s\S]*open=\{activePanel === 'billing'\}/)
    assert.match(billing, /data-orb-billing-modal/)
    assert.match(billing, /data-orb-billing-cta-bar/)
  })

  it('workspace stations use compact chrome for direct studio entry', () => {
    const appModal = read('components/orb-standalone/orb-app-modal.tsx')
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(appModal, /compactChrome: true/)
    assert.match(write, /compactChrome/)
    assert.match(dictate, /compactChrome/)
  })

  it('station deep links remain supported', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /searchParams\.get\('station'\)/)
    assert.match(companion, /stationParam === 'dictate'/)
    assert.match(companion, /'orb_dictate'/)
    assert.match(companion, /stationParam === 'write'/)
    assert.match(companion, /'orb_write'/)
  })
})

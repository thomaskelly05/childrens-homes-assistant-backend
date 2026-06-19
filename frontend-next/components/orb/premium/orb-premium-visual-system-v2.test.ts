import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Premium Visual System v2', () => {
  it('v2 CSS layer ships with design tokens and imports in layout', () => {
    const css = read('components/orb/premium/orb-premium-v2.css')
    const layout = read('app/orb/layout.tsx')
    const tokens = read('app/orb/orb-premium-tokens.css')
    assert.match(css, /--orb-v2-bg-workspace/)
    assert.match(css, /--orb-v2-glass-surface/)
    assert.match(css, /--orb-v2-primary-gradient/)
    assert.match(css, /data-orb-visual-system='v2'/)
    assert.match(tokens, /orb-v2-atmosphere|orb-presence--hero/)
    assert.match(layout, /orb-premium-tokens\.css|orb-theme\.css/)
  })

  it('bootstrap sets data-orb-visual-system=v2 on html', () => {
    const appearance = read('lib/orb/orb-appearance.ts')
    assert.match(appearance, /data-orb-visual-system','v2'/)
  })

  it('sidebar renders simplified residential nav items', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    for (const id of ['orb_dictate', 'orb_write', 'orb_voice', 'saved']) {
      assert.match(sidebar, new RegExp(`'${id}'`))
    }
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.match(sidebar, /data-orb-sidebar-account-card/)
    assert.doesNotMatch(sidebar, /DESKTOP_PRACTICE_NAV/)
    assert.doesNotMatch(sidebar, /data-orb-sidebar-library/)
  })

  it('chat home renders premium suggestion cards and atmosphere', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const copy = read('lib/orb/orb-navigation-convergence.ts')
    assert.match(companion, /data-orb-starter-cards/)
    assert.match(companion, /data-orb-starter-card/)
    assert.match(companion, /orb-v2-atmosphere/)
    assert.match(copy, /Create a handover \/ shift plan/)
    assert.match(copy, /Review written practice/)
    assert.match(copy, /Think through a safeguarding concern/)
    assert.match(copy, /Help me record this properly/)
  })

  it('composer still sends messages without exposing internal labels', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /sendMessage/)
    assert.match(companion, /OrbStandaloneComposer/)
    assert.doesNotMatch(companion, /brain_metadata/)
    assert.doesNotMatch(companion, /childProfileSelector/)
  })

  it('dictate renders transcript and analysis panels with actions', () => {
    const station = read('components/orb-standalone/orb-dictate-station.tsx')
    const studio = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')
    const transcript = read('components/orb/dictate/OrbTranscriptPanel.tsx')
    const client = read('lib/orb/dictate/orb-dictate-client.ts')
    assert.match(station, /OrbDictateStudioWorkspace/)
    assert.match(studio, /data-orb-dictate-studio-workspace/)
    assert.match(brain, /data-orb-dictate-brain-panel/)
    assert.match(transcript, /data-orb-dictate-transcript-empty|data-orb-dictate-captured-text/)
    assert.match(client, /analyzeOrbDictateSession/)
    assert.match(client, /DICTATE_BASE\s*\+\s*'\/analyze'/)
  })

  it('templates and documents wiring preserved', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    assert.match(templates, /OrbRecordingLibraryCards/)
    assert.match(templates, /Start in Dictate|dictate/i)
    assert.match(templates, /ORB Write|write/i)
    assert.match(documents, /data-orb-document-dropzone/)
    assert.match(documents, /analyseOrbStandaloneDocument|runOrbDocumentIntelligence/)
  })

  it('saved outputs and practice panels still render', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const practice = read('components/orb-standalone/orb-practice-panels.tsx')
    const shift = read('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')
    assert.match(saved, /data-orb-saved-outputs-panel/)
    assert.match(practice, /data-orb-inspection-readiness-panel/)
    assert.match(practice, /data-orb-safeguarding-thinking-panel/)
    assert.match(practice, /data-orb-record-properly-panel/)
    assert.match(shift, /panelId="shift_builder"/)
  })

  it('account billing settings modals still render', () => {
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(account, /data-orb-account-modal/)
    assert.match(billing, /data-orb-billing-modal/)
    assert.match(settings, /data-orb-settings-panel|OrbStandaloneSettingsPanel/)
  })

  it('no child profile selector and no internal brain metadata in UI', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const writePanel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.doesNotMatch(companion, /childProfile|child.profile|Child profile selector/i)
    assert.doesNotMatch(writePanel, /brain_metadata|intelligence_map/)
  })
})

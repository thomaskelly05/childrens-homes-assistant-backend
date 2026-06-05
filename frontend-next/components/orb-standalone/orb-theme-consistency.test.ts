import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const STATION_PANELS = [
  'components/orb-standalone/orb-document-panel.tsx',
  'components/orb-standalone/orb-templates-panel.tsx',
  'components/orb-standalone/orb-saved-outputs-panel.tsx',
  'components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx',
  'components/orb-standalone/orb-review-panel.tsx',
  'components/orb-standalone/orb-practice-panels.tsx'
] as const

describe('ORB theme consistency across station panels', () => {
  const PREMIUM_MARKERS =
    /OrbPremiumPage|OrbPremiumWorkspaceLayout|OrbPremiumToolbar|OrbPremiumTabs|OrbPremiumEmptyState/

  for (const path of STATION_PANELS) {
    it(`${path} uses shared premium components`, () => {
      const source = read(path)
      assert.match(source, PREMIUM_MARKERS)
    })
  }

  it('Documents & Guidance uses premium tabs and search', () => {
    const doc = read('components/orb-standalone/orb-document-panel.tsx')
    assert.match(doc, /Documents & Guidance/)
    assert.match(doc, /OrbPremiumTabs/)
    assert.match(doc, /OrbPremiumToolbar/)
    assert.match(doc, /ORB_PREMIUM_ACTION_LABELS\.analyseWithOrb|Analyse with ORB/)
    assert.match(doc, /data-orb-knowledge-library-tabs/)
  })

  it('Templates uses premium card grid and empty state', () => {
    const tpl = read('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(tpl, /OrbPremiumPage/)
    assert.match(tpl, /data-orb-templates-card-grid/)
    assert.match(tpl, /OrbPremiumEmptyState/)
  })

  it('Saved Outputs uses premium empty state with studio CTAs', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(saved, /OrbPremiumEmptyState/)
    assert.match(saved, /No saved outputs yet/)
    assert.match(saved, /data-orb-saved-start-write/)
    assert.match(saved, /data-orb-saved-start-dictate/)
  })

  it('Shift Builder keeps generation logic and uses advanced collapse', () => {
    const shift = read('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')
    assert.match(shift, /runOrbShiftBuilder/)
    assert.match(shift, /OrbPremiumPage/)
    assert.match(shift, /advanced=\{/)
    assert.match(shift, /data-orb-generate-shift-plan/)
  })

  it('Practice panels use premium trust strip and collapsed advanced', () => {
    const practice = read('components/orb-standalone/orb-practice-panels.tsx')
    assert.match(practice, /OrbPremiumTrustStrip/)
    assert.match(practice, /OrbPremiumWorkspaceLayout/)
    assert.match(practice, /advanced=\{/)
    assert.match(practice, /data-orb-inspection-readiness-panel/)
    assert.match(practice, /data-orb-safeguarding-thinking-panel/)
    assert.match(practice, /data-orb-record-properly-panel/)
  })

  it('Review panel uses premium layout and therapeutic section collapsed', () => {
    const review = read('components/orb-standalone/orb-review-panel.tsx')
    assert.match(review, /OrbPremiumPage/)
    assert.match(review, /Review written practice/)
    assert.match(review, /collapsible/)
    assert.match(review, /data-orb-review-run/)
  })

  it('Residential sidebar keeps ORB Write and clarifies Documents', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    assert.match(sidebar, /ORB Write/)
    assert.match(sidebar, /Documents & Guidance/)
    assert.match(sidebar, /Rough notes to records/)
    assert.match(sidebar, /Handover and shift plan/)
  })

  it('does not add child profile selector to station panels', () => {
    for (const path of STATION_PANELS) {
      const source = read(path)
      assert.doesNotMatch(source, /childProfileSelector|ChildProfileSelector|child profile selector/i)
    }
  })

  it('station panels do not expose internal brain metadata in UI copy', () => {
    const practice = read('components/orb-standalone/orb-practice-panels.tsx')
    assert.doesNotMatch(practice, /brain_metadata|lens_used|IndiCare Intelligence Core wiring/i)
  })

  it('Dictate and Voice stations remain present', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /openOrbDictatePanel/)
    assert.match(companion, /orb_voice|OrbVoice/)
    assert.match(companion, /orb_write|ORB Write/)
  })
})

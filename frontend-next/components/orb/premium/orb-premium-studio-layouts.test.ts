import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Premium Studio Layouts', () => {
  it('exports all studio components from premium index', () => {
    const index = read('components/orb/premium/index.ts')
    const components = [
      'OrbStudioPage',
      'OrbStudioHeader',
      'OrbStudioHero',
      'OrbStudioShell',
      'OrbStudioGrid',
      'OrbStudioPanel',
      'OrbStudioSidebarPanel',
      'OrbStudioActionRail',
      'OrbStudioPrimaryAction',
      'OrbStudioEmptyState',
      'OrbStudioDocumentSurface',
      'OrbStudioComposerCard',
      'OrbStudioMetricCard',
      'OrbStudioSourceCard'
    ]
    for (const name of components) {
      assert.match(index, new RegExp(name))
    }
  })

  it('studio v3 CSS is imported in orb layout', () => {
    const layout = read('app/orb/layout.tsx')
    assert.match(layout, /orb-premium-studio-v3\.css/)
  })

  it('studio theme tokens define shell and panel classes', () => {
    const theme = read('components/orb/premium/orb-studio-theme.ts')
    assert.match(theme, /orbStudioShellClass/)
    assert.match(theme, /orbStudioPanelClass/)
    assert.match(theme, /orbStudioDocumentSurfaceClass/)
  })

  it('Dictate uses studio shell', () => {
    const dictate = read('components/orb/dictate/OrbDictateStudioWorkspace.tsx')
    assert.match(dictate, /OrbStudioShell/)
    assert.match(dictate, /data-orb-dictate-studio-workspace/)
    assert.match(dictate, /data-orb-dictate-action-rail/)
  })

  it('Documents knowledge library uses studio hero', () => {
    const docs = read('components/orb-standalone/orb-document-panel.tsx')
    assert.match(docs, /OrbStudioHero/)
    assert.match(docs, /data-orb-knowledge-library-tabs/)
    assert.match(docs, /Official Guidance/)
  })

  it('Templates uses studio shell and recording library', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(templates, /OrbStudioShell/)
    assert.match(templates, /data-orb-recording-library-section/)
    assert.match(templates, /data-orb-use-template/)
  })

  it('Saved outputs uses document archive studio layout', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(saved, /OrbStudioEmptyState/)
    assert.match(saved, /data-orb-saved-outputs-empty/)
    assert.match(saved, /data-orb-saved-start-write/)
  })

  it('Shift Builder uses handover studio grid', () => {
    const shift = read('components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx')
    assert.match(shift, /OrbStudioPage/)
    assert.match(shift, /data-orb-shift-notes-input/)
    assert.match(shift, /data-orb-generate-shift-plan/)
  })

  it('practice panels use guided studio layout', () => {
    const practice = read('components/orb-standalone/orb-practice-panels.tsx')
    assert.match(practice, /OrbStudioPage/)
    assert.match(practice, /data-orb-inspection-readiness-panel/)
    assert.match(practice, /data-orb-safeguarding-thinking-panel/)
    assert.match(practice, /data-orb-record-properly-panel/)
  })

  it('Review uses studio guided workspace', () => {
    const review = read('components/orb-standalone/orb-review-panel.tsx')
    assert.match(review, /OrbStudioPage/)
    assert.match(review, /data-orb-review-panel/)
    assert.match(review, /data-orb-review-run/)
  })

  it('billing and account modals use studio modal sections', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    assert.match(billing, /orb-studio-modal-section/)
    assert.match(account, /orb-studio-modal-section/)
    assert.match(account, /data-orb-account-modal/)
  })

  it('interaction state CSS classes exist', () => {
    const css = read('components/orb/premium/orb-premium-studio-v3.css')
    assert.match(css, /orb-studio-state-loading/)
    assert.match(css, /orb-studio-state-error/)
    assert.match(css, /orb-studio-state-success/)
    assert.match(css, /orb-studio-state-working/)
  })
})

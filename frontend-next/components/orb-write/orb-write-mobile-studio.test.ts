import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write mobile one-section studio', () => {
  const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
  const editor = read('components/orb-write/orb-write-editor.tsx')
  const workingEditor = read('components/orb-write/orb-write-working-document-editor.tsx')
  const workspace = read('components/orb-write/orb-write-mobile-section-workspace.tsx')
  const toolbar = read('components/orb-write/orb-write-mobile-toolbar.tsx')
  const sections = read('lib/orb/write/orb-write-mobile-sections.ts')
  const css = read('app/orb/orb-residential-shell.css')

  it('mobile ORB Write uses one-section-at-a-time layout markers', () => {
    assert.match(panel, /data-orb-write-mobile-layout=\{isMobile \? 'one-section'/)
    assert.match(editor, /data-orb-write-mobile-layout=\{useMobileSectionLayout \? 'one-section'/)
    assert.match(workingEditor, /data-orb-write-mobile-layout=\{useMobileOneSection \? 'one-section'/)
    assert.match(css, /\[data-orb-write-mobile-layout='one-section'\]/)
  })

  it('mobile ORB Write does not render all sections stacked by default', () => {
    assert.match(editor, /OrbWriteMobileActiveSection/)
    assert.match(workingEditor, /useMobileOneSection && activeWorkingSection/)
    assert.match(workingEditor, /useMobileOneSection \?/)
    assert.match(editor, /data-orb-write-mobile-section-workspace/)
  })

  it('active section title helper text and editable body are visible', () => {
    assert.match(workspace, /data-orb-write-mobile-section-title/)
    assert.match(workspace, /data-orb-write-mobile-section-hint/)
    assert.match(workspace, /data-orb-write-mobile-section-body/)
    assert.match(workspace, /data-orb-write-mobile-section-counter/)
  })

  it('Previous Next and All parts controls exist', () => {
    assert.match(workspace, /data-orb-write-mobile-section-prev/)
    assert.match(workspace, /data-orb-write-mobile-part-prev/)
    assert.match(workspace, /data-orb-write-mobile-section-next/)
    assert.match(workspace, /data-orb-write-mobile-part-next/)
    assert.match(workspace, /data-orb-write-mobile-sections-toggle/)
    assert.match(workspace, /data-orb-write-mobile-parts-toggle/)
    assert.match(workspace, /data-orb-write-mobile-sections-sheet/)
    assert.match(workspace, /ORB_WRITE_MOBILE_ALL_PARTS/)
  })

  it('ORB Review is collapsed by default on mobile and opens in sheet', () => {
    assert.match(panel, /data-orb-write-mobile-review-collapsed/)
    assert.match(panel, /OrbWriteMobileReviewSheet/)
    assert.match(panel, /mobileReviewSheetOpen/)
    assert.match(workspace, /data-orb-write-mobile-review-sheet/)
    assert.match(toolbar, /data-orb-write-mobile-review-toggle/)
    assert.doesNotMatch(panel, /data-orb-write-review-collapsible/)
  })

  it('mobile ORB Write uses care-led studio header', () => {
    const careCopy = read('lib/orb/orb-care-led-mobile-copy.ts')
    assert.match(careCopy, /Shape the record/)
    assert.match(panel, /OrbWriteMobileCareHeader/)
    assert.match(workspace, /data-orb-write-mobile-care-header/)
  })

  it('record type appears once and Use a template is secondary on mobile', () => {
    assert.match(panel, /data-orb-write-record-type-suppressed=\{isMobile \? 'true'/)
    assert.match(workspace, /data-orb-write-use-template-secondary/)
    assert.match(css, /\[data-orb-write-use-template-secondary\]/)
    assert.match(panel, /isMobile \? 'hidden'/)
  })

  it('sticky Save draft action bar is safe-area aware', () => {
    assert.match(toolbar, /data-orb-write-mobile-action-bar/)
    assert.match(toolbar, /data-orb-write-save-draft/)
    assert.match(toolbar, /env\(safe-area-inset-bottom\)/)
    assert.match(css, /\[data-orb-write-mobile-action-bar\]/)
  })

  it('no horizontal overflow rules for mobile write workspace', () => {
    assert.match(css, /\[data-orb-write-mobile-section-workspace\][\s\S]*overflow-x: hidden/)
    assert.match(css, /\[data-orb-write-mobile-layout='one-section'\][\s\S]*overflow-x: hidden/)
  })

  it('desktop ORB Write layout is not regressed', () => {
    assert.match(editor, /data-orb-write-canvas-workspace/)
    assert.match(editor, /hidden md:block/)
    assert.match(panel, /!isMobile \?/)
    assert.match(workingEditor, /!isMobile && leftPanelOpen/)
  })

  it('Daily Record and Records handoff paths still open ORB Write', () => {
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    const templateHandoff = read('lib/orb/write/orb-write-template-handoff.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(panel, /loadOrbWriteTemplateHandoff/)
    assert.match(panel, /loadOrbWriteWorkingDocumentHandoff/)
    assert.match(handoff, /handoffSavedOutputRecordToOrbWrite/)
    assert.match(templateHandoff, /loadOrbWriteTemplateHandoff/)
    assert.match(companion, /OrbWriteStandalonePanel/)
  })

  it('section parser preserves markdown structure', () => {
    assert.match(sections, /parseOrbWriteMobileSections/)
    assert.match(sections, /rebuildOrbWriteMarkdownFromSections/)
    assert.match(sections, /export type OrbWriteMobileSection/)
  })
})

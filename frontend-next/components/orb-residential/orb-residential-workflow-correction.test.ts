import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { buildSectionPromptBody } from '../../lib/orb/recording/orb-recording-section-prompts.ts'
import { orbWriteBodyToMobileNotepadHtml } from '../../lib/orb/write/orb-write-mobile-body.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential workflow correction pass', () => {
  it('mobile empty state scroll container aligns content from top not flex-end', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(
      mobileCss,
      /\[data-orb-chat-scroll-container\]:has\(\[data-orb-residential-empty\]\)[\s\S]*justify-content:\s*flex-start/
    )
    assert.doesNotMatch(
      mobileCss,
      /\[data-orb-chat-scroll-container\]:has\(\[data-orb-residential-empty\]\)[\s\S]*justify-content:\s*flex-end/
    )
    assert.match(mobileCss, /\[data-orb-residential-empty\][\s\S]*justify-content:\s*flex-start/)
  })

  it('mobile light theme empty heading uses readable dark text', () => {
    const mobileCss = readComponent('app/orb/orb-mobile.css')
    assert.match(
      mobileCss,
      /\.orb-theme-light \[data-orb-empty-heading-mobile\][\s\S]{0,120}--orb-res-text,\s*#0f172a/
    )
  })

  it('composer tools sheet exposes upload and record type picker actions', () => {
    const tools = readComponent('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const composer = readComponent('components/orb-standalone/orb-standalone-composer.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(tools, /attach_image/)
    assert.match(tools, /attach_photo/)
    assert.match(tools, /upload_document/)
    assert.match(tools, /label: 'Record type'/)
    assert.match(tools, /anonymised or minimal details/i)
    assert.match(composer, /action === 'attach_image'/)
    assert.match(composer, /cameraInputRef\.current\?\.click\(\)/)
    assert.match(companion, /isMobileViewport\)\s*\{\s*setComposerRecordTypePickerOpen/)
    assert.match(companion, /OrbWriteTemplatePicker/)
  })

  it('mobile dictate does not navigate to full templates panel', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(
      companion,
      /onOpenTemplates=\{residentialSurface && isMobileViewport \? undefined : openTemplatesPanel\}/
    )
  })

  it('markdown renderer supports GFM tables and checklist inputs', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    const desktopCss = readComponent('app/orb/orb-desktop.css')
    assert.match(markdown, /orb-md-table/)
    assert.match(markdown, /type === 'checkbox'/)
    assert.match(desktopCss, /\.orb-markdown-answer \.orb-md-table/)
  })

  it('mobile notepad renders tables lists and headings without raw markdown', () => {
    const actionPlan = buildSectionPromptBody('action_plan') ?? ''
    const html = orbWriteBodyToMobileNotepadHtml(actionPlan)
    assert.match(html, /<table/)
    assert.match(html, /<th>Action<\/th>/)
    assert.doesNotMatch(html, /^\| Action/m)
    const chronology = buildSectionPromptBody('chronology_entry') ?? ''
    const chronologyHtml = orbWriteBodyToMobileNotepadHtml(chronology)
    assert.match(chronologyHtml, /Chronology table/)
    assert.match(chronologyHtml, /<th>Date\/time<\/th>/)
  })

  it('action plan and chronology templates include structured table scaffolds', () => {
    const actionPlan = buildSectionPromptBody('action_plan') ?? ''
    const chronology = buildSectionPromptBody('chronology_entry') ?? ''
    assert.match(actionPlan, /\| Action \| Responsible person \|/)
    assert.match(chronology, /\| Date\/time \| Event \|/)
  })

  it('powered-by brand uses premium navy token', () => {
    const tokens = readComponent('app/orb/orb-premium-tokens.css')
    const mark = readComponent('components/orb-residential/ui/glass-orb-mark.tsx')
    const theme = readComponent('lib/orb/orb-theme.ts')
    assert.match(tokens, /--orb-brand-navy,\s*#0b1f3a/)
    assert.match(theme, /ORB_BRAND_NAVY = '#0B1F3A'/)
    assert.match(mark, /data-orb-powered-indicare/)
    assert.match(mark, /--orb-brand-navy/)
  })

  it('saved outputs clarifies archive is not templates', () => {
    const saved = readComponent('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(saved, /title="Saved Outputs"/)
    assert.match(saved, /Document archive/)
    assert.match(saved, /not templates or the recording library/)
  })

  it('no duplicate template source or new ORB shell created', () => {
    const shell = readComponent('components/orb/orb-shell.tsx')
    const framework = readComponent('lib/orb/recording/orb-recording-framework.json')
    assert.match(shell, /OrbCareCompanion residentialSurface/)
    assert.doesNotMatch(shell, /orb-residential-shell/)
    assert.match(framework, /"record_types"/)
    assert.doesNotMatch(readComponent('app/orb/page.tsx'), /new.*\/orb\/shell/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_PRIMARY_RECORD_TYPE_IDS,
  ORB_THERAPEUTIC_RECORDING_PRINCIPLES,
  buildSectionPromptBody,
  sectionPromptsForRecordType
} from '../../lib/orb/recording/orb-recording-section-prompts.ts'
import { orbWriteBodyToMobileNotepadHtml } from '../../lib/orb/write/orb-write-mobile-body.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB recording templates convergence', () => {
  it('primary record types include child-centred section prompts', () => {
    for (const id of ORB_PRIMARY_RECORD_TYPE_IDS) {
      const prompts = sectionPromptsForRecordType(id)
      assert.ok(prompts?.length, `missing prompts for ${id}`)
      const body = buildSectionPromptBody(id)
      assert.ok(body?.includes('*'), `prompt emphasis missing for ${id}`)
      assert.match(body ?? '', /Child|child|adult|Adult/)
    }
  })

  it('therapeutic recording principles are defined', () => {
    assert.ok(ORB_THERAPEUTIC_RECORDING_PRINCIPLES.length >= 8)
    assert.match(ORB_THERAPEUTIC_RECORDING_PRINCIPLES.join(' '), /child remains central/i)
  })

  it('ORB Write mobile exposes record type selector', () => {
    const editor = readComponent('components/orb-write/orb-write-editor.tsx')
    const selector = readComponent('components/orb-write/orb-write-record-type-selector.tsx')
    const toolbar = readComponent('components/orb-write/orb-write-mobile-toolbar.tsx')
    assert.match(editor, /OrbWriteRecordTypeSelector/)
    assert.match(selector, /data-orb-write-record-type-selector/)
    assert.match(selector, /Record type:/)
    assert.match(toolbar, /data-orb-write-mobile-record-type-entry/)
  })

  it('Dictate mobile exposes compact record type selector', () => {
    const mobile = readComponent('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const selector = readComponent('components/orb/dictate/OrbDictateTemplateSelector.tsx')
    assert.match(mobile, /data-orb-dictate-mobile-record-type/)
    assert.match(mobile, /OrbDictateTemplateSelector/)
    assert.match(selector, /Record type:/)
  })

  it('composer tools sheet uses Record type on mobile', () => {
    const tools = readComponent('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(tools, /label: 'Record type'/)
    assert.match(companion, /composerRecordTypePickerOpen/)
    assert.match(companion, /OrbWriteTemplatePicker/)
    assert.match(companion, /isMobileViewport\)\s*\{\s*setComposerRecordTypePickerOpen/)
  })

  it('mobile notepad hides raw markdown syntax', () => {
    const body = readComponent('lib/orb/write/orb-write-mobile-body.ts')
    const editor = readComponent('components/orb-write/orb-write-editor.tsx')
    assert.match(body, /orbWriteBodyToMobileNotepadHtml/)
    assert.match(editor, /orbWriteBodyLooksLikeMarkdownTemplate/)
    const sample = buildSectionPromptBody('general_dictation') ?? ''
    const html = orbWriteBodyToMobileNotepadHtml(sample)
    assert.doesNotMatch(html, /^##\s/m)
    assert.match(html, /<h2>Summary<\/h2>/)
    assert.match(html, /orb-write-section-hint/)
  })

  it('template change confirmation preserved in picker', () => {
    const picker = readComponent('components/orb-write/orb-write-template-picker.tsx')
    const panel = readComponent('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(picker, /data-orb-write-template-replace-confirm/)
    assert.match(panel, /requestRecordTypeChange/)
    assert.match(panel, /hasExistingContent/)
  })

  it('framework JSON has 24 record types with studio templates for primary set', () => {
    const json = JSON.parse(readComponent('lib/orb/recording/orb-recording-framework.json'))
    assert.equal(json.record_types.length, 24)
    const studioCount = json.record_types.filter((r: { studio_template_id: string | null }) => r.studio_template_id).length
    assert.ok(studioCount >= 13)
    const incident = json.record_types.find((r: { id: string }) => r.id === 'incident_report')
    assert.equal(incident.label, 'Incident Reflection')
  })
})

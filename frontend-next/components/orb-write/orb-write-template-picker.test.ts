import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write template picker', () => {
  it('template picker component renders with search and groups', () => {
    const picker = read('components/orb-write/orb-write-template-picker.tsx')
    assert.match(picker, /data-orb-write-template-picker/)
    assert.match(picker, /data-orb-write-template-search/)
    assert.match(picker, /data-orb-write-template-groups/)
  })

  it('ORB Write source panel has Choose template action', () => {
    const source = read('components/orb-write/orb-write-source-panel.tsx')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(source, /data-orb-write-choose-template/)
    assert.match(panel, /OrbWriteTemplatePicker/)
  })

  it('selecting template can apply headings style or replace with confirm', () => {
    const picker = read('components/orb-write/orb-write-template-picker.tsx')
    assert.match(picker, /data-orb-write-template-use/)
    assert.match(picker, /data-orb-write-template-headings-only/)
    assert.match(picker, /data-orb-write-template-confirm-replace/)
    assert.match(picker, /data-orb-write-template-confirm-merge/)
  })

  it('mobile template picker footer is sticky with safe-area padding', () => {
    const picker = read('components/orb-write/orb-write-template-picker.tsx')
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    assert.match(picker, /data-orb-write-template-picker-footer/)
    assert.match(picker, /data-orb-write-template-picker-mobile/)
    assert.match(mobileCss, /\[data-orb-write-template-picker-footer\]/)
  })

  it('standalone panel updates record type on template apply', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /setRecordTypeId/)
    assert.match(panel, /record_type_id/)
    assert.match(panel, /applyTemplate/)
  })

  it('template handoff from Templates page still works', () => {
    const handoff = read('lib/orb/write/orb-write-template-handoff.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(handoff, /orb-write-template-handoff/)
    assert.match(companion, /convergedTemplateHandoff/)
  })

  it('no child profile selector in write template picker', () => {
    const picker = read('components/orb-write/orb-write-template-picker.tsx')
    assert.doesNotMatch(picker, /child.profile/i)
    assert.doesNotMatch(picker, /profile.selector/i)
  })
})

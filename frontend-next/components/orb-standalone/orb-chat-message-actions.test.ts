import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB chat message actions', () => {
  it('assistant action bar exposes icon actions', () => {
    const actions = read('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(actions, /dataAttr="copy"/)
    assert.match(actions, /dataAttr="regenerate"/)
    assert.match(actions, /dataAttr="speak"/)
    assert.match(actions, /dataAttr="save"/)
    assert.match(actions, /dataAttr="open-in-orb-write"/)
    assert.match(actions, /dataAttr="use-as-template"/)
    assert.match(actions, /dataAttr="export"/)
    assert.match(actions, /data-orb-action-more-menu/)
    assert.match(actions, /orb-action-chip--icon-only/)
  })

  it('care companion wires open in ORB Write handoff from chat', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /onOpenInOrbWrite/)
    assert.match(companion, /openOrbWriteWithContent/)
    assert.match(companion, /handoffTextToOrbWrite/)
  })

  it('user messages support copy, edit and resend actions', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-user-message-actions/)
    assert.match(companion, /data-orb-user-action-copy/)
    assert.match(companion, /data-orb-user-action-edit/)
    assert.match(companion, /data-orb-user-action-resend/)
  })

  it('no internal brain metadata in user-facing action surfaces', () => {
    const actions = read('components/orb-standalone/orb-assistant-message.tsx')
    assert.doesNotMatch(actions, /brain_metadata/)
    assert.doesNotMatch(actions, /IndiCare Brain/)
  })
})

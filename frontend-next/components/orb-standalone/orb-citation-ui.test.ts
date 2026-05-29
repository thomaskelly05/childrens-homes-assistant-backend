import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB citation UI', () => {
  it('popover shows why cited and summary basis marker', () => {
    const source = readComponent('components/orb-standalone/orb-inline-citation.tsx')
    assert.match(source, /Why cited/)
    assert.match(source, /data-orb-citation-summary-basis/)
    assert.match(source, /Exact excerpt/)
  })

  it('care companion gates image unavailable banner to image turns', () => {
    const companion = readComponent('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /lastSendHadImagesRef/)
    assert.match(companion, /data-orb-image-unavailable-banner/)
    assert.match(companion, /imageNoteForMessageId/)
  })
})

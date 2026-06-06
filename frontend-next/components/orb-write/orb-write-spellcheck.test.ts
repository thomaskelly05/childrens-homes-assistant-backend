import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write spellcheck', () => {
  it('ORB Write content editor has spellCheck enabled', () => {
    const editor = read('components/orb-write/orb-write-editor.tsx')
    assert.match(editor, /spellCheck/)
    assert.match(editor, /data-orb-write-document-canvas/)
  })

  it('Dictate transcript editor has spellCheck enabled', () => {
    const dictate = read('components/orb-standalone/orb-dictate-studio.tsx')
    assert.match(dictate, /spellCheck/)
  })

  it('document and write textareas have spellCheck', () => {
    const docs = read('components/orb-standalone/orb-document-panel.tsx')
    const comparison = read('components/orb-standalone/orb-document-comparison-section.tsx')
    const source = read('components/orb-write/orb-write-source-panel.tsx')
    assert.match(docs, /spellCheck/)
    assert.match(comparison, /spellCheck/)
    assert.match(source, /spellCheck/)
  })

  it('spelling grammar actions in converged registry use governed edit path', () => {
    const registry = read('lib/orb/orb-converged-actions.ts')
    const panel = read('components/orb-write/orb-write-ai-panel.tsx')
    assert.match(registry, /check_spelling_grammar/)
    assert.match(registry, /editOrbDictateDocument:spelling_grammar/)
    assert.match(registry, /Spelling & grammar/)
    assert.match(panel, /editOrbDictateDocument/)
    assert.match(panel, /pendingEdit/)
  })

  it('AI panel applies suggestions not silent replacement', () => {
    const panel = read('components/orb-write/orb-write-ai-panel.tsx')
    assert.match(panel, /pendingEdit/)
    assert.match(panel, /onApplyRevision/)
    assert.match(panel, /ORB suggests/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readComponent(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB markdown and cognition rendering', () => {
  it('assistant message uses react-markdown renderer', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(markdown, /react-markdown/)
    assert.match(markdown, /remarkGfm/)
    assert.match(assistant, /OrbMarkdownAnswer/)
    assert.match(markdown, /orb-md-h2/)
    assert.match(markdown, /font-bold text-\[#0F172A\]/)
  })

  it('markdown renderer preserves inline citation chips', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    assert.match(markdown, /OrbInlineCitation/)
    assert.match(markdown, /content\.split/)
  })

  it('cognition pill uses auto-routed labels from explainability', () => {
    const agents = readComponent('lib/orb/residential-agents.ts')
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(agents, /cognitionPillLabel/)
    assert.match(agents, /cognition_display_labels/)
    assert.match(assistant, /data-orb-cognition-pill/)
    assert.match(assistant, /cognitionPillLabel/)
  })

  it('source detail panel filters generic product sources', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /data-orb-sources-detail/)
    assert.match(assistant, /standalone orb product boundary/)
    assert.match(assistant, /label\.startsWith\('\['\)/)
  })
})

describe('ORB Apps sidebar structure', () => {
  it('sidebar exposes Apps menu with Conversations under Apps', () => {
    const source = readComponent('components/orb-standalone/orb-standalone-sidebar.tsx')
    for (const label of [
      'New chat',
      'Search chats',
      'Apps',
      'Conversations',
      'Library',
      'Agents',
      'Deep research',
      'Tools',
      'Projects',
      'Saved outputs'
    ]) {
      assert.match(source, new RegExp(label))
    }
    assert.match(source, /data-orb-sidebar-apps/)
    assert.match(source, /orb-sidebar-conversations/)
    assert.doesNotMatch(source, /SectionToggle label="Conversations"/)
    assert.match(source, /Previous 7 days/)
  })
})

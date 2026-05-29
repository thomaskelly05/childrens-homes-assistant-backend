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

  it('markdown uses single-pass citation link encoding for inline chips', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    assert.match(markdown, /#orb-cite:/)
    assert.match(markdown, /encodeInlineCitations/)
    assert.match(markdown, /normaliseOrbMarkdown/)
    assert.doesNotMatch(markdown, /content\.split/)
  })

  it('markdown defines h2/h3 heading and list structure classes', () => {
    const markdown = readComponent('components/orb-standalone/orb-markdown-answer.tsx')
    assert.match(markdown, /orb-md-h2/)
    assert.match(markdown, /orb-md-h3/)
    assert.match(markdown, /list-disc/)
    assert.match(markdown, /list-decimal/)
    assert.match(markdown, /leading-\[1\.7\]/)
  })

  it('route CSS ships orb-markdown-answer typography rules', () => {
    const routeCss = readComponent('app/orb/orb-chatgpt-light.css')
    assert.match(routeCss, /\.orb-markdown-answer h2/)
    assert.match(routeCss, /\.orb-markdown-answer strong/)
    assert.match(routeCss, /list-style: disc/)
  })

  it('citation chips use high-contrast light styles', () => {
    const citation = readComponent('components/orb-standalone/orb-inline-citation.tsx')
    const routeCss = readComponent('app/orb/orb-chatgpt-light.css')
    assert.match(citation, /orb-citation-chip-light/)
    assert.match(citation, /rounded-full/)
    assert.match(routeCss, /#e0f2fe/)
    assert.match(routeCss, /#075985/)
  })

  it('cognition pill uses auto-routed labels from explainability', () => {
    const agents = readComponent('lib/orb/residential-agents.ts')
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    const client = readComponent('lib/orb/standalone-client.ts')
    assert.match(agents, /cognitionPillLabel/)
    assert.match(agents, /collectCognitionDisplayLabels/)
    assert.match(agents, /cognition_display_labels/)
    assert.match(agents, /filterAutoRouteLabels/)
    assert.match(agents, /isAutomaticRoutingOnlyLabel/)
    assert.match(agents, /automatic routing/)
    assert.match(client, /logOrbCognitionDebug/)
    assert.match(assistant, /data-orb-cognition-pill/)
    assert.match(assistant, /cognitionPillLabel/)
    assert.match(assistant, /stripSourcesBasisSection/)
  })

  it('source detail panel filters generic product sources', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /data-orb-sources-detail/)
    assert.match(assistant, /View guidance detail/)
    assert.match(assistant, /therapeutic practice/)
  })

  it('action row defaults to copy regenerate speak save and more menu', () => {
    const assistant = readComponent('components/orb-standalone/orb-assistant-message.tsx')
    assert.match(assistant, /data-orb-action-more-menu/)
    assert.match(assistant, /label="More"/)
    assert.match(assistant, /dataAttr="save"/)
    assert.match(assistant, /Save to project/)
    assert.match(assistant, /data-orb-response-action-bar-persistent/)
    assert.match(assistant, /isLatest/)
  })

  it('document panel has readable light inputs and empty state', () => {
    const panel = readComponent('components/orb-standalone/orb-document-panel.tsx')
    const routeCss = readComponent('app/orb/orb-chatgpt-light.css')
    assert.match(panel, /data-orb-document-empty/)
    assert.match(panel, /orb-doc-input/)
    assert.match(panel, /Standalone context only/)
    assert.match(routeCss, /\.orb-document-panel/)
  })
})

describe('ORB premium sidebar structure', () => {
  it('sidebar exposes Core, Intelligence, Workspace, and Profiles sections', () => {
    const source = readComponent('components/orb-standalone/orb-standalone-sidebar.tsx')
    for (const section of ['Core', 'Intelligence', 'Workspace', 'Profiles']) {
      assert.match(source, new RegExp(`title="${section}"`))
    }
    for (const label of [
      'New chat',
      'Search chats',
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
    assert.doesNotMatch(source, /title="Apps"/)
    assert.match(source, /orb-sidebar-conversations/)
    assert.doesNotMatch(source, /SectionToggle label="Conversations"/)
    assert.match(source, /Previous 7 days/)
  })
})

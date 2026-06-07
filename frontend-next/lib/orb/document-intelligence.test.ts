import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  contextualDocumentActions,
  detectDocumentKind,
  documentIntelligenceDisplayTitle,
  formatDocumentIntelligenceMarkdown,
  RESIDENTIAL_FIRST_CLASS_LENSES
} from './document-intelligence.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const companionSource = readFileSync(
  join(root, 'components/orb-standalone/orb-care-companion.tsx'),
  'utf8'
)

test('policy document offers policy card', () => {
  const actions = contextualDocumentActions(
    'This policy requires staff to escalate safeguarding concerns to the manager.',
    'Safeguarding policy'
  )
  assert.ok(actions.some((a) => a.lens === 'policy_card'))
})

test('reg44 document offers reg44 extraction', () => {
  const actions = contextualDocumentActions(
    'Regulation 44 independent visitor report for March 2026.',
    'Reg 44 visit'
  )
  assert.ok(actions.some((a) => a.lens === 'reg44'))
})

test('care companion wires document intelligence route', () => {
  const assistantSource = readFileSync(
    join(root, 'components/orb-standalone/orb-assistant-message.tsx'),
    'utf8'
  )
  assert.match(companionSource, /runOrbDocumentIntelligence/)
  assert.match(companionSource, /OrbDocumentContextChips/)
  assert.match(assistantSource, /data-orb-document-context-actions/)
})

test('display title uses lens prefix and document name', () => {
  assert.equal(
    documentIntelligenceDisplayTitle('reg44', 'March 2026 visit'),
    'Reg 44 Review — March 2026 visit'
  )
})

test('intelligence markdown includes standalone boundary', () => {
  const md = formatDocumentIntelligenceMarkdown({
    lens: 'explain',
    title: 'Test',
    summary: 'Summary text',
    standalone: true,
    os_records_accessed: false
  })
  assert.match(md, /Based only on the document or text you provide/i)
  assert.match(md, /Standalone ORB does not access live care records/i)
})

test('documents panel exposes title subtitle lenses and policy card hero', () => {
  const panel = readFileSync(
    join(root, 'components/orb-standalone/orb-document-panel.tsx'),
    'utf8'
  )
  const companion = readFileSync(
    join(root, 'components/orb-standalone/orb-care-companion.tsx'),
    'utf8'
  )
  assert.match(panel, /title="Documents & Guidance"/)
  assert.match(
    panel,
    /Official guidance, useful links and home documents/
  )
  assert.match(panel, /data-orb-document-lens-selector/)
  assert.match(panel, /data-orb-policy-card-hero/)
  assert.match(panel, /data-orb-copy-document-output/)
  assert.match(panel, /data-orb-export-document-output/)
  assert.match(panel, /data-orb-ask-orb-document/)
  assert.match(companion, /rightPanel=\{documentDesktopContextPanel\}/)
  const contextPanel = readFileSync(
    join(root, 'components/orb-standalone/orb-document-context-panel.tsx'),
    'utf8'
  )
  assert.match(contextPanel, /data-orb-context-kind="documents"/)
})

test('first class lenses include residential briefing lenses', () => {
  const ids = RESIDENTIAL_FIRST_CLASS_LENSES.map((item) => item.lens)
  for (const lens of [
    'summary',
    'explain',
    'actions',
    'policy_card',
    'safeguarding',
    'ofsted',
    'reg44',
    'reg45',
    'recording_quality',
    'staff_briefing',
    'manager_oversight',
    'ri_governance'
  ]) {
    assert.ok(ids.includes(lens as (typeof ids)[number]), `missing lens ${lens}`)
  }
  assert.ok(RESIDENTIAL_FIRST_CLASS_LENSES.some((item) => item.hero && item.lens === 'policy_card'))
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  contextualDocumentActions,
  detectDocumentKind,
  formatDocumentIntelligenceMarkdown
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

test('intelligence markdown includes standalone boundary', () => {
  const md = formatDocumentIntelligenceMarkdown({
    lens: 'explain',
    title: 'Test',
    summary: 'Summary text',
    standalone: true,
    os_records_accessed: false
  })
  assert.match(md, /not checked live IndiCare OS records/i)
})

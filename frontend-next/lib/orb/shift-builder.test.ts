import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  formatShiftBuilderMarkdown,
  SHIFT_BUILDER_FOCUS_MODES,
  ORB_SHIFT_BUILDER_BOUNDARY_LINES
} from './shift-builder.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

test('shift builder focus modes cover required outputs', () => {
  const ids = SHIFT_BUILDER_FOCUS_MODES.map((m) => m.focus)
  for (const focus of [
    'full_shift_plan',
    'handover_only',
    'manager_review',
    'safeguarding_review',
    'recording_quality',
    'end_of_shift_reflection',
    'what_am_i_missing'
  ]) {
    assert.ok(ids.includes(focus as (typeof ids)[number]), `missing focus ${focus}`)
  }
})

test('markdown export includes standalone boundary', () => {
  const md = formatShiftBuilderMarkdown({
    title: 'Shift Builder — Full shift plan',
    focus: 'full_shift_plan',
    summary: 'Calm evening.',
    sections: [
      { id: 'immediate_priorities', heading: 'Immediate priorities', body: '- Check logs' }
    ]
  })
  assert.match(md, /Based only on the shift notes you provide/i)
  assert.match(md, /Standalone ORB does not access live care records/i)
})

test('shift builder panel exposes title subtitle focus and actions', () => {
  const panel = readFileSync(
    join(root, 'components/orb-standalone/shift-builder/orb-shift-builder-panel.tsx'),
    'utf8'
  )
  const sidebar = readFileSync(join(root, 'components/orb-residential/orb-residential-sidebar.tsx'), 'utf8')
  const companion = readFileSync(join(root, 'components/orb-standalone/orb-care-companion.tsx'), 'utf8')

  assert.match(panel, /title="Shift Builder"/)
  assert.match(panel, /Turn rough shift notes into priorities, handover, actions and reflection/)
  assert.match(panel, /data-orb-shift-focus-selector/)
  assert.match(panel, /data-orb-generate-shift-plan/)
  assert.match(panel, /data-orb-send-shift-to-dictate/)
  assert.match(panel, /data-orb-copy-shift-output/)
  assert.match(panel, /data-orb-export-shift-output/)
  assert.match(panel, /data-orb-ask-orb-improve-shift/)
  assert.match(panel, /data-orb-continue-shift-in-chat/)
  assert.match(panel, /ORB_SHIFT_BUILDER_BOUNDARY_LINES/)
  assert.match(panel, /data-orb-shift-builder-boundary/)

  assert.match(sidebar, /id: 'shift_builder'/)
  assert.match(sidebar, /Shift Builder/)
  assert.match(companion, /OrbShiftBuilderPanel/)
  assert.match(companion, /openShiftBuilderPanel/)
  assert.match(companion, /case 'shift_builder'/)
})

test('standalone client wires shift builder generate path', () => {
  const client = readFileSync(join(root, 'lib/orb/standalone-client.ts'), 'utf8')
  assert.match(client, /shiftBuilderGenerate/)
  assert.match(client, /runOrbShiftBuilder/)
})

test('shift builder route redirects to station', () => {
  const page = readFileSync(join(root, 'app/orb-residential/shift-builder/page.tsx'), 'utf8')
  assert.match(page, /redirect\('\/orb\?station=shift_builder'\)/)
})

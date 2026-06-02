import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildSavedOutputCreateBody,
  buildSavedOutputExportMarkdown,
  resolveSavedOutputRerun,
  ORB_SAVED_OUTPUT_BOUNDARY_LINES
} from '@/lib/orb/orb-saved-output-adapters'
import type { OrbSavedOutputRecord } from '@/lib/orb/standalone-client'

const __dirname = dirname(fileURLToPath(import.meta.url))

function readComponent(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), 'utf8')
}

describe('orb saved outputs adapters', () => {
  it('builds create body with brain metadata and standalone flags', () => {
    const body = buildSavedOutputCreateBody({
      title: 'Policy Card',
      type: 'document_review',
      content_markdown: '# Policy\n\nBody',
      created_from: 'policy_card',
      extras: {
        source_feature: 'policy_card',
        brain_metadata: {
          brain: 'orb_residential_intelligence',
          product: 'ORB Residential',
          standalone: true,
          os_records_accessed: false,
          live_record_access: false
        },
        source_text: 'Original policy text',
        lens: 'policy_card'
      }
    })
    assert.equal(body.metadata?.standalone, true)
    assert.equal(body.metadata?.os_records_accessed, false)
    assert.equal(body.metadata?.live_record_access, false)
    assert.ok(body.metadata?.brain_metadata)
    assert.equal(body.metadata?.source_text, 'Original policy text')
  })

  it('export markdown includes title, source and boundary footer', () => {
    const record = {
      id: '1',
      title: 'Shift handover',
      type: 'intelligence_note',
      status: 'saved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: 'Summary',
      content_markdown: '## Plan',
      metadata: { source_feature: 'shift_builder', brain_metadata: { product: 'ORB Residential', powered_by: 'IndiCare Intelligence', brain: 'orb_residential_intelligence' } },
      created_from: 'shift_builder'
    } as OrbSavedOutputRecord
    const md = buildSavedOutputExportMarkdown(record)
    assert.match(md, /Shift handover/)
    assert.match(md, /Shift Builder/)
    assert.match(md, /ORB brain/)
    for (const line of ORB_SAVED_OUTPUT_BOUNDARY_LINES) {
      assert.match(md, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('rerun unavailable when source text missing', () => {
    const record = {
      id: '2',
      title: 'Doc review',
      type: 'document_review',
      status: 'saved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { source_feature: 'document_intelligence', lens: 'explain' },
      created_from: 'document_intelligence'
    } as OrbSavedOutputRecord
    const rerun = resolveSavedOutputRerun(record)
    assert.ok(rerun)
    assert.equal(rerun.available, false)
    assert.match(rerun.reason || '', /not saved/i)
  })

  it('rerun available when source text present', () => {
    const record = {
      id: '3',
      title: 'Policy',
      type: 'document_review',
      status: 'saved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        source_feature: 'policy_card',
        lens: 'policy_card',
        source_text: 'Policy paragraph one.'
      },
      created_from: 'policy_card'
    } as OrbSavedOutputRecord
    const rerun = resolveSavedOutputRerun(record)
    assert.ok(rerun)
    assert.equal(rerun.available, true)
    assert.equal(rerun.kind, 'policy_card')
  })
})

describe('orb saved outputs panel UI', () => {
  it('panel renders list, detail, actions and empty state hooks', () => {
    const panel = readComponent('orb-saved-outputs-panel.tsx')
    const actions = readComponent('orb-saved-output-detail-actions.tsx')
    assert.match(panel, /Saved Outputs/)
    assert.match(panel, /Reuse, export and improve your ORB work/)
    assert.match(panel, /data-orb-saved-outputs-list/)
    assert.match(panel, /data-orb-saved-output-detail/)
    assert.match(panel, /No saved outputs yet/)
    assert.match(actions, /data-orb-saved-output-copy/)
    assert.match(actions, /data-orb-saved-output-export/)
    assert.match(actions, /data-orb-saved-output-ask-orb/)
    assert.match(actions, /data-orb-saved-output-send-dictate/)
    assert.match(actions, /data-orb-saved-output-shift-builder/)
    assert.match(actions, /data-orb-saved-output-rerun-unavailable/)
  })

  it('save actions include ask orb and boundary copy', () => {
    const save = readComponent('orb-output-save-actions.tsx')
    assert.match(save, /data-orb-save-output/)
    assert.match(save, /Ask ORB about this/)
    assert.match(save, /Saved outputs are standalone ORB artefacts/)
  })
})

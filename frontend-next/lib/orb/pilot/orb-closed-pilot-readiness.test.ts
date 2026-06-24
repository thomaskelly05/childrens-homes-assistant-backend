import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { isOrbCommunicateLaunchVisible } from '../orb-navigation-convergence.ts'
import {
  ORB_RECORDS_STATUS_CHIPS,
  ORB_RECORDS_FILTER_CHIPS
} from '../orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB closed pilot readiness — frontend contracts', () => {
  it('audit, migration and scope docs exist', () => {
    const repoRoot = join(root, '..')
    assert.match(readFileSync(join(repoRoot, 'docs/audits/orb-closed-pilot-readiness-audit.md'), 'utf8'), /Closed Pilot Readiness Audit/)
    assert.match(readFileSync(join(repoRoot, 'docs/deployment/orb-closed-pilot-migration-checklist.md'), 'utf8'), /Migration Checklist/)
    assert.match(readFileSync(join(repoRoot, 'docs/pilot/orb-closed-pilot-scope.md'), 'utf8'), /Controlled Closed Pilot Scope/)
  })

  it('readiness script exists', () => {
    const script = readFileSync(join(root, '..', 'scripts/check_orb_pilot_readiness.py'), 'utf8')
    assert.match(script, /run_pilot_readiness_checks/)
    assert.match(script, /--allow-memory-fallback/)
  })

  it('Quick Record consistent — no General Dictation in user-facing voice labels', () => {
    const voice = read('lib/orb/voice/orb-voice-conversation-engine.ts')
    const backend = readFileSync(join(root, '..', 'assistant/knowledge/orb_recording_framework.json'), 'utf8')
    const frontend = read('lib/orb/recording/orb-recording-framework.json')
    assert.match(voice, /Quick Record/)
    assert.doesNotMatch(voice, /General Dictation/)
    assert.match(backend, /"label": "Quick Record"/)
    assert.match(frontend, /"label": "Quick Record"/)
  })

  it('Communicate hidden unless feature flag enabled', () => {
    const names = read('lib/orb/orb-user-facing-names.ts')
    assert.match(names, /ORB_HIDDEN_LAUNCH_STATION_IDS/)
    assert.doesNotMatch(names, /id: 'orb_communicate'[\s\S]*ORB_VISIBLE_SIDEBAR_NAV/)
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(saved, /isOrbCommunicateLaunchVisible/)
    assert.equal(isOrbCommunicateLaunchVisible(), process.env.NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE === '1')
  })

  it('Records status filter chips visible for pilot', () => {
    assert.ok(ORB_RECORDS_STATUS_CHIPS.length >= 4)
    assert.equal(ORB_RECORDS_STATUS_CHIPS[0]?.id, 'status_all')
    assert.ok(ORB_RECORDS_STATUS_CHIPS.some((c) => c.status === 'draft'))
    assert.ok(ORB_RECORDS_STATUS_CHIPS.some((c) => c.status === 'finalised'))
    const panel = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    assert.match(panel, /data-orb-saved-outputs-status-filters/)
    assert.match(panel, /ORB_RECORDS_STATUS_CHIPS/)
    assert.ok(ORB_RECORDS_FILTER_CHIPS.length >= 4)
  })

  it('finalise requires explicit confirmation in ORB Write', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    assert.match(editor, /data-orb-write-finalise-confirm/)
  })

  it('safety copy avoids compliance guarantee', () => {
    const safety = read('lib/orb/orb-residential-safety-copy.ts')
    const footer = read('lib/orb/orb-residential-station-copy.ts')
    assert.match(safety, /professional judgement/i)
    assert.doesNotMatch(safety, /guarantee[sd]?\s+compliance/i)
    assert.doesNotMatch(footer, /guarantee[sd]?\s+compliance/i)
  })

  it('voice post-call actions and audio-not-stored honesty', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const settings = read('components/orb-standalone/orb-voice-settings-panel.tsx')
    assert.match(voice, /data-orb-voice-create-draft-record/)
    assert.match(settings, /data-orb-voice-settings-audio-storage/)
    assert.match(read('lib/orb/privacy/orb-privacy-content.ts'), /not stored/i)
  })
})

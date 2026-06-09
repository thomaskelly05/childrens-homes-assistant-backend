import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const panelSource = readFileSync(join(here, 'orb-explainability-panel.tsx'), 'utf8')
const copySource = readFileSync(join(here, '../../lib/orb/orb-residential-copy.ts'), 'utf8')

const FORBIDDEN_PUBLIC_LABELS = [
  'orb_standalone_brain_service',
  'shared_institutional_cognition_runtime',
  'response_contract',
  'vault_domains',
  'active_brains',
  'brain_selection_shadow',
  'mandatory_contract_service',
  'scenario detector'
]

const REQUIRED_PUBLIC_LABELS = [
  'Safeguarding responsibilities',
  'Residential childcare practice',
  'Child-centred recording',
  'Professional accountability',
  'Therapeutic language',
  'Recording quality'
]

describe('orb explainability public-safe copy', () => {
  it('uses branded staff-facing considerations only', () => {
    for (const label of REQUIRED_PUBLIC_LABELS) {
      assert.match(copySource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
    const joined = copySource.toLowerCase()
    for (const forbidden of FORBIDDEN_PUBLIC_LABELS) {
      assert.equal(joined.includes(forbidden), false, forbidden)
    }
  })

  it('gates internal explainability behind founder access', () => {
    assert.match(panelSource, /userHasFounderAccess\(userRole\)/)
    assert.match(panelSource, /data-orb-explainability-user-facing/)
    assert.doesNotMatch(panelSource, /isOrbDeveloperMode/)
  })
})

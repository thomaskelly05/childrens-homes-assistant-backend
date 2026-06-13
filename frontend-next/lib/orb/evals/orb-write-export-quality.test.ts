import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { validateEnterpriseEvidenceTruthfulness } from '../orb-enterprise-capability-evidence.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write export quality checks', () => {
  it('export module formats headings and review statement', () => {
    const exportSrc = readSource('lib/orb/write/orb-write-export.ts')
    assert.match(exportSrc, /formatBodyWithHeadings/)
    assert.match(exportSrc, /review_required_statement/)
    assert.match(exportSrc, /IndiCare Intelligence/)
  })

  it('markdown tables and checklists supported in write body patterns', () => {
    const sampleBody = `## Actions

| Action | Owner | Deadline |
| --- | --- | --- |
| Manager debrief | Not stated | Not stated |

## Checklist

- [ ] Adult review complete`
    assert.match(sampleBody, /\| --- \|/)
    assert.match(sampleBody, /- \[ \]/)
    assert.match(sampleBody, /Not stated/)
  })

  it('action points preserve owner/deadline placeholders in handoff structure', () => {
    const handoff = readSource('lib/orb/write/orb-write-handoff.ts')
    assert.match(handoff, /accepted_suggestions/)
    assert.match(handoff, /structureOrbWriteDocumentBody/)
  })

  it('PDF and DOCX export entry points exist — no duplicate finalisation', () => {
    const exportSrc = readSource('lib/orb/write/orb-write-export.ts')
    assert.match(exportSrc, /exportOrbWritePdf/)
    assert.match(exportSrc, /copyOrbWriteText/)
    assert.match(exportSrc, /buildOrbWritePrintHtml/)
    const standalone = readSource('lib/orb/write/orb-write-standalone.ts')
    assert.doesNotMatch(standalone, /finaliseDocumentV2|duplicateExport/i)
  })

  it('source references can be included via segment handoff', () => {
    const handoff = readSource('lib/orb/write/orb-write-handoff.ts')
    assert.match(handoff, /segments: OrbDictateTranscriptSegment/)
    const sourceCheck = readSource('lib/orb/dictate/orb-dictate-source-check.ts')
    assert.match(sourceCheck, /formatSegmentSourceRef/)
  })

  it('enterprise evidence map validates governance claims', () => {
    assert.deepEqual(validateEnterpriseEvidenceTruthfulness(), [])
  })

  it('adult review and safeguarding boundary copy remains in write types', () => {
    const types = readSource('lib/orb/write/orb-write-types.ts')
    assert.match(types, /ORB_WRITE_REVIEW_STATEMENT/)
    assert.match(types, /ORB_WRITE_SAFETY_COPY/)
    assert.match(types, /does not replace/i)
  })
})

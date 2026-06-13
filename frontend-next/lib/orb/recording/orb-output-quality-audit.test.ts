import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_OUTPUT_QUALITY_FIXTURES,
  auditRecordTypeBrainDifferentiation,
  auditSectionPromptBody,
  auditTherapeuticBrainBlock,
  getFrameworkRecordType,
  matchesQualityExpectations,
  therapeuticLanguageMapCoversRequiredPhrases
} from './orb-output-quality-audit.ts'
import { buildSectionPromptBody } from './orb-recording-section-prompts.ts'
import { therapeuticWritingForRecordType } from './orb-therapeutic-writing.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function readFrameworkSource() {
  return readFileSync(join(root, 'lib/orb/recording/orb-recording-framework.ts'), 'utf8')
}

describe('ORB Residential output quality audit', () => {
  for (const fixture of ORB_OUTPUT_QUALITY_FIXTURES) {
    it(`${fixture.label} has child-centred section prompts with quality guidance`, () => {
      const audit = auditSectionPromptBody(fixture.recordTypeId)
      assert.ok(audit.sectionCount >= 4, `expected sections for ${fixture.recordTypeId}`)
      assert.ok(audit.hasChildCentredLanguage, `child-centred language missing for ${fixture.recordTypeId}`)
      assert.ok(audit.hasMissingInfoGuidance, `missing-info guidance missing for ${fixture.recordTypeId}`)
      assert.ok(audit.hasStructuredRules, `structured rules missing for ${fixture.recordTypeId}`)
      assert.ok(audit.hasUnsafePhraseGuard, `safety guard missing for ${fixture.recordTypeId}`)

      const quality = matchesQualityExpectations(fixture.recordTypeId, audit.body)
      assert.equal(quality.missingThemes.length, 0, `missing themes: ${quality.missingThemes.join(', ')}`)
    })

    it(`${fixture.label} record type changes brain checks and behaviour`, () => {
      const diff = auditRecordTypeBrainDifferentiation(fixture.recordTypeId)
      assert.ok(diff.hasDistinctSections, `sections too thin for ${fixture.recordTypeId}`)
      assert.ok(diff.hasTherapeuticGuidance, `therapeutic guidance missing for ${fixture.recordTypeId}`)
      if (fixture.structuredFormat) {
        assert.equal(diff.formatHint, fixture.structuredFormat)
      }
    })

    it(`${fixture.label} therapeutic brain block includes residential guidance`, () => {
      const brain = auditTherapeuticBrainBlock(fixture.recordTypeId)
      assert.ok(brain.block.length > 200, `brain block too short for ${fixture.recordTypeId}`)
      assert.ok(brain.includesTherapeuticMap, `therapeutic map missing for ${fixture.recordTypeId}`)
      assert.ok(brain.includesMissingInfo, `missing-info rules missing for ${fixture.recordTypeId}`)
    })
  }

  it('daily record and incident reflection have different required sections in framework JSON', () => {
    const daily = getFrameworkRecordType('daily_record')
    const incident = getFrameworkRecordType('incident_report')
    assert.notDeepEqual(daily?.required_sections, incident?.required_sections)
    assert.match(daily?.professional_language_guidance ?? '', /child/i)
    assert.match(incident?.professional_language_guidance ?? '', /chronological|factual|blame/i)
    const dailyTw = therapeuticWritingForRecordType('daily_record')
    const incidentTw = therapeuticWritingForRecordType('incident_report')
    assert.notEqual(dailyTw?.writing_guidance, incidentTw?.writing_guidance)
  })

  it('framework exports brain prompt block for all modes', () => {
    const source = readFrameworkSource()
    assert.match(source, /buildOrbRecordingBrainPromptBlock/)
    assert.match(source, /buildOrbRecordingBrainContext/)
    assert.match(source, /buildTherapeuticWritingPromptBlock/)
  })

  it('safeguarding reflection prompts escalation and avoids minimisation language', () => {
    const body = buildSectionPromptBody('safeguarding_concern') ?? ''
    assert.match(body, /immediate safety|policy|informed|escalat/i)
    assert.doesNotMatch(body, /minimis|keep secret/i)
    assert.match(body, /\| Action \| Responsible person \|/)
  })

  it('action plan and chronology include table scaffolds', () => {
    const actionPlan = buildSectionPromptBody('action_plan') ?? ''
    const chronology = buildSectionPromptBody('chronology_entry') ?? ''
    assert.match(actionPlan, /\| Action \| Responsible person \| Timescale \| Evidence needed \| Review date \|/)
    assert.match(chronology, /\| Date\/time \| Event \| Source \| Child impact \| Action taken \| Follow-up \|/)
  })

  it('behaviour reflection uses narrative structure not only headings', () => {
    const body = buildSectionPromptBody('behaviour_reflection') ?? ''
    assert.match(body, /communication|unmet need|adult response|learning/i)
    assert.doesNotMatch(body, /^\| Action \|/m)
    assert.match(body, /Do not invent facts/)
  })

  it('therapeutic language map covers required punitive phrases', () => {
    const missing = therapeuticLanguageMapCoversRequiredPhrases()
    assert.deepEqual(missing, [], `uncovered phrases: ${missing.join(', ')}`)
  })

  it('fixtures include realistic rough notes with gaps', () => {
    for (const fixture of ORB_OUTPUT_QUALITY_FIXTURES) {
      assert.ok(fixture.roughInput.length < 300, `rough input too long for ${fixture.label}`)
      assert.ok(fixture.expectedSafetyPrompts.length >= 1)
      assert.ok(getFrameworkRecordType(fixture.recordTypeId), `unknown record type ${fixture.recordTypeId}`)
    }
  })
})

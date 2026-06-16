import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  applyAdultIdentityLanguage,
  buildAdultIdentityPromptBlock,
  countContentSections,
  extractSuppliedAdultInitials,
  hasSafeguardingCue,
  isDailyRecordRequest,
  isIncidentRecordRequest,
  isRecordGenerationRequest,
  isSelfCommentaryParagraph,
  normalizeDuplicateDailyRecordHeadings,
  ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT,
  repairRecordSentenceBoundaries,
  sanitizeChildrensHomeTerminology,
  sanitizeLiveRecordOutput,
  sanitizeObservationInterpretationLanguage,
  stripChildQuoteInterpretation,
  stripEndOfRecordArtefacts,
  stripInterpretiveFeelingsPhrases,
  stripInventedEmotionalImpact,
  stripOutcomeInterpretation,
  stripRedundantNextStepsInDailyRecord,
  stripRepeatedObservedOutcome,
  stripTrailingMarkdownArtefacts,
  stripTrailingSelfCommentary,
  stripUnnecessaryFollowUpSection,
  stripUnsupportedTimelineExpansion,
  userProvidedDslTerm,
  userRequestedEndMarker
} from './orb-adult-identity-language.ts'
import { buildSectionPromptBody } from './orb-recording-section-prompts.ts'
import { buildTherapeuticWritingPromptBlock } from './orb-therapeutic-writing.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const workspaceRoot = join(root, '..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

const DAILY_RECORD_PROMPT =
  "Create a daily record from the following rough notes. Child A came back quieter than usual. Staff gave them space."

describe('ORB live review correction pass', () => {
  it('detects daily vs incident record requests', () => {
    assert.equal(isDailyRecordRequest(DAILY_RECORD_PROMPT), true)
    assert.equal(isIncidentRecordRequest(DAILY_RECORD_PROMPT), false)
    assert.equal(isIncidentRecordRequest('Create an incident reflection from these notes'), true)
  })

  it('applies adult identity without inventing initials', () => {
    const cleaned = applyAdultIdentityLanguage('Staff gave Child A space and checked in later.')
    assert.match(cleaned, /The adult gave Child A space/i)
    assert.doesNotMatch(cleaned, /Adult [A-Z]{1,3}/)
  })

  it('retains supplied Adult TK / Adult JS labels', () => {
    const source = 'Adult TK gave Child A space. Adult JS checked in later. Staff offered toast.'
    assert.deepEqual(extractSuppliedAdultInitials(source), ['TK', 'JS'])
    const cleaned = applyAdultIdentityLanguage(source, ['TK', 'JS'])
    assert.match(cleaned, /Adult TK/)
    assert.match(cleaned, /Adult JS/)
    assert.doesNotMatch(cleaned, /\bStaff\b/)
  })

  it('sanitizes mood improved, seemed more relaxed and seemed relaxed wording', () => {
    const cleaned = sanitizeObservationInterpretationLanguage(
      'By evening mood improved and Child A seemed more relaxed.'
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /mood improved/)
    assert.doesNotMatch(cleaned.toLowerCase(), /seemed more relaxed/)
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
  })

  it('does not default to DSL in residential output when not in input', () => {
    const source = 'Child A quieter after school. Manager informed.'
    const cleaned = sanitizeChildrensHomeTerminology('DSL informed and pathway to DSL followed.', source)
    assert.doesNotMatch(cleaned, /\bDSL\b/)
    assert.match(cleaned.toLowerCase(), /manager/)
    assert.equal(userProvidedDslTerm(source), false)
  })

  it('replaces Staff on Duty and staff consistently when initials supplied', () => {
    const source = 'Create a daily record. Adult TK and Adult JS on shift.'
    const cleaned = sanitizeLiveRecordOutput(
      '## Safeguarding Note\nStaff on Duty. Staff checked in. Child seemed more relaxed. DSL informed.',
      source
    )
    assert.doesNotMatch(cleaned, /Staff on Duty/)
    assert.doesNotMatch(cleaned, /\bStaff\b/)
    assert.doesNotMatch(cleaned, /\bDSL\b/)
    assert.doesNotMatch(cleaned, /Safeguarding Note/)
    assert.doesNotMatch(cleaned.toLowerCase(), /seemed more relaxed/)
  })

  it('ordinary daily input has no safeguarding cue by default', () => {
    assert.equal(hasSafeguardingCue(DAILY_RECORD_PROMPT), false)
  })

  it('flags self-commentary after records including This record captures', () => {
    assert.equal(
      isSelfCommentaryParagraph(
        'This record maintains a factual, child-centred approach and uses therapeutic language throughout.'
      ),
      true
    )
    assert.equal(
      isSelfCommentaryParagraph(
        "This record captures the child's experience in a factual, child-centred way."
      ),
      true
    )
    assert.equal(isSelfCommentaryParagraph('Daily Record\n\nChild A appeared quieter after school.'), false)
  })

  it('strips trailing self-commentary from record output', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripTrailingSelfCommentary(
      'Daily Record\n\nChild A appeared quieter.\n\nThis record captures the child\'s experience.',
      source
    )
    assert.doesNotMatch(cleaned, /This record captures/)
  })

  it('preserves self-commentary when user asks why wording is better', () => {
    const cleaned = stripTrailingSelfCommentary(
      'Daily Record\n\nChild A appeared quieter.\n\nThis record maintains a factual approach.',
      'Why is this daily record wording better than my rough notes?'
    )
    assert.match(cleaned, /This record maintains/)
  })

  it('strips this indicates after direct child quote in simple daily record', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripChildQuoteInterpretation(
      'Child A said, "I\'m just annoyed about school." This indicates frustration or dissatisfaction regarding school.',
      source
    )
    assert.match(cleaned, /I'm just annoyed about school\./)
    assert.doesNotMatch(cleaned.toLowerCase(), /this indicates/)
    assert.doesNotMatch(cleaned.toLowerCase(), /frustration/)
    assert.doesNotMatch(cleaned.toLowerCase(), /dissatisfaction/)
  })

  it('removes invented emotional impact unless supported by input', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripInventedEmotionalImpact(
      'Adult JS remained nearby, allowing Child A to feel safe and comfortable.',
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /feel safe and comfortable/)
  })

  it('removes unnecessary Follow-up when handover already exists', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripUnnecessaryFollowUpSection(
      '## Outcome / Handover\n\nAdult TK handed over to next shift.\n\n## Follow-up for next shift\n\nCheck in tomorrow.',
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /follow-up/)
    assert.match(cleaned.toLowerCase(), /handed over/)
  })

  it('detects record generation requests including magic notes', () => {
    assert.equal(isRecordGenerationRequest(ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT), true)
    assert.equal(isRecordGenerationRequest('Create magic notes from these rough notes'), true)
  })

  it('simple sanitized daily record has no more than three content sections', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      '## Daily Record\n\nOverview.\n\n## Presentation and Support\n\nChild A quieter.\n\n## Safeguarding Note\n\nNone.\n\n## Follow-up\n\nTomorrow.\n\n## Outcome / Handover\n\nHanded over.',
      source
    )
    assert.doesNotMatch(cleaned, /Safeguarding Note/)
    assert.ok(countContentSections(cleaned) <= 3)
  })

  it('documents manual regression prompt for live retest', () => {
    assert.match(ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT, /Adult TK/)
    assert.match(ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT, /Adult JS/)
    assert.match(ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT, /appeared calmer/)
    assert.match(ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT, /I'm just annoyed about school\./)
  })

  it('strips approach allowed feel supported wording', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripInventedEmotionalImpact(
      'This approach allowed Child A to feel supported without pressure to engage further.',
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /feel supported/)
  })

  it('preserves adult action when stripping helping feel safe and comfortable', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripInventedEmotionalImpact(
      'Adult JS sat nearby, helping Child A feel safe and comfortable.',
      source
    )
    assert.match(cleaned, /Adult JS sat nearby/)
    assert.doesNotMatch(cleaned.toLowerCase(), /feel safe/)
    assert.doesNotMatch(cleaned.toLowerCase(), /comfortable/)
  })

  it('preserves child-stated feeling when supported by input', () => {
    const source = `${ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT} Child A said, "I felt supported when Adult JS sat nearby."`
    const cleaned = stripInventedEmotionalImpact(
      'Child A said, "I felt supported when Adult JS sat nearby."',
      source
    )
    assert.match(cleaned.toLowerCase(), /felt supported/)
  })

  it('strips positive shift in mood while preserving appeared calmer', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripOutcomeInterpretation(
      'Child A ate the toast and appeared calmer before bedtime, indicating a positive shift in mood.',
      source
    )
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
    assert.doesNotMatch(cleaned.toLowerCase(), /positive shift in mood/)
  })

  it('strips showed emotional regulation wording', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripOutcomeInterpretation('Child A ate toast. This showed emotional regulation.', source)
    assert.doesNotMatch(cleaned.toLowerCase(), /emotional regulation/)
    assert.match(cleaned.toLowerCase(), /ate toast/)
  })

  it('merges duplicate Outcome and Outcome / Handover headings', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = normalizeDuplicateDailyRecordHeadings(
      '## Outcome\n\nChild A appeared calmer before bedtime.\n\n## Outcome / Handover\n\nAdult TK handed over to next shift.',
      source
    )
    assert.doesNotMatch(cleaned, /^##\s+Outcome\s*$/m)
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
    assert.match(cleaned.toLowerCase(), /handed over/)
  })

  it('sanitizes manual regression live output shape', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      [
        '## Daily Record',
        '',
        '## Presentation and Support',
        '',
        'Child A returned quieter after school. Adult TK gave Child A space. Adult JS checked in later.',
        '',
        'Child A said, "I\'m just annoyed about school."',
        '',
        '## Adult Response',
        '',
        'Adult JS offered toast and sat nearby, helping Child A feel safe and comfortable.',
        '',
        '## Outcome',
        '',
        'Child A accepted and ate the toast.',
        '',
        '## Outcome / Handover',
        '',
        'Child A appeared calmer before bedtime, indicating a positive shift in mood. This approach allowed Child A to feel supported without pressure. Adult TK handed over to next shift.'
      ].join('\n'),
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /feel supported/)
    assert.doesNotMatch(cleaned.toLowerCase(), /feel safe/)
    assert.doesNotMatch(cleaned.toLowerCase(), /positive shift in mood/)
    assert.match(cleaned, /Adult TK/)
    assert.match(cleaned, /Adult JS/)
    assert.match(cleaned, /I'm just annoyed about school\./)
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
    assert.doesNotMatch(cleaned, /^##\s+Outcome\s*$/m)
  })

  it('daily record section prompts avoid Incident Summary headings', () => {
    const body = buildSectionPromptBody('daily_record') ?? ''
    assert.match(body, /## Daily Record/)
    assert.match(body, /## Presentation and Support/)
    assert.match(body, /## Adult Response/)
    assert.match(body, /## Outcome \/ Handover/)
    assert.doesNotMatch(body, /^## Incident Summary/mi)
    assert.doesNotMatch(body, /^## Follow-up for next shift/mi)
    assert.doesNotMatch(body, /^## Child's Voice/mi)
  })

  it('therapeutic writing prompt block includes adult identity and DSL discipline', () => {
    const block = buildTherapeuticWritingPromptBlock('daily_record').toLowerCase()
    assert.match(block, /do not default to 'staff'/)
    assert.match(block, /do not add a self-assessment|no self-commentary|self-commentary/)
    assert.match(block, /appeared calmer/)
    assert.match(block, /dsl/)
  })

  it('frontend and backend framework versions remain aligned', () => {
    const frontend = JSON.parse(read('lib/orb/recording/orb-recording-framework.json'))
    const backend = JSON.parse(
      readFileSync(join(workspaceRoot, 'assistant/knowledge/orb_recording_framework.json'), 'utf8')
    )
    assert.equal(frontend.version, backend.version)
    assert.equal(frontend.version, '1.2.6')
    const daily = frontend.record_types.find((row: { id: string }) => row.id === 'daily_record')
    assert.ok(daily.final_document_headings.includes('Daily Record'))
    assert.ok(!daily.final_document_headings.join(' ').match(/Incident Summary/i))
  })

  it('adult identity prompt includes examples and heading discipline', () => {
    const block = buildAdultIdentityPromptBlock()
    assert.match(block, /Adult TK gave Child A space/)
    assert.match(block, /Incident Summary/)
    assert.match(block, /Outcome \/ Handover/)
    assert.match(block, /complete sentences/i)
  })

  it('repairs sentence boundaries for broken live output', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    assert.match(
      sanitizeLiveRecordOutput('appearing quieter than usual Adult TK noticed this', source),
      /quieter than usual\. Adult TK/
    )
    assert.match(
      sanitizeLiveRecordOutput('space to settle Later, Adult JS checked in', source),
      /settle\. Later,/
    )
    assert.match(
      sanitizeLiveRecordOutput('watched TV During this time, Child A ate toast', source),
      /watched television\. During this time,/
    )
    assert.match(
      sanitizeLiveRecordOutput('before bedtime Adult TK handed over', source),
      /before bedtime\. Adult TK/
    )
  })

  it('strips interpretive Child A feelings phrasing unless supported', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripInterpretiveFeelingsPhrases(
      "In response to Child A's feelings, Adult JS offered toast.",
      source
    )
    assert.match(cleaned, /^In response/)
    assert.doesNotMatch(cleaned, /Child A's feelings/)
  })

  it('removes unsupported timeline expansion and strengthens observation wording', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      "Child A seemed more settled as the evening progressed.\n\n—",
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /as the evening progressed/)
    assert.doesNotMatch(cleaned.toLowerCase(), /seemed more settled/)
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
    assert.doesNotMatch(cleaned, /—\s*$/)
  })

  it('repairs watched television Child A sentence boundary', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      'Adult JS sat nearby while Child A watched television Child A accepted the toast.',
      source
    )
    assert.match(cleaned, /watched television\. Child A/)
  })

  it('repairs accepted the toast Before bedtime sentence boundary', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      'Child A accepted the toast Before bedtime, Child A appeared calmer.',
      source
    )
    assert.match(cleaned, /accepted the toast\. Before bedtime/)
  })

  it('repairs appeared calmer Adult TK sentence boundary', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput('Child A appeared calmer Adult TK handed over.', source)
    assert.match(cleaned, /appeared calmer\. Adult TK/)
  })

  it('removes duplicate appeared calmer from Adult Response when Outcome has timed version', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripRepeatedObservedOutcome(
      '## Adult Response\n\nAdult JS offered toast. Child A accepted the toast and appeared calmer.\n\n## Outcome / Handover\n\nBefore bedtime, Child A appeared calmer. Adult TK handed over.',
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /accepted the toast and appeared calmer/)
    assert.match(cleaned.toLowerCase(), /before bedtime, child a appeared calmer/)
  })

  it('preserves appeared calmer when it appears only once', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripRepeatedObservedOutcome(
      '## Adult Response\n\nChild A accepted the toast and appeared calmer.',
      source
    )
    assert.match(cleaned.toLowerCase(), /appeared calmer/)
  })

  it('strips inline Next Steps heading and same-line bullets', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripRedundantNextStepsInDailyRecord(
      "## Outcome / Handover\n\nAdult TK handed over to check in tomorrow.\n\nNext Steps: - Monitor Child A's mood - Check in about school",
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /next steps/)
    assert.match(cleaned.toLowerCase(), /handed over/)
  })

  it('strips multiline Next Steps section from simple daily record', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      "## Outcome / Handover\n\nAdult TK handed over.\n\n## Next Steps\n\n- Monitor mood\n- Check in tomorrow",
      source
    )
    assert.doesNotMatch(cleaned.toLowerCase(), /next steps/)
    assert.match(cleaned.toLowerCase(), /outcome \/ handover/)
  })

  it('removes [End of record] artefact', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = stripEndOfRecordArtefacts('Child A appeared calmer.\n\n[End of record]', source)
    assert.doesNotMatch(cleaned, /\[End of record\]/i)
  })

  it('preserves user-requested end marker', () => {
    const source = 'Create a daily record with an end marker. Child A quieter.\n\n[End of record]'
    const cleaned = stripEndOfRecordArtefacts('Child A quieter.\n\n[End of record]', source)
    assert.match(cleaned, /\[End of record\]/)
    assert.equal(userRequestedEndMarker(source), true)
  })

  it('sanitizes full manual regression failure output', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const cleaned = sanitizeLiveRecordOutput(
      [
        '## Adult Response',
        '',
        'Adult JS offered toast and sat nearby while Child A watched television Child A accepted the toast and appeared calmer.',
        '',
        '## Outcome / Handover',
        '',
        'Before bedtime, Child A appeared calmer. Adult TK handed over to check in tomorrow.',
        '',
        'Next Steps: - Monitor mood - Check in about school',
        '',
        '[End of record]'
      ].join('\n'),
      source
    )
    assert.match(cleaned, /watched television\. Child A/)
    assert.doesNotMatch(cleaned.toLowerCase(), /accepted the toast and appeared calmer/)
    assert.doesNotMatch(cleaned.toLowerCase(), /next steps/)
    assert.doesNotMatch(cleaned, /\[End of record\]/i)
  })

  it('does not break protected child-object phrases during sentence repair', () => {
    const protectedPhrases = [
      'gave Child A space',
      'checked in with Child A',
      'offered Child A toast',
      'sat nearby while Child A watched television',
      'check in gently with Child A'
    ]
    for (const phrase of protectedPhrases) {
      const repaired = repairRecordSentenceBoundaries(phrase)
      assert.doesNotMatch(repaired, /\. Child A/)
      assert.match(repaired.toLowerCase(), new RegExp(phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    }
  })

  it('repairs damaged live daily record output without sanitizer grammar damage', () => {
    const source = ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    const damaged = [
      'Daily Record',
      '',
      'Presentation and Support',
      'Child A returned from school appearing quieter than usual. Adult TK observed this and gave. Child A space to settle. Later, Adult JS checked in with. Child A to see how they were feeling',
      '',
      'Child Voice',
      'During the check-in, Child A expressed, "I\'m just annoyed about school." This statement indicated that. Child A was processing some feelings related to their school experience',
      '',
      'Adult Response',
      'In response, Adult JS offered. Child A some toast and sat nearby while. Child A watched television This provided a calm and supportive environment. Child A accepted the toast and appeared calmer',
      '',
      'Outcome / Handover',
      "Before bedtime, Child A appeared more settled. Adult TK handed over to the next shift that tomorrow's adults should check in gently with. Child A about school if they wish to talk This approach aims to support. Child A's emotional needs and encourage open communication"
    ].join('\n')
    const cleaned = sanitizeLiveRecordOutput(damaged, source)
    const lowered = cleaned.toLowerCase()
    assert.doesNotMatch(lowered, /gave\. child a/)
    assert.doesNotMatch(lowered, /with\. child a/)
    assert.doesNotMatch(lowered, /offered\. child a/)
    assert.match(lowered, /gave child a/)
    assert.match(lowered, /offered child a/)
    assert.match(lowered, /checked in with child a/)
    assert.match(lowered, /watched television/)
    assert.match(cleaned, /I'm just annoyed about school\./)
    assert.doesNotMatch(lowered, /child voice/)
    assert.doesNotMatch(lowered, /statement indicated/)
    assert.doesNotMatch(lowered, /processing some feelings/)
    assert.doesNotMatch(lowered, /calm and supportive environment/)
    assert.doesNotMatch(lowered, /approach aims/)
    assert.doesNotMatch(lowered, /emotional needs/)
    assert.doesNotMatch(lowered, /appeared more settled/)
    assert.match(lowered, /appeared calmer before bedtime/)
    assert.doesNotMatch(lowered, /child a was/)
    assert.match(lowered, /with child a about school/)
  })
})

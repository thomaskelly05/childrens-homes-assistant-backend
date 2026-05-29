const COMPRESSED_HEADINGS: Array<[RegExp, string]> = [
  [/\bPracticalAnswer\b/g, 'Practical Answer'],
  [/\bPracticalStepstoTake\b/g, 'Practical Steps to Take'],
  [/\bWhatThisMeansinPractice\b/g, 'What This Means in Practice'],
  [/\bKeyPoints\b/g, 'Key Points'],
  [/\bNextSteps\b/g, 'Next Steps'],
  [/\bWhatToRecord\b/g, 'What To Record'],
  [/\bManagerOversight\b/g, 'Manager Oversight'],
  [/\bSafeguardingLens\b/g, 'Safeguarding Lens'],
  [/\bOfstedLens\b/g, 'Ofsted Lens']
]

const COMPACT_FIELD_LABELS: Array<[RegExp, string]> = [
  [/\bDateandTime:/g, 'Date and Time:'],
  [/\bIndividualsInvolved:/g, 'Individuals Involved:'],
  [/\bContextoftheIncident:/g, 'Context of the Incident:'],
  [/\bDescriptionoftheRestraint:/g, 'Description of the Restraint:'],
  [/\bChildsBehaviour:/g, "Child's Behaviour:"],
  [/\bChild’sBehaviour:/g, "Child’s Behaviour:"],
  [/\bStaffResponse:/g, 'Staff Response:'],
  [/\bManagerReview:/g, 'Manager Review:'],
  [/\bListenandReassure:/g, 'Listen and Reassure:'],
  [/\bDoNotProbeforDetails:/g, 'Do Not Probe for Details:'],
  [/\bEnsureImmediateSafety:/g, 'Ensure Immediate Safety:'],
  [/\bFollowInternalProcedures:/g, 'Follow Internal Procedures:'],
  [/\bDocumenttheDisclosure:/g, 'Document the Disclosure:'],
  [/\bMaintainConfidentiality:/g, 'Maintain Confidentiality:'],
  [/\bProvideOngoingSupport:/g, 'Provide Ongoing Support:'],
  [/\bReflectandReview:/g, 'Reflect and Review:']
]

function normaliseOutsideCodeBlocks(input: string, transform: (segment: string) => string): string {
  const parts = input.split(/(```[\s\S]*?```)/g)
  return parts
    .map((part) => (part.startsWith('```') ? part : transform(part)))
    .join('')
}

function repairCommonCompressedLabels(value: string): string {
  let next = value
  for (const [pattern, replacement] of COMPRESSED_HEADINGS) {
    next = next.replace(pattern, replacement)
  }
  for (const [pattern, replacement] of COMPACT_FIELD_LABELS) {
    next = next.replace(pattern, replacement)
  }
  return next
}

function repairMarkdownStructure(value: string): string {
  return value
    // headings need a space after # markers and usually a blank line before them
    .replace(/([^\n])\n?(#{1,6})([A-Za-z])/g, '$1\n\n$2 $3')
    .replace(/(^|\n)(#{1,6})([A-Za-z])/g, '$1$2 $3')
    // ordered lists need a space after the marker: 1.Item -> 1. Item
    .replace(/(^|\n)(\s*\d+\.)(?=\S)/g, '$1$2 ')
    // bullets need a space after the marker: -Item -> - Item
    .replace(/(^|\n)(\s*[-*])(?=\S)/g, '$1$2 ')
    // common markdown emitted as a run-on continuation after a sentence
    .replace(/([.!?])\s*(#{1,6}\s+)/g, '$1\n\n$2')
}

function repairReadableFieldSpacing(value: string): string {
  return value
    // Specific high-value compact phrases seen from model markdown failures.
    .replace(/\bThetypeofrestraintused\b/g, 'The type of restraint used')
    .replace(/\bDurationoftherestraint\b/g, 'Duration of the restraint')
    .replace(/\bAnyverbalcommunication\b/g, 'Any verbal communication')
    .replace(/\bClearlystatewhen\b/g, 'Clearly state when')
    .replace(/\bSpecifywhere\b/g, 'Specify where')
    .replace(/\bListthenames\b/g, 'List the names')
    .replace(/\bDescribewhatled\b/g, 'Describe what led')
    .replace(/\bProvideafactualaccount\b/g, 'Provide a factual account')
}

/**
 * Repairs common markdown formatting glitches without changing normal prose.
 * This is a rendering safety net. The provider stream must still preserve spaces.
 */
export function normaliseOrbMarkdown(content: string): string {
  if (!content) return ''
  return normaliseOutsideCodeBlocks(content, (segment) => {
    let next = segment.replace(/\r\n/g, '\n')
    next = repairCommonCompressedLabels(next)
    next = repairMarkdownStructure(next)
    next = repairReadableFieldSpacing(next)
    return next
  }).trim()
}

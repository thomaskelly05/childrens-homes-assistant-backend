import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { checkFounderOutputSafety } from './founder-output-safety.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder output safety', () => {
  it('safety module covers invented metrics and fabricated traction patterns', () => {
    const source = read('lib/founder/safety/founder-output-safety.ts')
    assert.match(source, /INVENTED_METRICS/)
    assert.match(source, /FABRICATED_TRACTION/)
    assert.match(source, /ofsted/i)
    assert.match(source, /endorsement/i)
    assert.match(source, /openai/)
    assert.match(source, /interested/)
  })

  it('flags invented revenue and user counts', () => {
    const result = checkFounderOutputSafety('We have 500 paid users on the platform and £12,000 MRR.')
    assert.equal(result.safe, false)
    assert.ok(result.issues.some((issue) => issue.code === 'invented-metric' || issue.code === 'unsupported-live-data'))
  })

  it('flags fabricated provider and investor interest', () => {
    const result = checkFounderOutputSafety(
      'Several providers have signed and OpenAI is interested in our pilot which is now live.'
    )
    assert.equal(result.safe, false)
    assert.ok(result.issues.some((issue) => issue.code === 'fabricated-traction'))
  })

  it('flags Ofsted endorsement claims', () => {
    const result = checkFounderOutputSafety('Ofsted has endorsed our approach to safeguarding intelligence.')
    assert.equal(result.safe, false)
    assert.ok(result.issues.some((issue) => issue.code === 'fabricated-traction'))
  })

  it('flags child and staff identifiable patterns', () => {
    const child = checkFounderOutputSafety('The child name was mentioned in the report.')
    assert.equal(child.safe, false)
    assert.ok(child.issues.some((issue) => issue.code === 'child-identifiable'))

    const staff = checkFounderOutputSafety('Include the staff name in the summary.')
    assert.equal(staff.safe, false)
    assert.ok(staff.issues.some((issue) => issue.code === 'staff-identifiable'))
  })

  it('passes honest limitation copy', () => {
    const result = checkFounderOutputSafety(
      'Live billing is not connected. MRR is not recorded yet. Approval is required before external use.'
    )
    assert.equal(result.safe, true)
    assert.equal(result.requiresReview, false)
  })
})

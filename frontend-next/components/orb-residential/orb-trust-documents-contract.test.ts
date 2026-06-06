import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

const TRUST_DOCS = [
  'docs/trust/orb-security-overview.md',
  'docs/trust/orb-ai-and-data-use.md',
  'docs/trust/orb-privacy-and-retention.md',
  'docs/trust/orb-subprocessors.md',
  'docs/trust/orb-incident-response.md',
  'docs/trust/orb-data-deletion-and-export.md',
  'docs/trust/orb-provider-security-faq.md',
  'docs/trust/orb-human-review-and-safeguarding.md',
]

describe('ORB trust documents contract', () => {
  for (const relativePath of TRUST_DOCS) {
    it(`${relativePath} exists with required trust themes`, () => {
      const doc = readFileSync(join(repoRoot, relativePath), 'utf8')
      assert.ok(doc.length > 200, 'document should have substantive content')
      assert.doesNotMatch(doc, /SOC 2 certified/i)
      assert.doesNotMatch(doc, /ISO 27001 certified/i)
    })
  }

  it('trust docs mention login and human review', () => {
    const overview = readFileSync(join(repoRoot, 'docs/trust/orb-security-overview.md'), 'utf8')
    const safeguarding = readFileSync(
      join(repoRoot, 'docs/trust/orb-human-review-and-safeguarding.md'),
      'utf8'
    )
    assert.match(overview, /login/i)
    assert.match(safeguarding, /human review/i)
    assert.match(safeguarding, /safeguarding/i)
  })
})

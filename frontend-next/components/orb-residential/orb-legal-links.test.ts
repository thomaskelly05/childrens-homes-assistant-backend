import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB legal links', () => {
  it('auth footer renders Privacy, Terms, Cookies and Support as separate internal links', () => {
    const legal = read('components/orb-residential/orb-legal-links.tsx')
    const footer = read('components/orb-residential/orb-login-legal-footer.tsx')

    assert.match(legal, /variant === 'auth'/)
    assert.match(legal, /paths\[item\.key\]/)
    assert.match(legal, /cookies: '\/cookies'/)
    assert.match(legal, /support: '\/support'/)
    assert.match(legal, /orb-legal-links-separator/)
    assert.match(legal, /Privacy/)
    assert.match(legal, /Terms/)
    assert.match(legal, /Cookies/)
    assert.match(legal, /Support/)
    assert.match(footer, /variant="auth"/)
    assert.doesNotMatch(legal, /PrivacyTerms/)
  })

  it('in-app surfaces keep internal privacy and terms routes', () => {
    const legal = read('components/orb-residential/orb-legal-links.tsx')
    assert.match(legal, /variant = 'in-app'/)
    assert.match(legal, /href=\{paths\.privacy\}/)
    assert.match(legal, /href=\{paths\.terms\}/)
  })

  it('default legal paths use /privacy /terms /cookies /support', () => {
    const legal = read('components/orb-residential/orb-legal-links.tsx')
    assert.match(legal, /privacy: '\/privacy'/)
    assert.match(legal, /terms: '\/terms'/)
    assert.match(legal, /cookies: '\/cookies'/)
    assert.match(legal, /support: '\/support'/)
  })
})

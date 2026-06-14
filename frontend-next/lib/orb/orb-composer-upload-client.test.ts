import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')
}

describe('orb-composer-upload-client', () => {
  it('posts to standalone documents upload via authFetch only', () => {
    const mod = read('lib/orb/orb-composer-upload-client.ts')
    assert.match(mod, /authFetch\('\/orb\/standalone\/documents\/upload'/)
    assert.match(mod, /from '@\/lib\/auth\/api'/)
    assert.doesNotMatch(mod, /from '@\/lib\/orb\/standalone-client'/)
    assert.doesNotMatch(mod, /document-intelligence/)
    assert.doesNotMatch(mod, /evals\//)
  })

  it('care companion uses lightweight upload client', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /uploadOrbComposerDocument/)
    assert.doesNotMatch(companion, /uploadOrbStandaloneDocument/)
  })
})

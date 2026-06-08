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
  it('login footer uses public www.indicare.co.uk URLs', () => {
    const login = read('components/orb-residential/orb-login-screen.tsx')
    const legal = read('components/orb-residential/orb-legal-links.tsx')

    assert.match(login, /publicUrls/)
    assert.match(legal, /https:\/\/www\.indicare\.co\.uk\/privacy/)
    assert.match(legal, /https:\/\/www\.indicare\.co\.uk\/terms/)
    assert.match(legal, /https:\/\/www\.indicare\.co\.uk\/cookies/)
    assert.match(legal, /https:\/\/www\.indicare\.co\.uk\/support/)
    assert.match(legal, /data-orb-cookies-link/)
    assert.match(legal, /data-orb-support-link/)
    assert.match(legal, /rel="noopener noreferrer"/)
  })

  it('in-app surfaces keep internal privacy and terms routes', () => {
    const legal = read('components/orb-residential/orb-legal-links.tsx')
    assert.match(legal, /href="\/privacy"/)
    assert.match(legal, /href="\/terms"/)
  })
})

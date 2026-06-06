import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB no chat stream on mount', () => {
  it('conversation stream requires user-initiated flag', () => {
    const client = read('lib/orb/standalone-client.ts')
    assert.match(client, /isOrbUserInitiatedConversationStream/)
    assert.match(client, /shouldAllowOrbProductFetch\('conversation_stream'\)/)
  })

  it('care companion marks user-initiated stream only on send', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /markOrbUserInitiatedConversationStream/)
    assert.doesNotMatch(companion, /sessionPrimedRef/)
  })
})

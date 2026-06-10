import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('founder live proxy inspection readiness isolation', () => {
  it('treats inspection readiness as an optional live section', () => {
    const proxy = read('lib/founder/live/founder-live-proxy.ts')
    assert.match(proxy, /FOUNDER_OPTIONAL_LIVE_SECTIONS/)
    assert.match(proxy, /'inspection-readiness'/)
  })

  it('returns unavailable inspection readiness payload instead of propagating 500', () => {
    const proxy = read('lib/founder/live/founder-live-proxy.ts')
    assert.match(proxy, /available:\s*false/)
    assert.match(proxy, /Inspection readiness temporarily unavailable/)
    assert.match(proxy, /error:\s*'unavailable'/)
    assert.match(proxy, /INSPECTION_READINESS_LIMITATION/)
    assert.match(proxy, /readiness: inspectionReadinessUnavailable \? 'unavailable' : 'ok'/)
    assert.match(proxy, /status: 200/)
  })

  it('does not mark founder bootstrap busy for optional inspection readiness failure', () => {
    const bootstrapClient = read('lib/founder/bootstrap/founder-bootstrap-client.ts')
    assert.match(bootstrapClient, /FOUNDER_CRITICAL_SECTIONS/)
    assert.match(bootstrapClient, /hasFounderCriticalSectionError/)
    assert.match(bootstrapClient, /'persistence'/)
    assert.doesNotMatch(bootstrapClient, /'inspection-readiness'/)
  })

  it('shows degraded banner only for critical persistence failures', () => {
    const hydrator = read('components/founder/founder-persistence-hydrator.tsx')
    assert.match(hydrator, /hasFounderCriticalSectionError/)
    assert.doesNotMatch(hydrator, /Object\.keys\(errors\)\.length/)
  })
})

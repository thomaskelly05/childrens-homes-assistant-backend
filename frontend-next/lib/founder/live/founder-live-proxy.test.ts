import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('founder live proxy Inspection evidence preparation isolation', () => {
  it('treats Inspection evidence preparation as an optional live section', () => {
    const proxy = read('lib/founder/live/founder-live-proxy.ts')
    assert.match(proxy, /FOUNDER_OPTIONAL_LIVE_SECTIONS/)
    assert.match(proxy, /'inspection evidence preparation'/)
  })

  it('returns unavailable Inspection evidence preparation payload instead of propagating 500', () => {
    const proxy = read('lib/founder/live/founder-live-proxy.ts')
    assert.match(proxy, /available:\s*false/)
    assert.match(proxy, /Inspection evidence preparation temporarily unavailable/)
    assert.match(proxy, /error:\s*'unavailable'/)
    assert.match(proxy, /INSPECTION_READINESS_LIMITATION/)
    assert.match(proxy, /readiness: inspectionReadinessUnavailable \? 'unavailable' : 'ok'/)
    assert.match(proxy, /status: 200/)
  })

  it('does not mark founder bootstrap busy for optional Inspection evidence preparation failure', () => {
    const bootstrapClient = read('lib/founder/bootstrap/founder-bootstrap-client.ts')
    assert.match(bootstrapClient, /FOUNDER_CRITICAL_SECTIONS/)
    assert.match(bootstrapClient, /hasFounderCriticalSectionError/)
    assert.match(bootstrapClient, /'persistence'/)
    assert.doesNotMatch(bootstrapClient, /'inspection evidence preparation'/)
  })

  it('shows degraded banner only for critical persistence failures', () => {
    const hydrator = read('components/founder/founder-persistence-hydrator.tsx')
    assert.match(hydrator, /hasFounderCriticalSectionError/)
    assert.doesNotMatch(hydrator, /Object\.keys\(errors\)\.length/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const root = join(import.meta.dirname ?? '.', '..', '..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

describe('Founder ORB Quality Agent UI', () => {
  it('shows approval required status', () => {
    const page = read('components/founder/founder-orb-quality-agent-page.tsx')
    assert.ok(page.includes('data-testid="approval-required-badge"'))
    assert.ok(page.includes('Approval required'))
  })

  it('does not show auto-merge option', () => {
    const page = read('components/founder/founder-orb-quality-agent-page.tsx')
    assert.ok(page.includes('data-testid="no-auto-merge-notice"'))
    assert.ok(page.includes('Auto-merge is not available'))
    assert.equal(page.includes('auto-merge'), true)
    assert.equal(/autoMerge\s*[:=]\s*true/.test(page), false)
  })

  it('shows safeguarding disclaimer', () => {
    const page = read('components/founder/founder-orb-quality-agent-page.tsx')
    assert.ok(page.includes('data-testid="orb-quality-agent-disclaimer"'))
    assert.ok(page.includes('ORB_QUALITY_AGENT_DISCLAIMER'))
  })

  it('has generate build brief and create draft PR buttons', () => {
    const page = read('components/founder/founder-orb-quality-agent-page.tsx')
    assert.ok(page.includes('data-testid="generate-build-brief-button"'))
    assert.ok(page.includes('data-testid="create-draft-pr-button"'))
  })

  it('is founder-guarded at route level', () => {
    const route = read('app/founder/orb-quality-agent/page.tsx')
    assert.ok(route.includes('FounderGuard'))
  })
})

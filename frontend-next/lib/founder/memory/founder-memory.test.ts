import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { buildFounderStrategicContext } from './founder-memory-context.ts'
import { DEFAULT_FOUNDER_MEMORY_ITEMS } from './default-founder-memory.ts'
import type { FounderMemoryItem } from './founder-memory-types.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('Founder Memory V1', () => {
  it('builds strategic context from active memory', () => {
    const context = buildFounderStrategicContext(DEFAULT_FOUNDER_MEMORY_ITEMS)
    assert.ok(context.primaryObjective.includes('ORB Residential'))
    assert.ok(context.currentProductFocus.includes('ORB Residential'))
    assert.ok(context.currentCommercialFocus.includes('pilot'))
    assert.ok(context.operatingPrinciples.length >= 3)
    assert.ok(context.deferredObjectives.length >= 1)
    assert.equal(context.activeMemoryCount, DEFAULT_FOUNDER_MEMORY_ITEMS.length)
  })

  it('excludes archived memory from strategic context', () => {
    const archived: FounderMemoryItem[] = DEFAULT_FOUNDER_MEMORY_ITEMS.map((item, index) =>
      index === 0 ? { ...item, status: 'archived' } : item
    )
    const context = buildFounderStrategicContext(archived)
    assert.equal(context.activeMemoryCount, DEFAULT_FOUNDER_MEMORY_ITEMS.length - 1)
    assert.ok(!context.primaryObjective.includes('Launch ORB Residential'))
  })

  it('memory safety module rejects identifiable content patterns', () => {
    const memorySafety = read('lib/founder/memory/founder-memory-safety.ts')
    const outputSafety = read('lib/founder/safety/founder-output-safety.ts')
    assert.match(memorySafety, /checkFounderOutputSafety/)
    assert.match(memorySafety, /checkContentSafety/)
    assert.match(outputSafety, /child-identifiable/)
    assert.match(outputSafety, /staff-identifiable/)
    assert.match(outputSafety, /provider-identifiable/)
  })

  it('ORB Founder context serialises founder strategic memory', () => {
    const contextFile = read('lib/founder/orb-founder/orb-founder-context.ts')
    assert.match(contextFile, /strategicMemory/)
    assert.match(contextFile, /founderStrategicMemory/)
    assert.match(contextFile, /getFounderStrategicContext/)
  })

  it('operating loop loads founder memory context', () => {
    const loopFile = read('lib/founder/operating-loop/founder-operating-loop.ts')
    assert.match(loopFile, /getFounderStrategicContext/)
    assert.match(loopFile, /strategicAlignment/)
    assert.match(loopFile, /Founder memory:/)
  })

  it('memory API routes are founder-gated in api handler', () => {
    const handler = read('lib/founder/persistence/founder-api-handler.ts')
    const api = read('lib/founder/memory/founder-memory-api.ts')
    assert.match(handler, /segments\[0\] === 'memory'/)
    assert.match(api, /requireFounderSession/)
    assert.match(handler, /requireFounderSession/)
  })

  it('memory changes write audit logs in store', () => {
    const store = read('lib/founder/memory/founder-memory-store.ts')
    assert.match(store, /appendAuditLog/)
    assert.match(store, /entityType: 'founder_memory'/)
  })

  it('founder memory page is founder-guarded', () => {
    const page = read('app/founder/memory/page.tsx')
    assert.match(page, /FounderGuard/)
    assert.match(page, /FounderMemoryPage/)
  })

  it('founder nav includes memory route', () => {
    const nav = read('components/founder/founder-nav-header.tsx')
    assert.match(nav, /\/founder\/memory/)
    assert.match(nav, /Memory/)
  })

  it('staff agents read strategic memory', () => {
    const staff = read('lib/founder/team/staff-agents.ts')
    assert.match(staff, /getStaffStrategicMemory/)
    assert.match(staff, /filterDeferredRecommendations/)
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_APPEARANCE_MIGRATION_KEY,
  ORB_APPEARANCE_STORAGE_KEY,
  migrateOrbAppearanceForLightDefault,
  readOrbAppearanceMode,
  resolveOrbTheme,
  writeOrbAppearanceMode
} from './orb-appearance.ts'
import { placeholderForMode } from './residential-agents.ts'

function mockBrowserStorage() {
  const bag: Record<string, string> = {}
  const mockStorage = {
    getItem: (key: string) => bag[key] ?? null,
    setItem: (key: string, value: string) => {
      bag[key] = value
    }
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true })
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
  return bag
}

describe('orb appearance', () => {
  it('defaults to light when storage is empty', () => {
    assert.equal(readOrbAppearanceMode(), 'light')
  })

  it('resolves system theme without window as light', () => {
    assert.equal(resolveOrbTheme('system'), 'light')
  })

  it('persists appearance mode in localStorage', () => {
    const bag = mockBrowserStorage()
    try {
      writeOrbAppearanceMode('dark')
      assert.equal(readOrbAppearanceMode(), 'dark')
      writeOrbAppearanceMode('light')
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'light')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('migrates legacy dark preference to light once', () => {
    const bag = mockBrowserStorage()
    try {
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'dark'
      assert.equal(readOrbAppearanceMode(), 'light')
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'light')
      assert.equal(bag[ORB_APPEARANCE_MIGRATION_KEY], 'done')
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'dark'
      assert.equal(readOrbAppearanceMode(), 'dark')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('migrates legacy system preference to light once', () => {
    const bag = mockBrowserStorage()
    try {
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'system'
      assert.equal(readOrbAppearanceMode(), 'light')
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'light')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('migrateOrbAppearanceForLightDefault is idempotent', () => {
    const bag = mockBrowserStorage()
    try {
      bag[ORB_APPEARANCE_STORAGE_KEY] = 'system'
      migrateOrbAppearanceForLightDefault()
      migrateOrbAppearanceForLightDefault()
      assert.equal(bag[ORB_APPEARANCE_STORAGE_KEY], 'light')
      assert.equal(bag[ORB_APPEARANCE_MIGRATION_KEY], 'done')
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })
})

describe('orb placeholders', () => {
  it('uses Ask anything for default agent', () => {
    assert.equal(placeholderForMode('Ask ORB'), 'Ask anything')
  })

  it('uses safeguarding placeholder copy', () => {
    assert.match(placeholderForMode('Safeguarding Thinking'), /think it through/i)
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_APPEARANCE_STORAGE_KEY,
  readOrbAppearanceMode,
  resolveOrbTheme,
  writeOrbAppearanceMode
} from './orb-appearance.ts'
import { placeholderForMode } from './residential-agents.ts'

describe('orb appearance', () => {
  it('defaults to light when storage is empty', () => {
    assert.equal(readOrbAppearanceMode(), 'light')
  })

  it('resolves system theme without window as light', () => {
    assert.equal(resolveOrbTheme('system'), 'light')
  })

  it('persists appearance mode in localStorage', () => {
    const bag: Record<string, string> = {}
    const mockStorage = {
      getItem: (key: string) => bag[key] ?? null,
      setItem: (key: string, value: string) => {
        bag[key] = value
      }
    }
    Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true })
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
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
})

describe('orb placeholders', () => {
  it('uses Ask anything for default agent', () => {
    assert.equal(placeholderForMode('Ask ORB'), 'Ask anything')
  })

  it('uses safeguarding placeholder copy', () => {
    assert.match(placeholderForMode('Safeguarding Thinking'), /think it through/i)
  })
})

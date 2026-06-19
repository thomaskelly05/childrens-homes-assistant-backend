import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_GUIDED_DEMO_SAVE_HINT_KEY,
  ORB_GUIDED_DEMO_SAVE_TITLE_PREFIX,
  ORB_GUIDED_DEMO_SCENARIO,
  ORB_GUIDED_DEMO_SAFETY_NOTE,
  ORB_GUIDED_DEMO_STEPS,
  ORB_GUIDED_DEMO_STORAGE_KEY,
  advanceOrbGuidedDemoStep,
  clearOrbGuidedDemoState,
  defaultOrbGuidedDemoState,
  isOrbGuidedDemoSaveHintActive,
  markOrbGuidedDemoSaveHint,
  orbGuidedDemoChatPrompt,
  orbGuidedDemoDictateNotes,
  resolveOrbGuidedDemoSaveTitle,
  orbGuidedDemoSaveStatusMessage,
  orbGuidedDemoSaveTitle,
  orbGuidedDemoStepByIndex,
  orbGuidedDemoWriteSeed,
  readOrbGuidedDemoState,
  startOrbGuidedDemo,
  writeOrbGuidedDemoState
} from './orb-guided-demo.ts'
import {
  ORB_HOME_VALUE_PROPOSITION,
  ORB_REQUEST_DEMO_LABEL,
  ORB_REQUEST_DEMO_URL
} from './orb-user-facing-names.ts'

function mockSessionStorage() {
  const bag: Record<string, string> = {}
  const mockStorage = {
    getItem: (key: string) => bag[key] ?? null,
    setItem: (key: string, value: string) => {
      bag[key] = value
    },
    removeItem: (key: string) => {
      delete bag[key]
    }
  }
  Object.defineProperty(globalThis, 'sessionStorage', { value: mockStorage, configurable: true })
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
  return bag
}

describe('orb guided demo module', () => {
  it('exports single request demo label and URL', () => {
    assert.equal(ORB_REQUEST_DEMO_LABEL, 'Request a demo')
    assert.equal(ORB_REQUEST_DEMO_URL, 'https://www.indicare.co.uk/contact')
    assert.match(ORB_HOME_VALUE_PROPOSITION, /children\u2019s homes/)
  })

  it('defines five ordered steps ending with request demo', () => {
    assert.equal(ORB_GUIDED_DEMO_STEPS.length, 5)
    assert.deepEqual(
      ORB_GUIDED_DEMO_STEPS.map((s) => s.id),
      ['chat', 'dictate', 'write', 'records', 'request_demo']
    )
    assert.equal(ORB_GUIDED_DEMO_STEPS[4].primaryActionLabel, ORB_REQUEST_DEMO_LABEL)
  })

  it('uses anonymised residential scenario without real identifiers', () => {
    assert.match(ORB_GUIDED_DEMO_SCENARIO.title, /school|withdrawn|tea/i)
    assert.ok(ORB_GUIDED_DEMO_SCENARIO.observedFacts.length >= 3)
    assert.match(ORB_GUIDED_DEMO_SCENARIO.managerOversightPrompt, /manager/i)
    assert.match(ORB_GUIDED_DEMO_SCENARIO.localPolicyReminder, /policy/i)
    const joined = JSON.stringify(ORB_GUIDED_DEMO_SCENARIO)
    assert.doesNotMatch(joined, /Ofsted guarantees|compliance guarantee|emergency safeguarding/i)
  })

  it('includes safety note about adult responsibility', () => {
    assert.match(ORB_GUIDED_DEMO_SAFETY_NOTE, /anonymised demo/i)
    assert.match(ORB_GUIDED_DEMO_SAFETY_NOTE, /adults remain responsible/i)
    assert.match(ORB_GUIDED_DEMO_SAFETY_NOTE, /local policy/i)
  })

  it('builds child-centred content helpers from scenario', () => {
    const chat = orbGuidedDemoChatPrompt()
    const dictate = orbGuidedDemoDictateNotes()
    const write = orbGuidedDemoWriteSeed()
    assert.match(chat, /adult review/i)
    assert.match(dictate, /School run/)
    assert.match(write, /anonymised demo/i)
    assert.match(write, /Manager oversight/)
  })

  it('persists demo state in sessionStorage without defaulting active', () => {
    const bag = mockSessionStorage()
    try {
      assert.deepEqual(readOrbGuidedDemoState(), defaultOrbGuidedDemoState())
      const started = startOrbGuidedDemo()
      assert.equal(started.active, true)
      assert.equal(started.stepIndex, 0)
      assert.ok(bag[ORB_GUIDED_DEMO_STORAGE_KEY])
      const advanced = advanceOrbGuidedDemoStep(started)
      assert.equal(advanced.stepIndex, 1)
      clearOrbGuidedDemoState()
      assert.equal(readOrbGuidedDemoState().active, false)
    } finally {
      Reflect.deleteProperty(globalThis, 'sessionStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('marks demo saves with anonymised prefix when hint active', () => {
    const bag = mockSessionStorage()
    try {
      assert.equal(isOrbGuidedDemoSaveHintActive(), false)
      markOrbGuidedDemoSaveHint()
      assert.equal(bag[ORB_GUIDED_DEMO_SAVE_HINT_KEY], '1')
      assert.equal(isOrbGuidedDemoSaveHintActive(), true)
      assert.equal(
        orbGuidedDemoSaveTitle('Daily record draft'),
        `${ORB_GUIDED_DEMO_SAVE_TITLE_PREFIX} Daily record draft`
      )
      clearOrbGuidedDemoState()
      assert.equal(isOrbGuidedDemoSaveHintActive(), false)
    } finally {
      Reflect.deleteProperty(globalThis, 'sessionStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('clamps step index when reading persisted state', () => {
    const bag = mockSessionStorage()
    try {
      writeOrbGuidedDemoState({ active: true, stepIndex: 99, startedAt: Date.now() })
      assert.equal(readOrbGuidedDemoState().stepIndex, ORB_GUIDED_DEMO_STEPS.length - 1)
      assert.equal(orbGuidedDemoStepByIndex(99).id, 'request_demo')
    } finally {
      Reflect.deleteProperty(globalThis, 'sessionStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })

  it('applies demo save title and status only when save hint is active', () => {
    const bag = mockSessionStorage()
    try {
      assert.equal(resolveOrbGuidedDemoSaveTitle('Daily record draft'), 'Daily record draft')
      assert.equal(orbGuidedDemoSaveStatusMessage('Draft saved to Records & Drafts.'), 'Draft saved to Records & Drafts.')
      markOrbGuidedDemoSaveHint()
      assert.equal(
        resolveOrbGuidedDemoSaveTitle('Daily record draft'),
        `${ORB_GUIDED_DEMO_SAVE_TITLE_PREFIX} Daily record draft`
      )
      assert.match(orbGuidedDemoSaveStatusMessage('Draft saved.'), /anonymised demo/i)
    } finally {
      Reflect.deleteProperty(globalThis, 'sessionStorage')
      Reflect.deleteProperty(globalThis, 'window')
    }
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB studio surface contract', () => {
  it('main sidebar stations still render in care companion', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const stations = [
      'orb_dictate',
      'orb_write',
      'orb_voice',
      'templates',
      'saved_outputs',
      'documents',
      'shift_builder',
      'review',
      'inspection_readiness',
      'safeguarding_thinking',
      'record_properly'
    ]
    for (const station of stations) {
      assert.match(companion, new RegExp(station))
    }
  })

  it('chat composer marker remains singular', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /data-orb-composer="main"/)
  })

  it('Dictate Open in ORB Write handoff still exists', () => {
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    assert.match(dictate, /Open in ORB Write|openInOrbWrite|orb-write/i)
    const convergence = read('components/orb-standalone/orb-dictate-write-convergence.test.ts')
    assert.ok(convergence.length > 100)
  })

  it('Templates Open in ORB Write and Start in Dictate still work', () => {
    const library = read('components/orb/recording/OrbRecordingLibraryCards.tsx')
    assert.match(library, /open_in_write|Open in ORB Write|start_in_dictate/i)
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    assert.match(templates, /onRecordingAction/)
  })

  it('Documents analyse and upload controls still render', () => {
    const docs = read('components/orb-standalone/orb-document-panel.tsx')
    assert.match(docs, /analyseOrbStandaloneDocument|uploadOrbStandaloneDocument/)
    assert.match(docs, /data-orb-document-panel|data-orb-knowledge-library/)
  })

  it('no child profile selector in standalone ORB surfaces', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const write = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.doesNotMatch(companion, /child.profile.selector|ChildProfileSelector|select child/i)
    assert.doesNotMatch(write, /child.profile.selector|ChildProfileSelector/i)
  })

  it('no internal brain metadata visible in UI components', () => {
    const ai = read('components/orb-write/orb-write-ai-panel.tsx')
    const brain = read('components/orb/dictate/OrbDictateBrainPanel.tsx')
    assert.doesNotMatch(ai, /brain_metadata/)
    assert.doesNotMatch(brain, /brain_metadata/)
    assert.doesNotMatch(ai, /IndiCare Brain/)
    assert.match(brain, /ORB analysis|ORB guidance/i)
  })

  it('standalone API route constants not removed', () => {
    const client = read('lib/orb/standalone-client.ts')
    const paths = [
      '/orb/standalone/conversation',
      '/orb/standalone/documents/upload',
      '/orb/standalone/documents/analyse',
      '/orb/standalone/shift-builder/generate',
      '/orb/standalone/outputs'
    ]
    for (const path of paths) {
      assert.match(client, new RegExp(path.replace(/\//g, '\\/')))
    }
  })

  it('billing account settings modals render markers', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const account = read('components/orb-standalone/orb-account-modal.tsx')
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    assert.match(billing, /data-orb-billing-modal|OrbBillingModal/)
    assert.match(account, /data-orb-account-modal/)
    assert.match(settings, /data-orb-settings-panel/)
  })
})

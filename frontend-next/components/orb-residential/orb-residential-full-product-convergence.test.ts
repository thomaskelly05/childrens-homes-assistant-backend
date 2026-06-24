import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { ORB_RESIDENTIAL_INTELLIGENCE_PRINCIPLES } from '../../lib/orb/orb-residential-intelligence-principles.ts'
import { ORB_RESIDENTIAL_STATION_DEFINITIONS } from '../../lib/orb/orb-residential-stations.ts'
import {
  ORB_NOT_FOR_EMERGENCIES_COPY,
  ORB_RESIDENTIAL_SAFETY_STRIP,
  ORB_VOICE_BOUNDARY_COPY
} from '../../lib/orb/orb-residential-safety-copy.ts'
import { ORB_PRIMARY_RECORD_TYPE_IDS } from '../../lib/orb/recording/orb-recording-section-prompts.ts'
import { ORB_DICTATE_SUBTITLE } from '../../lib/orb/orb-user-facing-names.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function readJsonFromWorkspace(relativePath: string) {
  return JSON.parse(readFileSync(join(root, '..', relativePath), 'utf8'))
}

describe('ORB Residential full-product convergence', () => {
  it('one canonical shell at /orb via OrbShell and OrbCareCompanion', () => {
    const page = read('app/orb/page.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(page, /OrbShell|orb-shell/)
    assert.match(shell, /OrbCareCompanion/)
    assert.match(companion, /data-orb-companion-root/)
  })

  it('station definitions are shared across sidebar, voice, dictate and composer tools', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const voiceLaunch = read('lib/orb/voice/orb-voice-launch-mode.ts')
    const dictateTypes = read('lib/orb/dictate/orb-dictate-types.ts')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(sidebar, /ORB_VISIBLE_SIDEBAR_NAV/)
    assert.match(voiceLaunch, /orbResidentialStation\('orb_voice'\)/)
    assert.match(dictateTypes, /orbResidentialStation\('orb_dictate'\)/)
    assert.match(tools, /ORB_RESIDENTIAL_STATION_DEFINITIONS/)
    assert.equal(ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_voice.tagline, 'Talk it through with ORB before you write.')
    assert.equal(ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_dictate.tagline, ORB_DICTATE_SUBTITLE)
    assert.equal(ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_write.tagline, 'Draft, review and finalise adult-led records in one calm workspace.')
  })

  it('one recording framework without duplicate template registry in UI', () => {
    const framework = read('lib/orb/recording/orb-recording-framework.ts')
    const studio = read('lib/orb/dictate/orb-dictate-studio-templates.ts')
    const templatesPanel = read('components/orb-standalone/orb-templates-panel.tsx')
    const writePicker = read('components/orb-write/orb-write-template-picker.tsx')
    assert.match(framework, /orb-recording-framework\.json/)
    assert.match(studio, /orbRecordingStudioTemplates/)
    assert.match(templatesPanel, /ORB_RECORDING_RECORD_TYPES|orb-recording-framework/)
    assert.match(writePicker, /resolveOrbRecordingRecordType/)
    assert.doesNotMatch(templatesPanel, /VOICE_ONLY_TEMPLATES|voiceOnlyTemplates/)
  })

  it('frontend and backend recording frameworks share record type ids', () => {
    const frontend = readJsonFromWorkspace('frontend-next/lib/orb/recording/orb-recording-framework.json')
    const backend = readJsonFromWorkspace('assistant/knowledge/orb_recording_framework.json')
    const frontendIds = frontend.record_types.map((r: { id: string }) => r.id).sort()
    const backendIds = backend.record_types.map((r: { id: string }) => r.id).sort()
    assert.deepEqual(frontendIds, backendIds)
    assert.equal(frontend.version, backend.version)
    for (const id of ORB_PRIMARY_RECORD_TYPE_IDS) {
      assert.ok(frontendIds.includes(id), `missing primary record type ${id}`)
    }
  })

  it('voice, dictate and write handoffs route through converged helper with record type preservation', () => {
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    const content = read('lib/orb/write/orb-write-content-handoff.ts')
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(handoff, /convergedHandoffToOrbWrite/)
    assert.match(content, /'voice'/)
    assert.match(voice, /data-orb-voice-open-write/)
    assert.match(voice, /ORB_VOICE_V2_SUMMARY_TITLE|title: 'Voice reflection'/)
    assert.match(companion, /source: 'voice'/)
    assert.match(dictate, /saveOrbWriteHandoff|convergedDictateSessionHandoff/)
    assert.match(companion, /convergedHandoffToOrbWrite/)
  })

  it('shared residential intelligence principles cover safeguarding and adult review', () => {
    const joined = ORB_RESIDENTIAL_INTELLIGENCE_PRINCIPLES.join(' ')
    assert.match(joined, /British English/i)
    assert.match(joined, /child central|child remains central/i)
    assert.match(joined, /safeguarding/i)
    assert.match(joined, /Adult review/i)
    const voicePrompt = read('lib/orb/voice/orb-voice-prompt.ts')
    const reviewPrompt = read('lib/orb/orb-review-prompt.ts')
    assert.match(voicePrompt, /professional judgement|British/)
    assert.match(reviewPrompt, /child|safeguarding/i)
  })

  it('safety copy is consolidated and reused across surfaces', () => {
    const safety = read('lib/orb/orb-residential-safety-copy.ts')
    const modal = read('components/orb-residential/orb-safety-modal.tsx')
    const acceptance = read('components/orb-residential/orb-safety-acceptance.tsx')
    const voiceLaunch = read('lib/orb/voice/orb-voice-launch-mode.ts')
    assert.match(safety, /ORB_NOT_FOR_EMERGENCIES_COPY/)
    assert.match(modal, /ORB_SAFETY_MODAL_POINTS/)
    assert.match(acceptance, /ORB_SAFETY_ACCEPTANCE_STATEMENTS/)
    assert.match(voiceLaunch, /ORB_VOICE_BOUNDARY_COPY/)
    assert.ok(ORB_VOICE_BOUNDARY_COPY.some((line) => line.includes('emergencies')))
    assert.match(ORB_RESIDENTIAL_SAFETY_STRIP, /responsible/)
    assert.match(ORB_NOT_FOR_EMERGENCIES_COPY, /emergencies/)
  })

  it('billing controls remain in modal, settings and upgrade screen', () => {
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const settings = read('components/orb-standalone/orb-billing-settings-section.tsx')
    const upgrade = read('components/orb-standalone/orb-upgrade-screen.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    for (const marker of [
      'data-orb-billing-modal',
      'data-orb-billing-sticky-footer',
      'spending',
      'checkout',
      'topup',
      'data-orb-upgrade'
    ]) {
      assert.ok(
        billing.includes(marker) || settings.includes(marker) || upgrade.includes(marker),
        `missing billing marker ${marker}`
      )
    }
    assert.match(companion, /OrbBillingModal/)
  })

  it('mobile safe-area footers and desktop shell remain separated', () => {
    const mobileCss = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    const desktopCss = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const shellCss = read('app/orb/_legacy-ui-archive/orb-shell.css')
    assert.match(mobileCss, /safe-area-inset-bottom/)
    assert.match(desktopCss, /orb-chat-layout--residential/)
    assert.match(shellCss, /orb-desktop\.css/)
    assert.match(shellCss, /orb-mobile\.css/)
    assert.doesNotMatch(desktopCss, /orb-dictate-mobile-orb-wrap/)
  })

  it('no duplicate ORB product shells or editors were introduced', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.doesNotMatch(companion, /OrbStandaloneExperience|OrbResidentialHome/)
    const writePanels = [
      'components/orb-write/orb-write-standalone-panel.tsx',
      'components/orb-write/orb-write-station.tsx'
    ]
    for (const panel of writePanels) {
      const source = read(panel)
      assert.doesNotMatch(source, /OrbWriteEditorV2|SecondWriteEditor/)
    }
  })
})

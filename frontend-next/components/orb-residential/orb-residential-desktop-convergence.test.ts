import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE,
  orbComposerSpeechFallbackMessage
} from '../../lib/orb/orb-composer-inline-voice-fallback.ts'
import { getOrbSearchSurface, ORB_SEARCH_SURFACES } from '../../lib/orb/orb-search-registry.ts'
import { safePublicCopy, unsafeClaims } from '../../lib/orb/orb-private-compute-framework.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential desktop convergence sprint', () => {
  it('desktop composer renders once without shield and routes plus through handleComposerToolSelect', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const plusMenu = read('components/orb-standalone/orb-composer-plus-menu.tsx')

    assert.match(composer, /data-testid="orb-standalone-composer"/)
    assert.doesNotMatch(composer, /OrbResidentialPrivacyGuidanceIcon/)
    assert.doesNotMatch(composer, /data-orb-privacy-guidance-trigger/)
    assert.match(composer, /OrbComposerPlusMenu/)
    assert.match(composer, /handleComposerToolSelect/)
    assert.match(composer, /onSelect=\{handleComposerToolSelect\}/)
    assert.match(composer, /orb-liquid-composer/)
    assert.match(plusMenu, /take_photo/)
    assert.match(plusMenu, /photo_library/)
    assert.match(plusMenu, /choose_files/)
    assert.match(plusMenu, /data-orb-composer-upload-actions/)
  })

  it('desktop plus menu uses liquid glass and upload boundary copy', () => {
    const plusMenu = read('components/orb-standalone/orb-composer-plus-menu.tsx')
    const liquid = read('app/orb/_legacy-ui-archive/orb-liquid-glass.css')

    assert.match(plusMenu, /orb-liquid-panel/)
    assert.match(plusMenu, /ORB_COMPOSER_UPLOAD_BOUNDARY_LINES/)
    assert.match(plusMenu, /data-orb-composer-tools-privacy-hint/)
    assert.doesNotMatch(plusMenu, /rgba\(12,16,28,0\.98\)/)
    assert.match(liquid, /\.orb-composer-plus-dropdown\.orb-liquid-panel/)
  })

  it('desktop shell and settings use canonical product modal tokens', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const shell = read('components/orb/orb-shell.tsx')
    const shellCss = read('app/orb/orb-residential-shell.css')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(shell, /OrbCareCompanion/)
    assert.match(settings, /data-orb-modal="product"/)
    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(shellCss, /\[data-orb-modal='product'\]/)
    assert.match(desktop, /\[data-orb-settings-scroll\]/)
    assert.match(desktop, /ORB Residential — desktop calm shell/)
  })

  it('desktop ORB presence uses shared liquid orb treatment', () => {
    const presence = read('components/orb-residential/ui/orb-presence.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')

    assert.match(presence, /orb-liquid-orb/)
    assert.match(desktop, /\[data-orb-residential-empty\][\s\S]*--orb-presence-size:\s*clamp\(9\.5rem/)
    assert.match(desktop, /desktop premium convergence pass/)
    assert.match(companion, /data-orb-workspace-starters/)
    assert.match(companion, /data-orb-workspace-starters/)
    assert.doesNotMatch(companion, /data-orb-starter-expanded-groups/)
    assert.doesNotMatch(companion, /orb-presence--hero[\s\S]*mobile-only/)
  })

  it('desktop home uses calm starter chips and composer without shield', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(companion, /data-orb-residential-empty/)
    assert.match(companion, /data-orb-empty-heading-desktop/)
    assert.match(companion, /Powered by IndiCare Intelligence/)
    assert.match(companion, /data-orb-workspace-starters/)
    assert.match(composer, /orb-liquid-composer/)
    assert.doesNotMatch(composer, /data-orb-privacy-guidance-trigger/)
    assert.match(composer, /data-testid="orb-standalone-composer"/)
  })

  it('desktop sidebar nav, search and liquid glass account card remain wired', () => {
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(sidebar, /data-orb-sidebar-search/)
    assert.match(sidebar, /data-orb-sidebar-new-chat/)
    assert.match(sidebar, /data-orb-sidebar-station/)
    assert.match(sidebar, /orb-sidebar-nav-item--active/)
    assert.doesNotMatch(sidebar, /orb-liquid-glass/)
    assert.match(sidebar, /data-orb-sidebar-account-card/)
    assert.match(sidebar, /data-orb-sidebar-billing/)
    assert.match(desktop, /\[data-orb-sidebar-account-card\]/)
  })

  it('settings scroll uses single owner on desktop and privacy rows open detail sheets', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const privacy = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    const sheet = read('components/orb-residential/orb-privacy-detail-sheet.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(settings, /overflow-y-auto/)
    assert.match(privacy, /OrbPrivacyDetailSheet/)
    assert.match(privacy, /data-orb-privacy-data-row/)
    assert.match(privacy, /safePublicCopy/)
    assert.match(sheet, /data-orb-privacy-detail-back/)
    assert.match(desktop, /\[data-orb-workspace-panel='settings'\] \.orb-workspace-body[\s\S]*overflow:\s*hidden/)
  })

  it('search registry wires desktop saved outputs, documents, templates and sidebar chats', () => {
    const toolbar = read('components/orb/premium/orb-premium-toolbar.tsx')
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const sidebar = read('components/orb-residential/orb-residential-sidebar.tsx')

    assert.match(toolbar, /getOrbSearchSurface/)
    assert.match(toolbar, /data-orb-search-clear/)
    assert.match(toolbar, /orb-liquid-toolbar/)
    assert.match(saved, /searchSurfaceId="saved_outputs"/)
    assert.match(documents, /searchSurfaceId="documents_guidance"/)
    assert.match(templates, /searchSurfaceId="record_types"/)
    assert.match(sidebar, /getOrbSearchSurface\('chats'\)/)

    for (const surface of ['saved_outputs', 'documents_guidance', 'record_types', 'chats'] as const) {
      const entry = getOrbSearchSurface(surface)
      assert.ok(entry, `missing search surface: ${surface}`)
      assert.ok(entry.placeholder.length > 0)
      assert.ok(entry.dataAttr.length > 0)
    }

    assert.ok(ORB_SEARCH_SURFACES.some((surface) => surface.id === 'settings_help_privacy'))
  })

  it('voice, dictate and write desktop surfaces keep actionable fallback and adult review copy', () => {
    const voice = read('components/orb-standalone/orb-voice-station.tsx')
    const voiceContent = read('components/orb-standalone/orb-voice-station-content.tsx')
    const dictate = read('components/orb-standalone/orb-dictate-station.tsx')
    const dictateTop = read('components/orb/dictate/OrbDictateTopBar.tsx')
    const write = read('components/orb-write/orb-write-station.tsx')
    const writePanel = read('components/orb-write/orb-write-standalone-panel.tsx')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(voice, /orb-liquid-card/)
    assert.match(voice, /orb-liquid-button/)
    assert.match(voice, /data-orb-voice-dictate-bridge/)
    assert.match(voiceContent, /data-orb-voice-station-content/)
    assert.match(desktop, /\[data-orb-voice-station-content\]/)
    assert.match(dictate, /desktop-runtime/)
    assert.match(dictate, /OrbDictateStudioWorkspace/)
    assert.match(dictateTop, /orb-liquid-toolbar/)
    assert.match(dictateTop, /data-orb-dictate-top-bar/)
    assert.match(write, /ORB_WRITE_SAFETY_COPY/)
    assert.match(writePanel, /Create draft record/)
    assert.match(read('components/orb-write/orb-write-toolbar.tsx'), /data-orb-write-approve/)
    assert.match(companion, /onOpenDictateFallback/)
    assert.equal(
      orbComposerSpeechFallbackMessage(null),
      ORB_COMPOSER_SPEECH_UNAVAILABLE_MESSAGE
    )
  })

  it('settings and billing desktop surfaces use scroll containers and truthful billing CTAs', () => {
    const settings = read('components/orb-standalone/orb-standalone-settings-panel.tsx')
    const billing = read('components/orb-standalone/orb-billing-modal.tsx')
    const appearance = read('components/orb-standalone/orb-appearance-control.tsx')
    const privacy = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(settings, /data-orb-settings-scroll/)
    assert.match(appearance, /data-orb-appearance-option/)
    assert.match(privacy, /data-orb-privacy-data-row/)
    assert.match(billing, /data-orb-billing-status/)
    assert.match(billing, /data-orb-billing-refresh/)
    assert.match(billing, /data-orb-billing-portal|data-orb-billing-upgrade|data-orb-billing-trial/)
    assert.match(billing, /data-orb-billing-desktop-layout="sheet"/)
    assert.match(billing, /orb-billing-card/)
    const billingCtaMatches = billing.match(/data-orb-billing-(trial|upgrade|portal)/g) ?? []
    assert.ok(billingCtaMatches.length >= 1)
    assert.match(billing, /data-orb-billing-sticky-footer/)
    assert.match(billing, /sm:hidden[\s\S]*data-orb-billing-sticky-footer|data-orb-billing-sticky-footer[\s\S]*sm:hidden/)
    assert.match(billing, /data-orb-billing-cta-bar/)
    assert.match(desktop, /\[data-orb-settings-nav\]/)
    assert.match(desktop, /\[data-orb-billing-modal\]/)
  })

  it('documents and templates desktop surfaces keep search and library actions', () => {
    const documents = read('components/orb-standalone/orb-document-panel.tsx')
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const desktop = read('app/orb/_legacy-ui-archive/orb-desktop.css')

    assert.match(documents, /searchSurfaceId="documents_guidance"/)
    assert.match(documents, /data-orb-document-dropzone/)
    assert.match(documents, /data-orb-document-lens/)
    assert.match(documents, /Analyse a Document/)
    assert.match(templates, /data-orb-recording-library-section/)
    assert.match(templates, /OrbRecordingLibraryCards|data-orb-recording-card/)
    assert.match(read('components/orb/recording/OrbRecordingLibraryCards.tsx'), /Start in Dictate/)
    assert.match(desktop, /\[data-orb-document-dropzone\]/)
    assert.match(desktop, /\[data-orb-template-card\]/)
  })

  it('build memory protections remain in place', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const buildExcludes = read('lib/orb/orb-build-excludes.test.ts')
    const renderSafe = read('scripts/render-safe-next-build.test.ts')

    assert.match(companion, /dynamic\(/)
    assert.match(companion, /import\('@\/components\/orb-standalone\/orb-dictate-station'\)/)
    assert.match(buildExcludes, /production build excludes/)
    assert.match(buildExcludes, /\*\*\/\*\.test\.ts/)
    assert.match(renderSafe, /render-safe-next-build/)
  })

  it('mobile regression: plus sheet, no shield, speech fallback and settings scroll intact', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const mobile = read('app/orb/_legacy-ui-archive/orb-mobile.css')
    const privacy = read('components/orb-residential/orb-privacy-detail-sheet.tsx')

    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(tools, /take_photo/)
    assert.match(tools, /orb-liquid-panel/)
    assert.doesNotMatch(composer, /data-orb-privacy-guidance-trigger/)
    assert.match(composer, /handleVoiceActivate/)
    assert.match(mobile, /\[data-orb-settings-scroll\]/)
    assert.match(privacy, /data-orb-privacy-detail-back/)
  })

  it('privacy copy avoids unsafe public claims', () => {
    const privacy = read('components/orb-residential/orb-privacy-data-settings-section.tsx')
    const framework = read('lib/orb/orb-private-compute-framework.ts')

    assert.match(privacy, /safePublicCopy/)
    for (const claim of unsafeClaims) {
      assert.doesNotMatch(privacy, new RegExp(claim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    }
    assert.match(framework, /local where possible/i)
    assert.match(framework, /cloud intelligence when needed/i)
    assert.match(framework, /unsafeClaims/)
    assert.ok(safePublicCopy.length > 0)
    assert.doesNotMatch(safePublicCopy, /everything stays on device/i)
  })

  it('desktop upload hidden inputs remain wired in composer', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')

    assert.match(composer, /data-orb-composer-file-input="take_photo"/)
    assert.match(composer, /data-orb-composer-file-input="photo_library"/)
    assert.match(composer, /data-orb-composer-file-input="choose_files"/)
    assert.match(composer, /data-orb-composer-file-input="document_only"/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Residential mobile continuity and composer upload pass', () => {
  it('plus button opens mobile composer tools sheet', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(composer, /data-orb-composer-tools-trigger/)
    assert.match(composer, /setToolsSheetOpen\(true\)/)
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(tools, /data-orb-composer-tools-sheet/)
  })

  it('tools sheet exposes Photo Library, Take Photo and Choose Files wired to inputs', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(tools, /photo_library/)
    assert.match(tools, /take_photo/)
    assert.match(tools, /choose_files/)
    assert.match(tools, /Photo Library/)
    assert.match(tools, /Take Photo/)
    assert.match(tools, /Choose Files/)
    assert.match(composer, /photoLibraryInputRef/)
    assert.match(composer, /cameraInputRef/)
    assert.match(composer, /documentFileInputRef/)
    assert.match(composer, /data-orb-composer-file-input="photo_library"/)
    assert.match(composer, /data-orb-composer-file-input="take_photo"/)
    assert.match(composer, /capture="environment"/)
    assert.match(composer, /data-orb-composer-file-input="choose_files"/)
  })

  it('unsupported file shows calm error via shared attachment helper', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const attachments = read('lib/orb/orb-composer-attachments.ts')
    assert.match(attachments, /That file type is not supported yet/)
    assert.match(companion, /ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE/)
    assert.match(composer, /onUnsupportedFile/)
  })

  it('selected files appear as composer attachment chips and can be removed', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(composer, /data-orb-composer-attachments/)
    assert.match(composer, /data-orb-composer-attachment/)
    assert.match(composer, /data-orb-composer-attachment-remove/)
    assert.match(composer, /onRemoveAttachment/)
  })

  it('attachment send routes documents through uploadOrbStandaloneDocument', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /uploadOrbStandaloneDocument/)
    assert.match(companion, /document_source_id: composerDocumentSourceId/)
    assert.match(companion, /readComposerFileAsBase64/)
    assert.match(companion, /images: imagePayload/)
  })

  it('privacy guidance remains accessible from composer', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(tools, /privacy_guidance/)
    assert.match(tools, /Privacy & responsibility/)
    assert.match(composer, /OrbResidentialPrivacyGuidanceIcon/)
    assert.match(composer, /OrbResidentialPrivacyGuidanceSheet/)
  })

  it('saved outputs mobile renders one empty state only', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(saved, /isMobile && items\.length === 0 \? 'hidden'/)
    assert.match(saved, /data-orb-saved-outputs-empty/)
    assert.match(saved, /items\.length === 0 && !isMobile \?/)
    assert.match(mobileCss, /\[data-orb-saved-outputs-empty='true'\] \[data-orb-saved-output-detail\][\s\S]*display: none/)
    const mobileCreateLabels = (saved.match(/\{isMobile \? 'Create in ORB Write'/g) ?? []).length
    assert.equal(mobileCreateLabels, 1)
  })

  it('recording library mobile list is not nested card-heavy', () => {
    const templates = read('components/orb-standalone/orb-templates-panel.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(templates, /divide-y divide-\[var\(--orb-line\)\]/)
    assert.doesNotMatch(templates, /data-orb-templates-mobile-record-list[\s\S]{0,400}rounded-xl border/)
    assert.match(mobileCss, /\[data-orb-templates-panel\] \[data-orb-recording-library-section\][\s\S]*border: 0/)
  })

  it('Dictate and ORB Write mobile controls still exist', () => {
    const dictate = read('components/orb-standalone/orb-dictate-mobile-experience.tsx')
    const write = read('components/orb-write/orb-write-editor.tsx')
    assert.match(dictate, /data-orb-dictate-primary-action/)
    assert.match(dictate, /onPasteTranscript/)
    assert.match(dictate, /onAudioUpload/)
    assert.match(write, /OrbWriteRecordTypeSelector/)
    assert.match(write, /data-orb-write-review-badge/)
    assert.match(write, /data-orb-write-notepad/)
  })

  it('mobile safe-area respected for lists and composer sheet', () => {
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(mobileCss, /safe-area-inset-bottom/)
    assert.match(mobileCss, /\[data-orb-composer-tools-sheet\]/)
    assert.match(mobileCss, /\[data-orb-templates-mobile-record-list\]/)
  })

  it('desktop saved outputs detail empty state preserved', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const desktop = read('app/orb/orb-desktop.css')
    assert.match(saved, /items\.length === 0 && !isMobile/)
    assert.match(desktop, /\[data-orb-saved-outputs-empty='true'\] \[data-orb-saved-output-detail\]/)
  })
})

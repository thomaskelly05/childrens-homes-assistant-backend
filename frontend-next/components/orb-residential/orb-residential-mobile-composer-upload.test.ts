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
  it('plus button opens mobile composer attachment sheet', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(composer, /data-orb-composer-tools-trigger/)
    assert.match(composer, /setToolsSheetOpen\(true\)/)
    assert.match(composer, /OrbResidentialComposerToolsSheet/)
    assert.match(composer, /data-orb-composer-attach-anchor/)
    assert.match(composer, /aria-label="Add to message"/)
    assert.match(tools, /data-orb-composer-tools-sheet/)
    assert.match(tools, /data-orb-composer-attach-sheet="true"/)
    assert.match(tools, /data-orb-composer-attach-heading/)
    assert.match(tools, /Add to message/)
  })

  it('upload actions are visible first as direct tiles before ORB tools', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const uploadIndex = tools.indexOf('data-orb-composer-upload-actions')
    const orbIndex = tools.indexOf('data-orb-composer-orb-tools-section')
    assert.ok(uploadIndex >= 0 && orbIndex > uploadIndex)
    assert.match(tools, /data-orb-composer-upload-action=\{item\.id\}/)
    assert.match(tools, /Photo Library/)
    assert.match(tools, /Take Photo/)
    assert.match(tools, /Choose Files/)
    assert.match(tools, /ORB tools/)
    assert.doesNotMatch(tools, /title: 'Upload'/)
    assert.doesNotMatch(tools, /items-end justify-center bg-black\/50/)
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

  it('sheet closes before upload action triggers file input', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    assert.match(tools, /onClose\(\)\s*\n\s*onSelect/)
    assert.match(composer, /setToolsSheetOpen\(false\)/)
    assert.match(composer, /photoLibraryInputRef\.current\?\.click\(\)/)
    assert.match(composer, /cameraInputRef\.current\?\.click\(\)/)
    assert.match(composer, /documentFileInputRef\.current\?\.click\(\)/)
  })

  it('ORB tools remain available below upload section', () => {
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(tools, /orb_dictate/)
    assert.match(tools, /orb_voice/)
    assert.match(tools, /orb_write/)
    assert.match(tools, /use_template/)
    assert.match(tools, /upload_document/)
    assert.match(tools, /privacy_guidance/)
    assert.match(tools, /Dictate/)
    assert.match(tools, /Voice/)
    assert.match(tools, /ORB Write/)
    assert.match(tools, /Record type/)
    assert.match(tools, /Upload document/)
    assert.match(tools, /Privacy & responsibility/)
  })

  it('unsupported file shows calm error via shared attachment helper', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const attachments = read('lib/orb/orb-composer-attachments.ts')
    assert.match(attachments, /That file type is not supported yet/)
    assert.match(companion, /ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE/)
    assert.match(composer, /onUnsupportedFile/)
  })

  it('selected files appear as composer attachment chips with horizontal scroll on mobile', () => {
    const composer = read('components/orb-standalone/orb-standalone-composer.tsx')
    const mobileCss = read('app/orb/orb-mobile.css')
    assert.match(composer, /data-orb-composer-attachments/)
    assert.match(composer, /data-orb-composer-attachment/)
    assert.match(composer, /data-orb-composer-attachment-remove/)
    assert.match(composer, /onRemoveAttachment/)
    assert.match(composer, /flex-nowrap overflow-x-auto/)
    assert.match(mobileCss, /\[data-orb-composer-attachments\][\s\S]*overflow-x: auto/)
  })

  it('attachment send routes documents through uploadOrbComposerDocument', () => {
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(companion, /uploadOrbComposerDocument/)
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

  it('mobile safe-area respected for composer attachment sheet', () => {
    const mobileCss = read('app/orb/orb-mobile.css')
    const tools = read('components/orb-residential/orb-residential-composer-tools-sheet.tsx')
    assert.match(mobileCss, /safe-area-inset-bottom/)
    assert.match(mobileCss, /\[data-orb-composer-attach-sheet='true'\]/)
    assert.match(mobileCss, /\[data-orb-composer-attach-anchor='true'\]/)
    assert.match(tools, /safe-area-inset-bottom/)
    assert.match(tools, /data-orb-composer-attach-backdrop/)
    assert.doesNotMatch(tools, /max-h-\[min\(78dvh/)
  })

  it('desktop saved outputs detail empty state preserved', () => {
    const saved = read('components/orb-standalone/orb-saved-outputs-panel.tsx')
    const desktop = read('app/orb/orb-desktop.css')
    assert.match(saved, /items\.length === 0 && !isMobile/)
    assert.match(desktop, /\[data-orb-saved-outputs-empty='true'\] \[data-orb-saved-output-detail\]/)
  })
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8')
}

describe('ORB Write working document studio', () => {
  it('editor exposes three-part studio layout markers', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    assert.match(editor, /data-orb-write-working-document-studio/)
    assert.match(editor, /data-orb-write-studio-top-bar/)
    assert.match(editor, /data-orb-write-left-panel/)
    assert.match(editor, /data-orb-write-main-area/)
    assert.match(editor, /data-orb-write-section-outline/)
    assert.match(editor, /data-orb-write-save-draft/)
    assert.match(editor, /data-orb-write-copy-document/)
  })

  it('sections are editable with assist menu actions', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    const assist = read('lib/orb/write/orb-write-section-assist.ts')
    assert.match(editor, /data-orb-write-section-body/)
    assert.match(editor, /data-orb-write-section-assist-menu/)
    assert.match(assist, /Make this more factual/)
    assert.match(assist, /Manager oversight/)
    assert.match(assist, /ORB_WRITE_SECTION_ASSIST_ACTIONS/)
  })

  it('tables support add row remove row and edit cell', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    assert.match(editor, /data-orb-write-table-add-row/)
    assert.match(editor, /data-orb-write-table-remove-row/)
    assert.match(editor, /data-orb-write-table-cell/)
    assert.match(editor, /data-orb-write-table-clear/)
    assert.match(editor, /data-orb-write-table-guidance/)
  })

  it('chart placeholder does not invent data', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    const exportLib = read('lib/orb/write/orb-write-working-document-export.ts')
    assert.match(editor, /data-orb-write-chart-has-data/)
    assert.match(editor, /Chart will appear when enough data is added/)
    assert.match(exportLib, /empty_state_guidance/)
    assert.match(exportLib, /formatChartPlaceholder/)
  })

  it('copy output excludes UI guidance and source chips by default', () => {
    const exportLib = read('lib/orb/write/orb-write-working-document-export.ts')
    assert.match(exportLib, /includeSources/)
    assert.match(exportLib, /includeDraftReviewNote/)
    assert.match(exportLib, /if \(section\.body\.trim\(\)\)/)
    assert.match(exportLib, /if \(includeSources\)/)
  })

  it('save draft uses saveOrUpdateWorkingDocumentToRecords', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    const client = read('lib/orb/template/orb-template-working-document-client.ts')
    assert.match(editor, /saveOrUpdateWorkingDocumentToRecords/)
    assert.match(client, /saveOrUpdateWorkingDocumentToRecords/)
    assert.match(editor, /Saved to My Drafts/)
    assert.match(client, /updateOrbRecordsWorkspaceItem/)
  })

  it('reopened document preserves sections tables chart config and source chips', () => {
    const reopen = read('lib/orb/write/orb-write-working-document-reopen.ts')
    assert.match(reopen, /workspaceItemToWorkingDocument/)
    assert.match(reopen, /asSections\(meta\.sections\)/)
    assert.match(reopen, /asTables\(meta\.tables\)/)
    assert.match(reopen, /asCharts\(meta\.charts\)/)
    assert.match(reopen, /source_chips/)
    assert.match(reopen, /workspace_item_id/)
    assert.match(reopen, /status: item\.status/)
    assert.match(reopen, /source_station: item\.source_station/)
  })

  it('chat use template opens Write handoff', () => {
    const handoff = read('lib/orb/write/orb-write-chat-handoff.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    assert.match(handoff, /openChatTemplateInWrite/)
    assert.match(handoff, /ORB_WRITE_TEMPLATE_OPENED_NOTICE/)
    assert.match(companion, /use_template_in_write/)
    assert.match(companion, /openChatTemplateInWrite/)
  })

  it('chat turn into record creates draft working document', () => {
    const handoff = read('lib/orb/write/orb-write-chat-handoff.ts')
    const companion = read('components/orb-standalone/orb-care-companion.tsx')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(handoff, /turnChatAnswerIntoWorkingDocument/)
    assert.match(handoff, /ORB_WRITE_CHAT_OPENED_NOTICE/)
    assert.match(companion, /turnChatAnswerIntoWorkingDocument/)
    assert.match(panel, /I've opened this as a draft record in ORB Write/)
  })

  it('dictate transcript maps to working document', () => {
    const dictate = read('lib/orb/dictate/orb-dictate-working-document-template.ts')
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(dictate, /structureDictateTranscriptToWorkingDocument/)
    assert.match(dictate, /convertDictationToWorkingDocument/)
    assert.match(panel, /loadOrbWriteWorkingDocumentHandoff/)
  })

  it('voice draft record path saves working document', () => {
    const voice = read('lib/orb/write/orb-write-voice-handoff.ts')
    assert.match(voice, /createVoiceDraftWorkingDocument/)
    assert.match(voice, /saveWorkingDocumentToRecords/)
    assert.match(voice, /ORB_VOICE_DRAFT_SAVED_NOTICE/)
    assert.match(voice, /status: 'draft'/)
  })

  it('high-risk template shows review reminder', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    assert.match(editor, /data-orb-write-high-risk-reminder/)
    assert.match(editor, /data-orb-write-review-reminder/)
    assert.match(editor, /safeguarding_level/)
  })

  it('finalise requires explicit confirmation and archived is read-only', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    assert.match(editor, /data-orb-write-finalise-confirm/)
    assert.match(editor, /Finalise this document/)
    assert.match(editor, /data-orb-write-read-only/)
    assert.match(editor, /archived.*finalised/s)
  })

  it('mobile layout uses outline sheet not cramped sidebar', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    assert.match(editor, /data-orb-write-mobile-outline-sheet/)
    assert.match(editor, /data-orb-write-mobile-outline-toggle/)
    assert.match(editor, /isMobile/)
    assert.match(editor, /data-orb-write-mobile/)
  })

  it('records reopen uses working document handoff when metadata present', () => {
    const reopen = read('lib/orb/write/orb-write-working-document-reopen.ts')
    const handoff = read('lib/orb/write/orb-write-converged-handoff.ts')
    assert.match(reopen, /handoffSavedOutputRecordToOrbWrite/)
    assert.match(handoff, /handoffSavedOutputRecordToOrbWrite/)
  })

  it('standalone panel opens working document from template library', () => {
    const panel = read('components/orb-write/orb-write-standalone-panel.tsx')
    assert.match(panel, /OrbWriteWorkingDocumentEditor/)
    assert.match(panel, /OrbWriteTemplateLibraryPanel/)
    assert.match(panel, /setWorkingDoc/)
  })

  it('no duplicate template registry in working document client', () => {
    const client = read('lib/orb/template/orb-template-working-document-client.ts')
    const service = readFileSync(join(root, '../services/orb_template_working_document_service.py'), 'utf8')
    assert.doesNotMatch(client, /ORB_TEMPLATE_REGISTRY/)
    assert.match(service, /orb_template_library_registry/)
  })

  it('no auto-finalise in save paths', () => {
    const editor = read('components/orb-write/orb-write-working-document-editor.tsx')
    const voice = read('lib/orb/write/orb-write-voice-handoff.ts')
    assert.match(editor, /status: 'draft'/)
    assert.doesNotMatch(editor, /auto_finalise/)
    assert.doesNotMatch(voice, /status: 'finalised'/)
  })

  it('audit document exists with recommended UX model', () => {
    const audit = readFileSync(join(root, '../docs/audits/orb-write-working-document-ux-audit.md'), 'utf8')
    assert.match(audit, /Recommended simple UX model/)
    assert.match(audit, /what blocks a frontline adult/i)
    assert.match(audit, /no second editor/)
  })
})

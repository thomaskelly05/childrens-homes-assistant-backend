import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE,
  classifyComposerFileKind,
  composerAttachmentFromFile,
  isSupportedComposerFile
} from './orb-composer-attachments.ts'

describe('orb composer attachments', () => {
  it('classifies images and supported documents', () => {
    assert.equal(classifyComposerFileKind(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })), 'image')
    assert.equal(classifyComposerFileKind(new File(['x'], 'policy.pdf', { type: 'application/pdf' })), 'document')
    assert.equal(classifyComposerFileKind(new File(['x'], 'notes.txt', { type: 'text/plain' })), 'document')
    assert.equal(classifyComposerFileKind(new File(['x'], 'report.docx', { type: '' })), 'document')
  })

  it('rejects unsupported file types with calm message constant', () => {
    const file = new File(['x'], 'archive.zip', { type: 'application/zip' })
    assert.equal(classifyComposerFileKind(file), 'unknown')
    assert.equal(isSupportedComposerFile(file), false)
    assert.equal(composerAttachmentFromFile(file), null)
    assert.match(ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE, /not supported yet/i)
  })

  it('creates image attachment with preview url', () => {
    const file = new File(['x'], 'snap.png', { type: 'image/png' })
    const attachment = composerAttachmentFromFile(file, 'test-id')
    assert.ok(attachment)
    assert.equal(attachment.id, 'test-id')
    assert.equal(attachment.kind, 'image')
    assert.ok(attachment.previewUrl?.startsWith('blob:'))
    URL.revokeObjectURL(attachment.previewUrl!)
  })
})

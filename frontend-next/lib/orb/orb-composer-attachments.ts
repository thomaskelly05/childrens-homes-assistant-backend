/** Shared composer attachment model — images and documents before send. */

export type OrbComposerAttachmentKind = 'image' | 'document' | 'audio' | 'unknown'

export type OrbComposerAttachmentStatus = 'selected' | 'uploading' | 'ready' | 'error'

export type OrbComposerAttachment = {
  id: string
  file: File
  name: string
  mimeType: string
  size: number
  kind: OrbComposerAttachmentKind
  previewUrl?: string
  status: OrbComposerAttachmentStatus
  error?: string
}

export const ORB_COMPOSER_UNSUPPORTED_FILE_MESSAGE = 'That file type is not supported yet.'

export const ORB_COMPOSER_UPLOAD_BOUNDARY_LINES = [
  'Only upload information you are authorised to use.',
  'Avoid unnecessary identifiable information.',
  'Review ORB’s output before copying or saving.',
  'ORB does not replace safeguarding procedures.'
] as const

export const ORB_COMPOSER_MAX_ATTACHMENTS = 4
export const ORB_COMPOSER_MAX_DOCUMENT_ATTACHMENTS = 1
/** Align with standalone document upload panel (.txt, .md, .pdf, .docx). */
export const ORB_COMPOSER_DOCUMENT_EXTENSIONS = ['.txt', '.md', '.pdf', '.doc', '.docx'] as const

export const ORB_COMPOSER_DOCUMENT_ACCEPT =
  '.txt,.md,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown'

export const ORB_COMPOSER_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/*'

export const ORB_COMPOSER_FILE_ACCEPT = `${ORB_COMPOSER_IMAGE_ACCEPT},${ORB_COMPOSER_DOCUMENT_ACCEPT}`

const DOCUMENT_MIME_PREFIXES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'text/plain',
  'text/markdown'
]

function extensionOf(name: string): string {
  const match = name.trim().toLowerCase().match(/\.[a-z0-9]+$/)
  return match?.[0] ?? ''
}

export function classifyComposerFileKind(file: File): OrbComposerAttachmentKind {
  const mime = (file.type || '').toLowerCase()
  const ext = extensionOf(file.name)
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    ORB_COMPOSER_DOCUMENT_EXTENSIONS.some((item) => item === ext) ||
    DOCUMENT_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))
  ) {
    return 'document'
  }
  return 'unknown'
}

export function isSupportedComposerFile(file: File): boolean {
  const kind = classifyComposerFileKind(file)
  return kind === 'image' || kind === 'document'
}

export function composerAttachmentFromFile(file: File, id?: string): OrbComposerAttachment | null {
  const kind = classifyComposerFileKind(file)
  if (kind !== 'image' && kind !== 'document') return null
  const attachmentId = id ?? `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const previewUrl = kind === 'image' ? URL.createObjectURL(file) : undefined
  return {
    id: attachmentId,
    file,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    kind,
    previewUrl,
    status: 'selected'
  }
}

export function revokeComposerAttachmentPreview(attachment: OrbComposerAttachment) {
  if (!attachment.previewUrl?.startsWith('blob:')) return
  URL.revokeObjectURL(attachment.previewUrl)
}

export async function readComposerFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function readComposerFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

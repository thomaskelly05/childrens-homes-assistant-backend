'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, CheckCircle2, Link2, Upload } from 'lucide-react'

import {
  HOME_DOCUMENT_KIND_OPTIONS,
  listOrbHomeDocuments,
  saveOrbHomeDocument,
  updateOrbHomeDocumentStatus,
  archiveOrbHomeDocument
} from '@/lib/orb/knowledge/orb-home-documents-store'
import type {
  OrbKnowledgeApprovalStatus,
  OrbKnowledgeLibraryItem,
  OrbKnowledgeSourceKind
} from '@/lib/orb/knowledge/orb-knowledge-library-types'
import { ORB_RECORDING_RECORD_TYPES } from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'

export function OrbKnowledgeHomeDocumentsSection({
  initialRecordTypeId,
  onUseInOrb
}: {
  initialRecordTypeId?: OrbRecordingRecordTypeId | string
  onUseInOrb?: (item: OrbKnowledgeLibraryItem) => void
}) {
  const [items, setItems] = useState<OrbKnowledgeLibraryItem[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [sourceKind, setSourceKind] = useState<OrbKnowledgeSourceKind>('home_document')
  const [recordTypeId, setRecordTypeId] = useState(initialRecordTypeId ?? '')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')

  const refresh = useCallback(() => {
    setItems(listOrbHomeDocuments().filter((i) => i.approval_status !== 'archived'))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (initialRecordTypeId) setRecordTypeId(initialRecordTypeId)
  }, [initialRecordTypeId])

  function handleSave(mode: 'link' | 'paste' | 'upload_placeholder') {
    if (!title.trim()) return
    const item = saveOrbHomeDocument({
      title: title.trim(),
      source_kind: mode === 'link' ? 'useful_link' : sourceKind,
      url: mode === 'link' ? url.trim() || null : null,
      content_text: mode === 'paste' ? pasteText.trim() || null : null,
      file_name: mode === 'upload_placeholder' ? title.trim() : null,
      summary: notes.trim() || null,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      related_record_type_ids: recordTypeId ? [recordTypeId] : [],
      approval_status: 'draft',
      publisher: null,
      provider_id: null,
      user_id: null,
      home_id: null,
      review_due_at: null,
      last_checked_at: null,
      created_by: 'standalone_orb'
    })
    setTitle('')
    setUrl('')
    setPasteText('')
    setNotes('')
    refresh()
    onUseInOrb?.(item)
  }

  function setStatus(id: string, status: OrbKnowledgeApprovalStatus) {
    updateOrbHomeDocumentStatus(id, status)
    refresh()
  }

  return (
    <section className="space-y-3" data-orb-knowledge-home-documents>
      <p className="text-xs text-[var(--orb-muted)]">
        Home and provider policies stored for this ORB session (local prototype). Upload to Knowledge
        Library API for team-wide approved sources. Draft items are not treated as authoritative until
        marked approved.
      </p>

      <div className="grid gap-2 rounded-xl border border-[var(--orb-line)] p-3" data-orb-home-document-add>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Missing From Home Policy)"
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
          data-orb-home-document-title
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={sourceKind}
            onChange={(e) => setSourceKind(e.target.value as OrbKnowledgeSourceKind)}
            className="rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
            data-orb-home-document-kind
          >
            {HOME_DOCUMENT_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={recordTypeId}
            onChange={(e) => setRecordTypeId(e.target.value)}
            className="rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
            data-orb-home-document-record-type
          >
            <option value="">Tag record type (optional)</option>
            {ORB_RECORDING_RECORD_TYPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Useful link URL (optional)"
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
          data-orb-home-document-link
        />
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste policy text (optional)"
          rows={4}
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
          data-orb-home-document-paste
        />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma-separated)"
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes / review context"
          rows={2}
          className="w-full rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSave('paste')}
            className="rounded-lg bg-[var(--orb-primary)] px-3 py-1.5 text-xs font-semibold text-white"
            data-orb-home-document-save
          >
            Save document
          </button>
          <button
            type="button"
            onClick={() => handleSave('link')}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-3 py-1.5 text-xs"
            data-orb-home-document-add-link
          >
            <Link2 className="h-3 w-3" aria-hidden />
            Add link
          </button>
          <button
            type="button"
            onClick={() => handleSave('upload_placeholder')}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-3 py-1.5 text-xs"
            data-orb-home-document-upload
          >
            <Upload className="h-3 w-3" aria-hidden />
            Register upload
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--orb-line)] p-3"
            data-orb-home-document-item={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <span
                className="rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] capitalize"
                data-orb-home-document-status={item.approval_status}
              >
                {item.approval_status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-[var(--orb-muted)] capitalize">
              {item.source_kind.replace(/_/g, ' ')}
              {item.related_record_type_ids.length
                ? ` · ${item.related_record_type_ids.join(', ')}`
                : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--orb-line)] px-2 py-1 text-[10px]"
                data-orb-home-document-use-orb
                onClick={() => onUseInOrb?.(item)}
              >
                Use with ORB
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2 py-1 text-[10px]"
                data-orb-home-document-approve
                onClick={() => setStatus(item.id, 'approved')}
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Mark approved
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2 py-1 text-[10px]"
                onClick={() => setStatus(item.id, 'needs_review')}
              >
                Needs review
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2 py-1 text-[10px]"
                onClick={() => {
                  archiveOrbHomeDocument(item.id)
                  refresh()
                }}
              >
                <Archive className="h-3 w-3" aria-hidden />
                Archive
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

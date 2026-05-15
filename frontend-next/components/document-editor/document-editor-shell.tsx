'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DocumentExportPanel } from '@/components/document-export/export-panel'
import { DocumentPromptRail } from '@/components/document-prompts/prompt-rail'
import { DocumentQualityPanel } from '@/components/document-quality/quality-panel'
import { DocumentReviewPanel } from '@/components/document-review/review-panel'
import { DocumentSignoffPanel } from '@/components/document-signoff/signoff-panel'
import { DocumentVersionTimeline } from '@/components/document-timeline/version-timeline'
import type { DocumentScope } from '@/lib/document-system/templates'
import { getDocumentTemplate } from '@/lib/document-system/templates'

type EditorProps = {
  templateId?: string
  documentId?: string
  scope: DocumentScope
  childId?: string
  staffId?: string
  title?: string
}

type SaveState = 'idle' | 'creating' | 'saving' | 'autosaving' | 'saved' | 'limited' | 'error'

export function DocumentEditorShell({ templateId, documentId, scope, childId, staffId, title }: EditorProps) {
  const template = useMemo(() => getDocumentTemplate(templateId), [templateId])
  const [activeDocumentId, setActiveDocumentId] = useState(documentId || '')
  const [documentTitle, setDocumentTitle] = useState(title || template.title)
  const [sections, setSections] = useState<Record<string, string>>(() => Object.fromEntries(template.sections.map((section) => [section, ''])))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [message, setMessage] = useState('Continue writing. Nothing is saved until the backend confirms it.')
  const [version, setVersion] = useState<number | string | undefined>(undefined)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sectionPayload = useCallback(() => {
    return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''), value]))
  }, [sections])

  useEffect(() => {
    if (!documentId) return
    fetch(`/api/document-system/documents/${encodeURIComponent(documentId)}`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        return response.json()
      })
      .then((payload) => {
        const doc = payload.document
        if (!doc) return
        setActiveDocumentId(doc.document_id)
        setDocumentTitle(doc.title || template.title)
        setVersion(doc.version_number)
        const loaded = Object.fromEntries((doc.editor_sections || []).map((section: any) => [section.title, section.content || '']))
        setSections((current) => Object.keys(loaded).length ? loaded : doc.sections || current)
        setSaveState('saved')
        setMessage('Document loaded from the live document system.')
      })
      .catch((error) => {
        setSaveState('limited')
        setMessage(`Could not load this document. The editor is in draft-only mode: ${String(error)}`)
      })
  }, [documentId, template.title])

  useEffect(() => {
    if (!activeDocumentId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      setSaveState('autosaving')
      fetch(`/api/document-system/documents/${encodeURIComponent(activeDocumentId)}/autosave`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: sectionPayload(), base_version: version, client_token: `${activeDocumentId}:${Date.now()}` })
      })
        .then(async (response) => {
          const payload = await response.json()
          if (!response.ok || payload.ok === false) throw new Error(payload.message || `${response.status} ${response.statusText}`)
          setSaveState('saved')
          setMessage(payload.message || 'Draft autosaved.')
        })
        .catch((error) => {
          setSaveState('limited')
          setMessage(`Autosave did not complete: ${String(error)}`)
        })
    }, 1400)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [activeDocumentId, version, sectionPayload])

  async function ensureDocument() {
    if (activeDocumentId) return activeDocumentId
    setSaveState('creating')
    const response = await fetch('/api/document-system/documents', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: template.templateId, title: documentTitle, child_id: childId, staff_id: staffId, sections: sectionPayload() })
    })
    const payload = await response.json()
    if (!response.ok || payload.ok === false) throw new Error(payload.detail || payload.message || 'Document was not created.')
    setActiveDocumentId(payload.document.document_id)
    setVersion(payload.document.version_number)
    return payload.document.document_id as string
  }

  async function saveDocument() {
    try {
      setSaveState('saving')
      const id = await ensureDocument()
      const response = await fetch(`/api/document-system/documents/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: documentTitle, sections: sectionPayload(), version_reason: 'manual_save' })
      })
      const payload = await response.json()
      if (!response.ok || payload.ok === false) throw new Error(payload.detail || payload.message || 'Save did not complete.')
      setVersion(payload.document.version_number)
      setSaveState('saved')
      setMessage('Saved to the live document system.')
    } catch (error) {
      setSaveState('error')
      setMessage(`Save failed. The document has not been saved: ${String(error)}`)
    }
  }

  async function submitForReview() {
    try {
      const id = await ensureDocument()
      const response = await fetch(`/api/document-system/documents/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', comment: 'Submitted from document editor.' })
      })
      const payload = await response.json()
      if (!response.ok || payload.ok === false) throw new Error(payload.detail || payload.message || 'Review action failed.')
      setSaveState('saved')
      setMessage('Submitted for manager review.')
    } catch (error) {
      setSaveState('limited')
      setMessage(`This review action is not live yet or could not complete. The document has not been submitted: ${String(error)}`)
    }
  }

  async function requestExport() {
    try {
      const id = await ensureDocument()
      const response = await fetch(`/api/document-system/documents/${encodeURIComponent(id)}/export`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: 'print_html' })
      })
      const payload = await response.json()
      if (!response.ok || payload.ok === false) throw new Error(payload.message || 'Export did not complete.')
      setSaveState('saved')
      setMessage(`Export ready: ${payload.filename}`)
    } catch (error) {
      setSaveState('limited')
      setMessage(`Export did not complete. No export was created: ${String(error)}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-4 z-20 rounded-[30px] border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-200/70 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">{scope} document</p>
            <input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} className="mt-1 w-full bg-transparent text-3xl font-black tracking-[-0.06em] text-slate-950 outline-none" aria-label="Document title" />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-600">{saveState}</span>
            <button onClick={saveDocument} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Save</button>
            <button onClick={submitForReview} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white">Submit for review</button>
            <button onClick={requestExport} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">Print export</button>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          {template.sections.map((section) => (
            <section key={section} className="rounded-[34px] border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Editable section</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">{section}</h2>
              <textarea
                value={sections[section] || ''}
                onChange={(event) => setSections((current) => ({ ...current, [section]: event.target.value }))}
                placeholder="Write reflectively, cite what is known, and keep the child at the centre."
                className="mt-4 min-h-[220px] w-full resize-y rounded-[24px] border border-slate-100 bg-slate-50/70 p-5 text-base leading-8 text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
              />
            </section>
          ))}
        </main>
        <div className="space-y-5">
          <DocumentPromptRail template={template} />
          <DocumentQualityPanel />
          <DocumentReviewPanel template={template} />
          <DocumentSignoffPanel />
          <DocumentVersionTimeline />
          <DocumentExportPanel />
        </div>
      </div>
    </div>
  )
}

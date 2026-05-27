'use client'

import { DragEvent, useState } from 'react'
import { authFetchResponse } from '@/lib/auth/api'
import { setSafeDraft } from '@/lib/security/safe-storage'

type UploadState = 'idle' | 'uploading' | 'uploaded' | 'error'

export function DocumentUploadPanel() {
  const [state, setState] = useState<UploadState>('idle')
  const [message, setMessage] = useState('Drop PDF, Word, image or text documents here.')
  const [documentType, setDocumentType] = useState('reg44_report')
  const [text, setText] = useState('')

  async function upload(file: File) {
    setState('uploading')
    setMessage(`Uploading ${file.name}...`)
    const form = new FormData()
    form.set('file', file)
    form.set('document_type', documentType)
    if (text.trim()) form.set('extracted_text', text.trim())
    try {
      const response = await authFetchResponse('/os/documents/upload', {
        method: 'POST',
        body: form
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const payload = await response.json()
      setState('uploaded')
      setMessage(`Uploaded. Extraction status: ${payload.data?.extraction_status || payload.data?.status || 'queued'}. Refresh to see the version history and findings.`)
    } catch (error) {
      setSafeDraft('indicare-document-upload-draft', {
        fileName: file.name,
        documentType,
        text
      }, undefined, 'export_restricted')
      setState('error')
      setMessage(`Draft saved locally. It has not yet been added to the child's record. Live document upload failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files.item(0)
    if (file) void upload(file)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/70 p-6"
      >
        <h3 className="text-lg font-black text-blue-950">Upload document</h3>
        <p className="mt-2 text-sm leading-7 text-blue-800">{message}</p>
        <div className="mt-4 space-y-3">
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-900">
            <option value="reg44_report">Reg 44 report</option>
            <option value="care_plan">Care plan</option>
            <option value="risk_assessment">Risk assessment</option>
            <option value="placement_plan">Placement plan</option>
            <option value="lac_review">LAC review</option>
            <option value="health_plan">Health document</option>
            <option value="education_plan">Education report</option>
            <option value="staff_supervision">Supervision note</option>
            <option value="meeting_minutes">Meeting minutes</option>
          </select>
          <label className="inline-flex cursor-pointer rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white">
            Choose file
            <input type="file" className="sr-only" onChange={(event) => {
              const file = event.target.files?.item(0)
              if (file) void upload(file)
            }} />
          </label>
          {state === 'uploading' ? <div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" /></div> : null}
        </div>
      </div>
      <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-6">
        <h3 className="text-lg font-black text-slate-950">Extraction text override</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">Optional pasted text lets the placeholder extraction pipeline detect findings, actions, evidence, chronology links and safeguarding flags immediately.</p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="mt-4 min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm"
          placeholder="Paste report text or OCR output..."
        />
      </div>
    </div>
  )
}

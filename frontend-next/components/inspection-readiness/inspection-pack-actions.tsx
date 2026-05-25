'use client'

import { useState } from 'react'

import {
  exportPackMarkdown,
  saveInspectionPack,
  type InspectionEvidencePack,
  type InspectionPackType
} from '@/lib/os-api/inspection-readiness'

type Props = {
  pack: InspectionEvidencePack | null
  packType: InspectionPackType
  onSaved?: () => void
}

export function InspectionPackActions({ pack, packType, onSaved }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSave(saveOutput: boolean, createActions: boolean) {
    if (!pack) return
    setBusy(true)
    setStatus(null)
    const result = await saveInspectionPack({
      pack_type: packType,
      pack,
      save_output: saveOutput,
      create_actions_from_gaps: createActions
    })
    setBusy(false)
    if (!result.ok) {
      setStatus(result.error || 'Save unavailable')
      return
    }
    const warnings = (result.data as { warnings?: string[] })?.warnings || []
    setStatus(warnings.length ? warnings.join(' ') : 'Pack saved for manager review.')
    onSaved?.()
  }

  function handleCopy() {
    if (!pack) return
    void navigator.clipboard.writeText(exportPackMarkdown(pack))
    setStatus('Markdown copied — review before sharing externally.')
  }

  return (
    <div data-testid="inspection-pack-actions" className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={!pack || busy}
        data-testid="inspection-save-pack"
        onClick={() => void handleSave(false, false)}
        className="rounded-2xl border border-blue-200 bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
      >
        Save pack
      </button>
      <button
        type="button"
        disabled={!pack || busy}
        data-testid="inspection-copy-markdown"
        onClick={handleCopy}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-800 disabled:opacity-50"
      >
        Copy markdown
      </button>
      <button
        type="button"
        disabled={!pack || busy}
        onClick={() => void handleSave(true, true)}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-800 disabled:opacity-50"
      >
        Save & create actions from gaps
      </button>
      {status ? <p className="w-full text-xs font-semibold text-slate-600">{status}</p> : null}
    </div>
  )
}

'use client'

import { useState } from 'react'

import {
  saveOperationalBriefing,
  type OrbOperationalBriefing,
  type OrbOperationalRequest
} from '@/lib/orb/operational-client'

export function OrbOperationalBriefingCard({
  briefing,
  request,
  answer,
  onSaved
}: {
  briefing: OrbOperationalBriefing
  request?: OrbOperationalRequest
  answer?: string
  onSaved?: (outputId: string) => void
}) {
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function copyBriefing() {
    const lines = [
      briefing.title,
      '',
      briefing.summary,
      '',
      'Key points:',
      ...(briefing.key_points || []).map((p) => `- ${p}`),
      '',
      'Risks:',
      ...(briefing.risks || []).map((r) => `- ${r}`),
      '',
      'Actions:',
      ...(briefing.actions || []).map((a) => `- ${a}`),
      '',
      'Sources:',
      ...(briefing.sources || []).map((s) => `- ${s}`)
    ]
    void navigator.clipboard.writeText(lines.join('\n'))
    setNotice('Briefing copied to clipboard.')
  }

  async function handleSave() {
    if (!request) {
      copyBriefing()
      return
    }
    setSaving(true)
    const result = await saveOperationalBriefing({
      ...request,
      answer,
      save: true,
      output_type: 'manager_briefing',
      title: briefing.title
    })
    const savedId = result.data?.briefing?.saved_as_output_id || result.data?.operational_output?.output_id || null
    if (savedId) {
      setNotice(`Briefing saved (ref ${savedId.slice(0, 8)}).`)
      onSaved?.(savedId)
    } else {
      setNotice(result.warning || 'Briefing export ready — copy if save is unavailable.')
    }
    setSaving(false)
  }

  return (
    <section
      className="rounded-[32px] bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg"
      data-testid="orb-operational-briefing-card"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Manager briefing</p>
      <h2 className="mt-2 text-xl font-black">{briefing.title}</h2>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">{briefing.summary}</p>

      {briefing.key_points?.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Key points</p>
          <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-200">
            {briefing.key_points.map((point) => (
              <li key={point}>- {point}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {briefing.risks?.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-300">Risks</p>
          <ul className="mt-2 space-y-1 text-xs font-semibold text-rose-100">
            {briefing.risks.map((risk) => (
              <li key={risk}>- {risk}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {briefing.actions?.length ? (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Suggested actions</p>
          <ul className="mt-2 space-y-1 text-xs font-semibold text-emerald-100">
            {briefing.actions.map((action) => (
              <li key={action}>- {action}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyBriefing}
          className="rounded-full bg-white/15 px-4 py-2 text-xs font-black"
          data-testid="orb-copy-briefing"
        >
          Copy briefing
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full bg-blue-500 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
          data-testid="orb-save-briefing"
        >
          Save briefing
        </button>
      </div>
      {notice ? <p className="mt-3 text-xs font-semibold text-slate-300">{notice}</p> : null}
    </section>
  )
}

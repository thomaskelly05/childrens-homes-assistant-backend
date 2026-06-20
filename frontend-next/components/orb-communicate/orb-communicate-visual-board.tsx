'use client'

import { useState } from 'react'

import {
  OrbCommunicateField,
  OrbCommunicatePreviewPanel,
  OrbCommunicateSymbolPlaceholder,
  orbCommunicateInputClass,
  orbCommunicateSelectClass
} from '@/components/orb-communicate/orb-communicate-shared'
import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { generateVisualBoard } from '@/lib/orb/communicate/orb-communicate-client'
import type { VisualBoardOutput, VisualBoardRequest } from '@/lib/orb/communicate/orb-communicate-types'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'

const DEFAULT_REQUEST: VisualBoardRequest = {
  boardPurpose: '',
  numberOfCards: 6,
  includeFeelings: true,
  includeYesNoHelpStop: true,
  includePeoplePlacesTime: true,
  safeguardingSensitive: false
}

export function OrbCommunicateVisualBoardWorkflow({ onBack }: { onBack: () => void }) {
  const [request, setRequest] = useState<VisualBoardRequest>(DEFAULT_REQUEST)
  const [output, setOutput] = useState<VisualBoardOutput | null>(null)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof VisualBoardRequest>(key: K, value: VisualBoardRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }))
  }

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (!request.boardPurpose.trim()) return
    setLoading(true)
    try {
      const result = await generateVisualBoard(request)
      setOutput(result)
    } finally {
      setLoading(false)
    }
  }

  if (output) {
    const copyText = [
      output.title,
      '',
      output.purpose,
      '',
      ...output.cards.map(
        (card) =>
          `${card.label} — ${card.plainLanguage} (${card.category})${card.staffNote ? ` [${card.staffNote}]` : ''}`
      ),
      '',
      output.staffNotes
    ].join('\n')

    const gridClass =
      output.cards.length <= 4
        ? 'grid-cols-2'
        : output.cards.length <= 6
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

    return (
      <div className="space-y-4" data-orb-communicate-workflow="visual_board">
        <OrbCommunicatePreviewPanel
          title={output.title}
          onBack={() => setOutput(null)}
          onCopy={() => void copyTextToClipboard(copyText)}
        >
          <p className="text-sm text-slate-400 [text-wrap:pretty]">{output.purpose}</p>
          <div className={`mt-4 grid gap-3 ${gridClass}`} data-orb-communicate-symbol-grid>
            {output.cards.map((card) => (
              <div key={card.id} className="space-y-2">
                <OrbCommunicateSymbolPlaceholder label={card.label} category={card.category} />
                <p className="text-xs font-medium text-slate-200">{card.plainLanguage}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{card.category}</p>
                {card.staffNote ? (
                  <p className="text-xs text-amber-200/80 [text-wrap:pretty]">{card.staffNote}</p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400 [text-wrap:pretty]">{output.staffNotes}</p>
        </OrbCommunicatePreviewPanel>
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleGenerate} data-orb-communicate-workflow="visual_board">
      <button type="button" onClick={onBack} className="text-sm text-sky-400/90 hover:text-sky-300">
        ← Back to Communicate
      </button>
      <OrbGlassCard className="space-y-4 border-white/10 bg-white/[0.04]">
        <OrbCommunicateField
          id="board-purpose"
          label="Board purpose"
          hint="What will this board help the person communicate or understand?"
        >
          <textarea
            id="board-purpose"
            className={`${orbCommunicateInputClass} min-h-[88px]`}
            required
            value={request.boardPurpose}
            onChange={(e) => update('boardPurpose', e.target.value)}
            placeholder="e.g. Choosing how I feel during the evening routine"
          />
        </OrbCommunicateField>
        <OrbCommunicateField id="board-count" label="Number of cards">
          <select
            id="board-count"
            className={orbCommunicateSelectClass}
            value={request.numberOfCards}
            onChange={(e) =>
              update('numberOfCards', Number(e.target.value) as VisualBoardRequest['numberOfCards'])
            }
          >
            <option value={4}>4</option>
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
          </select>
        </OrbCommunicateField>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-200">Board content</legend>
          {(
            [
              ['includeFeelings', 'Include feelings'],
              ['includeYesNoHelpStop', 'Include yes / no / help / stop'],
              ['includePeoplePlacesTime', 'Include people / places / time'],
              ['safeguardingSensitive', 'Safeguarding-sensitive']
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={request[key]}
                onChange={(e) => update(key, e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-400/30"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          disabled={loading || !request.boardPurpose.trim()}
          className="w-full rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? 'Building board…' : 'Generate visual board'}
        </button>
      </OrbGlassCard>
    </form>
  )
}

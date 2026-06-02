'use client'

import { useMemo, useState } from 'react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_REVIEW_THERAPEUTIC_CHIPS,
  ORB_REVIEW_THERAPEUTIC_PROMPTS,
  buildOrbReviewPrompt,
  type OrbReviewTherapeuticChipId
} from '@/lib/orb/orb-review-prompt'
import { loadOrbStandalonePersonalisation } from '@/lib/orb/orb-standalone-personalisation'

const REVIEW_OUTPUT_SECTIONS = [
  'Professional summary',
  'Therapeutic interpretation',
  'Safeguarding considerations',
  'Staff reflection',
  'Follow-up actions'
] as const

export function OrbReviewPanel({
  open,
  onClose,
  onRunReview,
  initialText = ''
}: {
  open: boolean
  onClose: () => void
  onRunReview: (payload: { prompt: string; text: string; therapeuticContext: string }) => void
  initialText?: string
}) {
  const [text, setText] = useState(initialText)
  const [therapeuticContext, setTherapeuticContext] = useState('')
  const [selectedChips, setSelectedChips] = useState<OrbReviewTherapeuticChipId[]>([])

  const professionalTone = useMemo(
    () => (typeof window !== 'undefined' ? loadOrbStandalonePersonalisation().professionalTone : 'balanced'),
    [open]
  )

  function toggleChip(id: OrbReviewTherapeuticChipId) {
    setSelectedChips((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function appendPrompt(prompt: string) {
    setTherapeuticContext((current) => {
      const trimmed = current.trim()
      if (!trimmed) return prompt
      if (trimmed.includes(prompt)) return trimmed
      return `${trimmed}\n\n${prompt}`
    })
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      onClose={onClose}
      title="Review"
      subtitle="Quality-review written practice — with therapeutic and safeguarding lenses."
      panelId="review"
    >
      <div className="space-y-5 p-4 sm:p-5" data-orb-review-panel>
        <p className="text-xs leading-5 text-[var(--orb-muted)]">
          ORB supports professional judgement. Adults must review and approve all wording before use in records.
        </p>

        <section className="orb-premium-settings-card rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-4">
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">ORB outputs</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--orb-muted)]">
            {REVIEW_OUTPUT_SECTIONS.map((item) => (
              <li key={item} className="flex gap-2" data-orb-review-output-section={item}>
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <label className="block">
          <span className="text-xs font-medium text-[var(--orb-muted)]">Paste text to review</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste an incident, daily record, handover or supervision note…"
            className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
            data-orb-review-input
          />
        </label>

        <section
          className="orb-premium-settings-card space-y-3 rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-4"
          data-orb-review-therapeutic-input
        >
          <div>
            <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Therapeutic language</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--orb-muted)]">
              Add context about the young person&apos;s needs, feelings, triggers, strengths or support approach.
            </p>
          </div>
          <textarea
            value={therapeuticContext}
            onChange={(e) => setTherapeuticContext(e.target.value)}
            rows={4}
            placeholder="Optional therapeutic context for ORB…"
            className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
            data-orb-review-therapeutic-textarea
          />
          <div className="flex flex-wrap gap-1.5" data-orb-review-therapeutic-prompts>
            {ORB_REVIEW_THERAPEUTIC_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => appendPrompt(prompt)}
                className="rounded-full border border-[var(--orb-line)] px-2.5 py-1 text-[10px] leading-snug text-[var(--orb-muted)] transition hover:border-[var(--orb-primary)]/40 hover:text-[var(--orb-foreground)]"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" data-orb-review-therapeutic-chips>
            {ORB_REVIEW_THERAPEUTIC_CHIPS.map((chip) => {
              const active = selectedChips.includes(chip.id)
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleChip(chip.id)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                    active
                      ? 'border-[var(--orb-primary)] bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                      : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/35'
                  }`}
                  data-orb-review-chip={chip.id}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        </section>

        <button
          type="button"
          disabled={!text.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,139,255,0.25)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          data-orb-review-run
          onClick={() => {
            const prompt = buildOrbReviewPrompt({
              text: text.trim(),
              therapeuticContext,
              chips: selectedChips,
              professionalTone
            })
            onRunReview({ prompt, text: text.trim(), therapeuticContext: therapeuticContext.trim() })
            onClose()
          }}
        >
          Run quality review
        </button>
      </div>
    </OrbStandalonePanelShell>
  )
}

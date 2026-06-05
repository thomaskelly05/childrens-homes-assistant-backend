'use client'

import { useMemo, useState } from 'react'

import {
  OrbPremiumButton,
  OrbPremiumCard,
  OrbPremiumPage,
  OrbPremiumPill,
  OrbPremiumSection,
  OrbPremiumTextarea,
  OrbPremiumTrustStrip
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
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
  initialText = '',
  residentialSurface
}: {
  open: boolean
  onClose: () => void
  onRunReview: (payload: { prompt: string; text: string; therapeuticContext: string }) => void
  initialText?: string
  residentialSurface?: boolean
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
      subtitle="Review written practice with therapeutic, safeguarding and recording quality lenses."
      panelId="review"
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <OrbPremiumPage
        panelId="review"
        trustStrip={
          <OrbPremiumTrustStrip>
            ORB supports professional judgement. Adults must review and approve all wording before use in records.
          </OrbPremiumTrustStrip>
        }
        primaryAction={
          <OrbPremiumButton
            disabled={!text.trim()}
            fullWidth
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
            {ORB_PREMIUM_ACTION_LABELS.generateDraft}
          </OrbPremiumButton>
        }
      >
        <OrbPremiumCard padded className="!p-4">
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">ORB outputs</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--orb-muted)]">
            {REVIEW_OUTPUT_SECTIONS.map((item) => (
              <li key={item} className="flex gap-2" data-orb-review-output-section={item}>
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </OrbPremiumCard>

        <label className="block">
          <span className="text-xs font-medium text-[var(--orb-muted)]">Review written practice</span>
          <OrbPremiumTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste an incident, daily record, handover or supervision note…"
            className="mt-2"
            data-orb-review-input
          />
        </label>

        <OrbPremiumSection
          title="Therapeutic language"
          description="Add context about the young person's needs, feelings, triggers, strengths or support approach."
          collapsible
          defaultOpen={false}
        >
          <div data-orb-review-therapeutic-input>
            <OrbPremiumTextarea
              value={therapeuticContext}
              onChange={(e) => setTherapeuticContext(e.target.value)}
              rows={4}
              placeholder="Optional therapeutic context for ORB…"
              data-orb-review-therapeutic-textarea
            />
            <div className="mt-3 flex flex-wrap gap-1.5" data-orb-review-therapeutic-prompts>
              {ORB_REVIEW_THERAPEUTIC_PROMPTS.map((prompt) => (
                <OrbPremiumPill key={prompt} onClick={() => appendPrompt(prompt)}>
                  {prompt}
                </OrbPremiumPill>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" data-orb-review-therapeutic-chips>
              {ORB_REVIEW_THERAPEUTIC_CHIPS.map((chip) => (
                <OrbPremiumPill
                  key={chip.id}
                  active={selectedChips.includes(chip.id)}
                  aria-pressed={selectedChips.includes(chip.id)}
                  onClick={() => toggleChip(chip.id)}
                  data-orb-review-chip={chip.id}
                >
                  {chip.label}
                </OrbPremiumPill>
              ))}
            </div>
          </div>
        </OrbPremiumSection>
      </OrbPremiumPage>
    </OrbStandalonePanelShell>
  )
}

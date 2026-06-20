'use client'

import { OrbCommunicateSymbolPlaceholder } from '@/components/orb-communicate/orb-communicate-shared'
import { ORB_COMMUNICATE_FULL_SAFETY } from '@/lib/orb/communicate/orb-communicate-plan'
import type {
  CommunicationSupportPackAction,
  CommunicationSupportPackOutput,
  CommunicationSupportPackSection
} from '@/lib/orb/communicate/orb-communicate-types'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'

const ACTION_LABELS: Record<CommunicationSupportPackAction, string> = {
  copy_section: 'Copy section',
  edit_section: 'Edit',
  regenerate_section: 'Regenerate',
  create_image: 'Create image',
  replace_image: 'Replace image',
  save_to_library: 'Save to library',
  personalise_for_person: 'Personalise for this person'
}

const PLACEHOLDER_ACTIONS = new Set<CommunicationSupportPackAction>([
  'edit_section',
  'regenerate_section',
  'create_image',
  'replace_image',
  'save_to_library',
  'personalise_for_person'
])

function sectionPlainText(section: CommunicationSupportPackSection): string {
  const lines = [section.heading, '', section.content]
  if (section.visualCards?.length) {
    lines.push('', 'Visual cards:', ...section.visualCards.map((card) => card.label))
  }
  return lines.join('\n')
}

function packPlainText(pack: CommunicationSupportPackOutput): string {
  return [
    pack.packTitle,
    '',
    ...pack.sections.flatMap((section) => [sectionPlainText(section), '']),
    'Safety notes',
    ...pack.safetyNotes.map((line) => `• ${line}`)
  ].join('\n')
}

function handleSectionAction(action: CommunicationSupportPackAction, section: CommunicationSupportPackSection) {
  if (action === 'copy_section') {
    void copyTextToClipboard(sectionPlainText(section))
    return
  }
  // Placeholder actions — no backend or missing endpoints called.
}

function handlePackAction(
  action: 'copy_all' | 'print' | 'save' | 'write' | 'reflect',
  pack: CommunicationSupportPackOutput,
  onStartReflect?: () => void
) {
  switch (action) {
    case 'copy_all':
      void copyTextToClipboard(packPlainText(pack))
      break
    case 'print':
      if (typeof window !== 'undefined') window.print()
      break
    case 'save':
    case 'write':
      // TODO: wire save pack and ORB Write hand-off when backend routes are available.
      break
    case 'reflect':
      onStartReflect?.()
      break
  }
}

export function OrbCommunicateSupportPackView({
  pack,
  onBack,
  onStartReflect
}: {
  pack: CommunicationSupportPackOutput
  onBack: () => void
  onStartReflect?: () => void
}) {
  return (
    <div className="orb-communicate-pack space-y-6" data-orb-communicate-support-pack>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="mb-3 text-sm font-medium text-[var(--orb-res-accent)] hover:underline"
            onClick={onBack}
            data-orb-communicate-pack-back
          >
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-[var(--orb-res-navy)]">{pack.packTitle}</h2>
          <p className="mt-1 text-sm text-[var(--orb-res-workspace-muted)]">
            {pack.audience.replace('_', ' ')} · {pack.sensitivity.replace('_', ' ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" data-orb-communicate-pack-actions>
          <button
            type="button"
            className="orb-communicate-pack-action"
            onClick={() => handlePackAction('copy_all', pack)}
            data-orb-communicate-pack-copy-all
          >
            Copy all
          </button>
          <button
            type="button"
            className="orb-communicate-pack-action"
            onClick={() => handlePackAction('print', pack)}
            data-orb-communicate-pack-print
          >
            Print
          </button>
          <button
            type="button"
            className="orb-communicate-pack-action"
            onClick={() => handlePackAction('save', pack)}
            data-orb-communicate-pack-save
            data-orb-communicate-action-placeholder="save"
          >
            Save pack
          </button>
          <button
            type="button"
            className="orb-communicate-pack-action"
            onClick={() => handlePackAction('write', pack)}
            data-orb-communicate-pack-send-write
            data-orb-communicate-action-placeholder="write"
          >
            Send to ORB Write
          </button>
          <button
            type="button"
            className="orb-communicate-pack-action orb-communicate-pack-action--primary"
            onClick={() => handlePackAction('reflect', pack, onStartReflect)}
            data-orb-communicate-pack-start-reflect
          >
            Start Reflect & Record
          </button>
        </div>
      </div>

      {pack.myVoiceProfileNotice ? (
        <p className="rounded-lg border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-workspace-surface)] px-3 py-2 text-sm text-[var(--orb-res-workspace-muted)]">
          {pack.myVoiceProfileNotice}
        </p>
      ) : null}

      <div className="space-y-4">
        {pack.sections.map((section) => (
          <article
            key={section.id}
            className="orb-communicate-pack-section rounded-xl border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-workspace-surface)] p-4"
            data-orb-communicate-pack-section={section.type}
          >
            <header className="mb-2">
              <h3 className="text-base font-semibold text-[var(--orb-res-navy)]">{section.heading}</h3>
              <p className="text-sm text-[var(--orb-res-workspace-muted)]">{section.description}</p>
            </header>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--orb-res-workspace-text)]">
              {section.content}
            </div>
            {section.visualCards?.length ? (
              <div
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
                data-orb-communicate-pack-visual-grid
              >
                {section.visualCards.map((card) => (
                  <OrbCommunicateSymbolPlaceholder key={card.id} label={card.label} category={card.category} />
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2" data-orb-communicate-section-actions>
              {section.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="orb-communicate-pack-action text-xs"
                  onClick={() => handleSectionAction(action, section)}
                  data-orb-communicate-section-action={action}
                  {...(PLACEHOLDER_ACTIONS.has(action)
                    ? { 'data-orb-communicate-action-placeholder': action }
                    : {})}
                >
                  {ACTION_LABELS[action]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <aside className="rounded-xl border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-shell-bg)] px-4 py-3 text-sm text-[var(--orb-res-workspace-muted)]">
        <p className="font-medium text-[var(--orb-res-workspace-text)]">Suggested next steps</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {pack.suggestedActions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed">{ORB_COMMUNICATE_FULL_SAFETY}</p>
      </aside>
    </div>
  )
}

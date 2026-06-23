'use client'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbCommunicateSymbolPlaceholder } from '@/components/orb-communicate/orb-communicate-shared'
import { ORB_COMMUNICATE_FULL_SAFETY } from '@/lib/orb/communicate/orb-communicate-plan'
import type {
  CommunicationSupportPackAction,
  CommunicationSupportPackOutput,
  CommunicationSupportPackSection
} from '@/lib/orb/communicate/orb-communicate-types'
import { saveStationDraftToRecordsWorkspace } from '@/lib/orb/orb-records-workspace-resilience'
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
  }
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
      void saveStationDraftToRecordsWorkspace({
        title: pack.packTitle || 'Communication support pack',
        body: packPlainText(pack),
        source_station: 'communicate',
        template_id: 'orb_communicate_support_pack_record',
        category: 'communicate'
      })
      break
    case 'write':
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
  const isSensitive = pack.sensitivity.includes('safeguarding') || pack.sensitivity.includes('high')

  return (
    <div className="orb-communicate-pack space-y-5" data-orb-communicate-support-pack>
      <header className="orb-communicate-pack-header flex flex-wrap items-start justify-between gap-3 border-b border-[var(--orb-res-workspace-border)] pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <GlassOrbMark size="sm" className="mt-1 shrink-0" aria-hidden />
          <div className="min-w-0">
            <button
              type="button"
              className="mb-2 text-sm font-medium text-[var(--orb-res-accent)] hover:underline"
              onClick={onBack}
              data-orb-communicate-pack-back
            >
              ← Back
            </button>
            <h2 className="text-xl font-semibold text-[var(--orb-res-navy)]" data-orb-communicate-pack-title>
              {pack.packTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--orb-res-workspace-muted)]" data-orb-communicate-pack-meta>
              {pack.audience.replace('_', ' ')} · {pack.sensitivity.replace('_', ' ')}
            </p>
          </div>
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
      </header>

      {pack.myVoiceProfileNotice ? (
        <p
          className="rounded-lg border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-workspace-surface)] px-3 py-2 text-sm text-[var(--orb-res-workspace-muted)]"
          data-orb-communicate-pack-voice-profile
        >
          <span className="font-medium text-[var(--orb-res-workspace-text)]">My Voice Profile: </span>
          {pack.myVoiceProfileNotice}
        </p>
      ) : null}

      {isSensitive ? (
        <p
          className="rounded-lg border border-amber-200/60 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-orb-communicate-pack-safeguarding-mode
        >
          Safeguarding-sensitive content — review carefully with a responsible adult before sharing or recording.
        </p>
      ) : null}

      <div className="space-y-4" data-orb-communicate-pack-sections>
        {pack.sections.map((section) => (
          <article
            key={section.id}
            className="orb-communicate-pack-section rounded-xl border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-workspace-surface)] p-4"
            data-orb-communicate-pack-section={section.type}
          >
            <header className="mb-3 border-b border-[var(--orb-res-workspace-border)]/60 pb-2">
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
                    ? { 'data-orb-communicate-action-placeholder': action, title: 'Coming soon — not yet live' }
                    : {})}
                >
                  {ACTION_LABELS[action]}
                  {PLACEHOLDER_ACTIONS.has(action) ? ' · soon' : ''}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <aside
        className="rounded-xl border border-[var(--orb-res-workspace-border)] bg-[var(--orb-res-shell-bg)] px-4 py-3 text-sm text-[var(--orb-res-workspace-muted)]"
        data-orb-communicate-pack-recording-prompts
      >
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

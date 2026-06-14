'use client'

import { useEffect } from 'react'
import {
  AudioLines,
  Camera,
  FileText,
  FolderOpen,
  ImagePlus,
  Mic,
  PenLine,
  Shield,
  Upload
} from 'lucide-react'

import type { OrbComposerPlusAction } from '@/components/orb-standalone/orb-composer-plus-menu'
import { ORB_COMPOSER_UPLOAD_BOUNDARY_LINES } from '@/lib/orb/orb-composer-attachments'
import { ORB_RESIDENTIAL_STATION_DEFINITIONS } from '@/lib/orb/orb-residential-stations'

const UPLOAD_ACTIONS: Array<{
  id: OrbComposerPlusAction
  label: string
  icon: typeof ImagePlus
}> = [
  { id: 'photo_library', label: 'Photo Library', icon: ImagePlus },
  { id: 'take_photo', label: 'Take Photo', icon: Camera },
  { id: 'choose_files', label: 'Choose Files', icon: FolderOpen }
]

const ORB_TOOL_ACTIONS: Array<{
  id: OrbComposerPlusAction
  label: string
  icon: typeof Mic
}> = [
  { id: 'orb_dictate', label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_dictate.label, icon: Mic },
  { id: 'orb_voice', label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_voice.label, icon: AudioLines },
  { id: 'orb_write', label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_write.label, icon: PenLine },
  { id: 'use_template', label: 'Record type', icon: FileText },
  { id: 'upload_document', label: 'Upload document', icon: Upload },
  { id: 'privacy_guidance', label: 'Privacy & responsibility', icon: Shield }
]

function selectAction(onClose: () => void, onSelect: (action: OrbComposerPlusAction) => void, action: OrbComposerPlusAction) {
  onClose()
  onSelect(action)
}

/** ChatGPT-style composer attachment sheet — compact popover above mobile composer. */
export function OrbResidentialComposerToolsSheet({
  open,
  onClose,
  onSelect
}: {
  open: boolean
  onClose: () => void
  onSelect: (action: OrbComposerPlusAction) => void
}) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <>
      <div
        className="orb-composer-attach-backdrop fixed inset-0 z-[67] bg-black/20"
        aria-hidden="true"
        data-orb-composer-attach-backdrop
        onClick={onClose}
      />
      <div
        className="orb-composer-attach-sheet absolute bottom-full left-0 right-0 z-[68] mb-2 overflow-hidden rounded-2xl border border-[var(--orb-line)]/70 bg-[var(--orb-surface-elevated)] shadow-2xl"
        role="dialog"
        aria-label="Add to message"
        aria-modal="true"
        data-orb-composer-tools-sheet
        data-orb-composer-attach-sheet="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3">
          <p
            className="mb-2.5 px-0.5 text-xs font-semibold text-[var(--orb-foreground)]"
            data-orb-composer-attach-heading
          >
            Add to message
          </p>

          <div className="grid grid-cols-3 gap-2" data-orb-composer-upload-actions>
            {UPLOAD_ACTIONS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--orb-line)]/55 bg-[var(--orb-surface-hover)]/40 px-1.5 py-2.5 text-center transition active:scale-[0.98] hover:bg-[var(--orb-surface-hover)]"
                  data-orb-composer-upload-action={item.id}
                  data-orb-composer-tools-item={item.id}
                  onClick={() => selectAction(onClose, onSelect, item.id)}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-[var(--orb-foreground)]">{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-3 border-t border-[var(--orb-line)]/45 pt-2.5" data-orb-composer-orb-tools-section>
            <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
              ORB tools
            </p>
            <ul className="space-y-0.5" data-orb-composer-orb-tools-list>
              {ORB_TOOL_ACTIONS.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full min-h-[2.75rem] items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-[var(--orb-surface-hover)]"
                      data-orb-composer-tools-item={item.id}
                      onClick={() => selectAction(onClose, onSelect, item.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
                      <span className="text-sm text-[var(--orb-foreground)]">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <p
            className="mt-2 px-0.5 text-[10px] leading-snug text-[var(--orb-muted)]"
            data-orb-composer-tools-privacy-hint
          >
            {ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[0]} {ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[1]}
          </p>
        </div>
      </div>
    </>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AudioLines,
  Camera,
  FileText,
  FolderOpen,
  ImagePlus,
  Mic,
  PenLine,
  Plus,
  Shield,
  Upload
} from 'lucide-react'
import { ORB_COMPOSER_UPLOAD_BOUNDARY_LINES } from '@/lib/orb/orb-composer-attachments'
import { ORB_COMPOSER_UPLOAD_PLUS_ACTIONS } from '@/lib/orb/orb-composer-upload-actions'
import { ORB_RESIDENTIAL_STATION_DEFINITIONS } from '@/lib/orb/orb-residential-stations'

export type OrbComposerPlusAction =
  | 'upload_document'
  | 'photo_library'
  | 'take_photo'
  | 'choose_files'
  | 'attach_image'
  | 'attach_photo'
  | 'review_text'
  | 'use_template'
  | 'knowledge'
  | 'orb_voice'
  | 'orb_dictate'
  | 'orb_write'
  | 'privacy_guidance'
  | 'learning_session'
  | 'saved_outputs'

type MenuItem = {
  id: OrbComposerPlusAction
  label: string
  icon: typeof Plus
  title?: string
  section?: 'upload' | 'orb_tools' | 'more'
}

const UPLOAD_ICON_BY_ACTION = {
  take_photo: Camera,
  photo_library: ImagePlus,
  choose_files: FolderOpen
} as const

const UPLOAD_ITEMS: MenuItem[] = ORB_COMPOSER_UPLOAD_PLUS_ACTIONS.map((action) => ({
  id: action.id,
  label: action.label,
  icon: UPLOAD_ICON_BY_ACTION[action.id],
  section: 'upload' as const,
  title:
    action.id === 'take_photo'
      ? 'Camera is browser/device controlled. Use Photos or Files if capture is unavailable.'
      : undefined
}))

const ORB_TOOL_ITEMS: MenuItem[] = [
  {
    id: 'orb_dictate',
    label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_dictate.label,
    icon: Mic,
    section: 'orb_tools'
  },
  {
    id: 'orb_voice',
    label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_voice.label,
    icon: AudioLines,
    section: 'orb_tools'
  },
  {
    id: 'orb_write',
    label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_write.label,
    icon: PenLine,
    section: 'orb_tools'
  },
  { id: 'use_template', label: 'Record type', icon: FileText, section: 'orb_tools' }
]

const MORE_ITEMS: MenuItem[] = [
  { id: 'upload_document', label: 'Upload document', icon: Upload, section: 'more' },
  { id: 'privacy_guidance', label: 'Privacy & responsibility', icon: Shield, section: 'more' }
]

const DESKTOP_RESIDENTIAL_ITEMS: MenuItem[] = [...UPLOAD_ITEMS, ...ORB_TOOL_ITEMS, ...MORE_ITEMS]

export function OrbComposerPlusMenu({
  onSelect,
  onAttachFiles
}: {
  onSelect: (action: OrbComposerPlusAction) => void
  onAttachFiles?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleSelect(item: MenuItem) {
    setOpen(false)
    if (item.id === 'upload_document') {
      onAttachFiles?.()
      return
    }
    onSelect(item.id)
  }

  const sections: Array<{ key: MenuItem['section']; items: MenuItem[] }> = [
    { key: 'upload', items: DESKTOP_RESIDENTIAL_ITEMS.filter((item) => item.section === 'upload') },
    { key: 'orb_tools', items: DESKTOP_RESIDENTIAL_ITEMS.filter((item) => item.section === 'orb_tools') },
    { key: 'more', items: DESKTOP_RESIDENTIAL_ITEMS.filter((item) => item.section === 'more') }
  ]

  return (
    <div className="relative" ref={rootRef} data-orb-composer-plus-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
        aria-label="More actions"
        aria-expanded={open}
        data-orb-composer-plus-trigger
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          className="orb-composer-plus-dropdown orb-liquid-panel absolute bottom-full left-0 z-50 mb-2 min-w-[13.5rem] overflow-hidden rounded-xl py-1"
          role="menu"
          data-orb-composer-plus-dropdown
          data-orb-composer-attachment-menu
        >
          {sections.map((section, index) => (
            <div key={section.key ?? 'default'}>
              {index > 0 ? <div className="my-1 border-t border-[var(--orb-line)]/45" role="separator" /> : null}
              <ul
                className="space-y-0.5"
                data-orb-composer-upload-actions={section.key === 'upload' ? 'true' : undefined}
                data-orb-composer-orb-tools-list={section.key === 'orb_tools' ? 'true' : undefined}
                data-orb-composer-more-orb-tools={section.key === 'more' ? 'true' : undefined}
              >
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="menuitem"
                        title={item.title}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--orb-foreground)] transition hover:bg-[var(--orb-surface-hover)]"
                        data-orb-composer-plus-item={item.id}
                        data-orb-composer-upload-action={
                          section.key === 'upload' ? item.id : undefined
                        }
                        onClick={() => handleSelect(item)}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" aria-hidden />
                        <span>{item.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          <p
            className="mt-1 border-t border-[var(--orb-line)]/45 px-3 py-2 text-[10px] leading-snug text-[var(--orb-muted)]"
            data-orb-composer-tools-privacy-hint
          >
            {ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[0]} {ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[1]}
          </p>
        </div>
      ) : null}
    </div>
  )
}

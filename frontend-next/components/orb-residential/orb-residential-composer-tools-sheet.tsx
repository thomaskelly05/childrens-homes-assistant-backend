'use client'

import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import {
  AudioLines,
  Camera,
  ChevronRight,
  FileText,
  FolderOpen,
  ImagePlus,
  Mic,
  MoreHorizontal,
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
  icon: typeof Camera
}> = [
  { id: 'take_photo', label: 'Camera', icon: Camera },
  { id: 'photo_library', label: 'Photos', icon: ImagePlus },
  { id: 'choose_files', label: 'Files', icon: FolderOpen }
]

const ORB_TOOL_ACTIONS: Array<{
  id: OrbComposerPlusAction
  label: string
  icon: typeof Mic
}> = [
  { id: 'orb_dictate', label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_dictate.label, icon: Mic },
  { id: 'orb_voice', label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_voice.label, icon: AudioLines },
  { id: 'orb_write', label: ORB_RESIDENTIAL_STATION_DEFINITIONS.orb_write.label, icon: PenLine },
  { id: 'use_template', label: 'Record type', icon: FileText }
]

const MORE_ORB_ACTIONS: Array<{
  id: OrbComposerPlusAction
  label: string
  icon: typeof Upload
}> = [
  { id: 'upload_document', label: 'Upload document', icon: Upload },
  { id: 'privacy_guidance', label: 'Privacy & responsibility', icon: Shield }
]

function selectAction(onClose: () => void, onSelect: (action: OrbComposerPlusAction) => void, action: OrbComposerPlusAction) {
  onClose()
  onSelect(action)
}

type MenuPosition = {
  bottom: number
  left: number
  width: number
}

/** ChatGPT-style compact attachment menu — portaled above mobile composer. */
export function OrbResidentialComposerToolsSheet({
  open,
  onClose,
  onSelect,
  anchorRef
}: {
  open: boolean
  onClose: () => void
  onSelect: (action: OrbComposerPlusAction) => void
  anchorRef?: RefObject<HTMLElement | null>
}) {
  const [mounted, setMounted] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null)
      return
    }
    function syncPosition() {
      const anchor = anchorRef?.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      setMenuPosition({
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16)
      })
    }
    syncPosition()
    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)
    return () => {
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
    }
  }, [anchorRef, open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open || !mounted) return null

  const sheet = (
    <>
      <div
        className="orb-composer-attach-backdrop fixed inset-0 z-[67] bg-black/20"
        aria-hidden="true"
        data-orb-composer-attach-backdrop
        onClick={onClose}
      />
      <div
        className="orb-composer-attach-sheet fixed z-[68] overflow-hidden rounded-2xl border border-[var(--orb-line)]/60 bg-[color-mix(in_srgb,var(--orb-surface-elevated)_92%,transparent)] shadow-2xl backdrop-blur-xl"
        role="menu"
        aria-label="Add attachment"
        data-orb-composer-tools-sheet
        data-orb-composer-attach-sheet="true"
        data-orb-composer-attachment-menu
        style={
          menuPosition
            ? {
                bottom: menuPosition.bottom,
                left: menuPosition.left,
                width: menuPosition.width,
                maxWidth: 'calc(100vw - 1rem)'
              }
            : { visibility: 'hidden' }
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2">
          <ul className="space-y-0.5" data-orb-composer-upload-actions>
            {UPLOAD_ACTIONS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full min-h-[3rem] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition active:scale-[0.99] hover:bg-[var(--orb-surface-hover)]"
                    data-orb-composer-upload-action={item.id}
                    data-orb-composer-tools-item={item.id}
                    onClick={() => selectAction(onClose, onSelect, item.id)}
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="flex-1 text-[0.9375rem] font-medium text-[var(--orb-foreground)]">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="my-1.5 border-t border-[var(--orb-line)]/45" role="separator" />

          <ul className="space-y-0.5" data-orb-composer-orb-tools-section data-orb-composer-orb-tools-list>
            {ORB_TOOL_ACTIONS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full min-h-[2.75rem] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-[var(--orb-surface-hover)]"
                    data-orb-composer-tools-item={item.id}
                    onClick={() => selectAction(onClose, onSelect, item.id)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--orb-muted)]" aria-hidden />
                    <span className="flex-1 text-sm text-[var(--orb-foreground)]">{item.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--orb-muted)]" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="my-1.5 border-t border-[var(--orb-line)]/45" role="separator" />

          <p className="mb-0.5 flex items-center gap-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
            <MoreHorizontal className="h-3 w-3" aria-hidden />
            More ORB tools
          </p>
          <ul className="space-y-0.5" data-orb-composer-more-orb-tools>
            {MORE_ORB_ACTIONS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full min-h-[2.75rem] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition hover:bg-[var(--orb-surface-hover)]"
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

          <p
            className="mt-2 px-2.5 text-[10px] leading-snug text-[var(--orb-muted)]"
            data-orb-composer-tools-privacy-hint
          >
            {ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[0]} {ORB_COMPOSER_UPLOAD_BOUNDARY_LINES[1]}
          </p>
        </div>
      </div>
    </>
  )

  return createPortal(sheet, document.body)
}

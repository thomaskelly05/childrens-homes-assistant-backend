'use client'

import { useEffect, useState } from 'react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'

export function OrbProjectMemoryModal({
  open,
  projectName,
  initialMemory,
  onClose,
  onSave
}: {
  open: boolean
  projectName: string
  initialMemory: string
  onClose: () => void
  onSave: (memory: string) => void
}) {
  const [memory, setMemory] = useState(initialMemory)

  useEffect(() => {
    if (open) setMemory(initialMemory)
  }, [open, initialMemory])

  return (
    <OrbAppModal
      open={open}
      title="Project memory"
      subtitle={`Optional context for ${projectName}`}
      onClose={onClose}
      panelId="project-memory"
      size="standard"
    >
      <div className="space-y-5 p-5 sm:p-6" data-orb-project-memory-modal>
        <p className="text-sm leading-6 text-[var(--orb-muted)]">
          This memory helps ORB when you chat inside this project. It syncs to your account when signed in, with
          local backup on this device. It is user-supplied ORB memory — not live IndiCare OS record data.
        </p>
        <textarea
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
          rows={5}
          placeholder="e.g. My Home supports children aged 12–17. Current focus: recording quality, safeguarding oversight and inspection readiness."
          className="w-full resize-y rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
          data-orb-project-memory-input
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(memory.trim())
              onClose()
            }}
            className="rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-4 py-2 text-xs font-semibold text-white"
            data-orb-project-memory-save
          >
            Save memory
          </button>
        </div>
      </div>
    </OrbAppModal>
  )
}

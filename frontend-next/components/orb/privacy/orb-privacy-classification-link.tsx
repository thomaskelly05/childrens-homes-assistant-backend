'use client'

import { useState } from 'react'

import { OrbPrivacyClassificationModal } from './orb-privacy-classification-modal'

/** Compact link opening Green/Amber/Red guidance modal. */
export function OrbPrivacyClassificationLink({
  className = 'text-[10px] font-medium text-[var(--orb-primary,#1677ff)] hover:underline'
}: {
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        data-orb-privacy-classification-link
      >
        What information can I enter?
      </button>
      <OrbPrivacyClassificationModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

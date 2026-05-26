'use client'

import { useState, type ReactNode } from 'react'

import { SectionHeader } from '@/components/indicare/ui'

export function WorkspaceSectionAccordion({
  testId,
  eyebrow,
  title,
  description,
  defaultOpen = true,
  children
}: {
  testId: string
  eyebrow: string
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      data-testid={testId}
      className="rounded-[28px] border border-slate-200/80 bg-white shadow-sm"
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 rounded-[28px] p-5 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <SectionHeader eyebrow={eyebrow} title={title} description={open ? description : undefined} />
        <span className="mt-1 shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open ? <div className="border-t border-slate-100 px-5 pb-5 pt-2">{children}</div> : null}
    </section>
  )
}

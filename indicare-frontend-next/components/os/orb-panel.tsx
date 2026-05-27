'use client'

import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

export function OrbPanel({
  childId,
  childName,
  children,
  defaultOpen = false
}: {
  childId: string
  childName: string
  children?: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const orbHref = `/assistant/orb?child_id=${encodeURIComponent(childId)}&child_name=${encodeURIComponent(childName)}`

  return (
    <aside
      data-testid="workspace-orb-panel"
      className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-violet-50/40 p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 text-sky-600" aria-hidden />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">ORB support</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
              Inspector and registered-manager guidance — without hiding {childName}&apos;s record.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-xl border border-sky-200 bg-white p-2 text-sky-800"
          aria-expanded={open}
          aria-label={open ? 'Collapse ORB panel' : 'Expand ORB panel'}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-3">
          {children}
          <div className="flex flex-wrap gap-2">
            <Link href={orbHref} className="inline-flex min-h-10 items-center rounded-2xl bg-sky-600 px-4 py-2 text-xs font-black text-white">
              Ask ORB
            </Link>
            <Link
              href={`${orbHref}&mode=therapeutic_rewrite`}
              className="inline-flex min-h-10 items-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900"
            >
              Rewrite therapeutically
            </Link>
            <Link
              href={`${orbHref}&mode=ofsted_lens`}
              className="inline-flex min-h-10 items-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900"
            >
              Ofsted lens
            </Link>
            <Link
              href={`${orbHref}&mode=what_is_missing`}
              className="inline-flex min-h-10 items-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900"
            >
              What is missing?
            </Link>
            <Link
              href={`${orbHref}&mode=create_action`}
              className="inline-flex min-h-10 items-center rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-900"
            >
              Create action
            </Link>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

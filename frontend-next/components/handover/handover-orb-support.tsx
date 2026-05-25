'use client'

import Link from 'next/link'

import { handoverOrbHref, type HandoverIntelligenceDashboard } from '@/lib/os-api/handover-intelligence'

export function HandoverOrbSupport({ dashboard }: { dashboard: HandoverIntelligenceDashboard | null }) {
  const prompts = dashboard?.orb_prompts?.length
    ? dashboard.orb_prompts
    : [
        { label: 'Help me prepare today’s handover.', mode: 'manager_daily_brief', query: 'Help me prepare today’s handover.' },
        { label: 'What needs to be carried into the next shift?', mode: 'action_priority', query: 'What needs to be carried into the next shift?' }
      ]

  return (
    <section data-testid="handover-orb-support" className="rounded-[24px] border border-blue-100 bg-blue-50/50 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Ask OS ORB</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
        Operational ORB can help structure handover themes. No handover payload is sent in the URL.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt.label}
            href={handoverOrbHref(prompt.mode, prompt.query)}
            data-testid="handover-ask-os-orb"
            className="rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-900 shadow-sm transition hover:bg-blue-50"
          >
            {prompt.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

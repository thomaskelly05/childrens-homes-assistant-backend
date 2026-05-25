'use client'

import Link from 'next/link'

import { handoverOrbHref, type HandoverIntelligenceDashboard } from '@/lib/os-api/handover-intelligence'

export function HandoverOrbSupport({ dashboard }: { dashboard: HandoverIntelligenceDashboard | null }) {
  const prompts = dashboard?.orb_prompts?.length
    ? dashboard.orb_prompts
    : [
        { label: 'Help me review this handover for clarity.', mode: 'manager_daily_brief', query: 'Help me review this handover for clarity.' },
        { label: 'What should be carried into next shift?', mode: 'action_priority', query: 'What should be carried into the next shift?' },
        { label: 'Are there safeguarding-sensitive items to consider?', mode: 'safeguarding_themes', query: 'Are there safeguarding-sensitive items to consider?' },
        { label: 'Help me prepare a manager review of this handover.', mode: 'manager_daily_brief', query: 'Help me prepare a manager review of this handover.' }
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

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { shouldShowInlineOrbCard } from '@/lib/orb/orb-presence-rules'
import { inspectionReadinessOrbHref, type InspectionEvidencePack } from '@/lib/os-api/inspection evidence preparation'

type Props = { pack?: InspectionEvidencePack | null }

export function InspectionOrbSupport({ pack }: Props) {
  const pathname = usePathname() || '/'
  if (!shouldShowInlineOrbCard(pathname)) return null
  const prompts = pack?.orb_prompts?.length
    ? pack.orb_prompts
    : [
        {
          label: 'Ask ORB to review Reg 44 evidence gaps',
          mode: 'ofsted_evidence_review',
          query: 'What Reg 44 evidence gaps may need manager review?'
        },
        {
          label: 'Ask ORB to help prepare Reg 45 evidence questions',
          mode: 'ofsted_evidence_review',
          query: 'Help prepare Reg 45 quality of care review evidence questions.'
        }
      ]

  return (
    <section data-testid="inspection-orb-support" className="space-y-3">
      <h3 className="text-sm font-black text-slate-950">Ask OS ORB</h3>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt.label}
            href={inspectionReadinessOrbHref(prompt.mode, prompt.query)}
            data-testid="inspection-ask-orb"
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-800"
          >
            {prompt.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

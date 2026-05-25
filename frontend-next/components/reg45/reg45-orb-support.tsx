'use client'

import Link from 'next/link'

import { reg45ReviewOrbHref, type Reg45QualityReview } from '@/lib/os-api/reg45-quality-review'

type Props = { review?: Reg45QualityReview | null }

export function Reg45OrbSupport({ review }: Props) {
  const prompts = review?.orb_prompts?.length
    ? review.orb_prompts
    : [
        {
          label: 'Ask ORB to help structure the Reg 45 review',
          mode: 'ofsted_evidence_review',
          query: 'Help structure a Reg 45 quality of care review — not a compliance decision.'
        },
        {
          label: 'Ask ORB what evidence gaps need manager review',
          mode: 'ofsted_evidence_review',
          query: 'What Reg 45 evidence gaps may need manager review?'
        }
      ]

  return (
    <section data-testid="reg45-orb-support" className="space-y-3">
      <h3 className="text-sm font-black text-slate-950">Ask OS ORB</h3>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt.label}
            href={reg45ReviewOrbHref(prompt.mode, prompt.query)}
            data-testid="reg45-ask-orb"
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-800"
          >
            {prompt.label}
          </Link>
        ))}
      </div>
    </section>
  )
}

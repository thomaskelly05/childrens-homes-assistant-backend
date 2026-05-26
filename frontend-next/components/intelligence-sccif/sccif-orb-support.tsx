'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { shouldShowInlineOrbCard } from '@/lib/orb/orb-presence-rules'
import { sccifAlignmentOrbHref } from '@/lib/os-api/sccif-alignment'

type OrbPrompt = {
  label: string
  mode: string
  query: string
}

type Props = {
  prompts: OrbPrompt[]
}

export function SccifOrbSupport({ prompts }: Props) {
  const pathname = usePathname() || '/'
  if (!shouldShowInlineOrbCard(pathname)) return null

  return (
    <section data-testid="sccif-orb-support" className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
      <h2 className="text-sm font-black text-violet-950">Ask OS ORB</h2>
      <p className="mt-1 text-xs leading-6 text-violet-900/90">
        ORB may help explore evidence themes. No evidence payload in URL. Not a compliance decision.
      </p>
      <ul className="mt-3 space-y-2">
        {prompts.map((prompt) => (
          <li key={prompt.label}>
            <Link
              href={sccifAlignmentOrbHref(prompt.mode, prompt.query)}
              data-testid="sccif-ask-os-orb"
              className="text-xs font-black text-violet-900 underline"
            >
              {prompt.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { OrbRenderer } from '@/components/orb-core/orb-renderer'
import { standaloneOrbPrompts } from '@/lib/orb/content/prompts'
import { orbProductCopy } from '@/lib/orb/content/copy'
import Link from 'next/link'

export function OrbStandaloneHome() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <OrbRenderer state="idle" captionsEnabled caption={orbProductCopy.standalonePrompt} presenceLabel="ORB powered by IndiCare" />
      <section className="rounded-[36px] border border-white/10 bg-white/8 p-6 text-white backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">{orbProductCopy.brandLine}</p>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.07em]">{orbProductCopy.standalonePrompt}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">{orbProductCopy.standaloneSubprompt}</p>
        <div className="mt-8 grid gap-3">
          {standaloneOrbPrompts.map((prompt) => (
            <Link key={prompt} href={`/assistant?prompt=${encodeURIComponent(prompt)}`} className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-left text-sm font-bold leading-6 text-slate-100 hover:bg-white/10">
              {prompt}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}


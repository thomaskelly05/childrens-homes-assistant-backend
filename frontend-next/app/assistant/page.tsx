import Link from 'next/link'
import { BrainCircuit, Mic2, PenLine, Sparkles } from 'lucide-react'

const assistantLinks = [
  {
    href: '/assistant/orb',
    title: 'IndiCare OS ORB',
    description: 'Operational cognition with permissioned CareHub, records and chronology context.',
    icon: Sparkles
  },
  {
    href: '/intelligence-spine',
    title: 'Intelligence spine',
    description: 'Cross-home signals, review posture and operational intelligence.',
    icon: BrainCircuit
  },
  {
    href: '/intelligence-actions',
    title: 'Intelligence actions',
    description: 'Queued reviews, follow-ups and manager actions from live signals.',
    icon: BrainCircuit
  },
  {
    href: '/record',
    title: 'Recording help',
    description: 'Guided recording launcher — ORB prompts open standalone ORB Care Companion.',
    icon: PenLine
  },
  {
    href: '/orb',
    title: 'ORB Care Companion',
    description: 'Standalone ChatGPT-style assistant — no OS records or CareHub context.',
    icon: Mic2
  }
] as const

export default function AssistantPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-10 md:px-10">
      <header className="rounded-[32px] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-100/40">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-600">IndiCare OS Assistant</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950 md:text-5xl">Choose your assistant surface</h1>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
          OS-linked assistants stay inside IndiCare OS. Standalone ORB Care Companion lives at /orb and never retrieves care records.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {assistantLinks.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/30"
            >
              <Icon className="h-6 w-6 text-blue-600" aria-hidden />
              <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}

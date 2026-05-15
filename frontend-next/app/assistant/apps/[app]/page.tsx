import Link from 'next/link'
import { notFound } from 'next/navigation'

import { StandaloneAssistantShell, StandaloneOrbVisual } from '@/lib/standalone-assistant/assistant-shell'
import { appIcons, assistantApps, documentTypes } from '@/lib/standalone-assistant/config'
import type { AssistantAppSlug } from '@/lib/standalone-assistant/types'

const workspaceDetails: Record<AssistantAppSlug, { title: string; sections: Array<{ title: string; items: string[] }> }> = {
  connect: {
    title: 'IndiCare Connect',
    sections: [
      { title: 'Spaces and channels', items: ['Oak House team space', 'Announcements', 'Safeguarding discussion room', 'Supervision discussion room'] },
      { title: 'Conversation tools', items: ['Direct messages foundation', 'Task discussion', 'Meeting notes workspace', 'Clear OS boundary'] },
      { title: 'Boundary', items: ['No live OS record access', 'Future OS integration must be permissioned and explicit'] }
    ]
  },
  'magic-notes': {
    title: 'Magic Notes by IndiCare',
    sections: [
      { title: 'Capture', items: ['Start recording button', 'Paste transcript', 'Transcript panel'] },
      { title: 'AI outputs', items: ['Summary', 'Actions extracted', 'Themes', 'Child-centred wording', 'Safeguarding-aware summary'] },
      { title: 'Export only', items: ['Copy controls', 'Download placeholder', 'No automatic OS writeback'] }
    ]
  },
  docs: {
    title: 'IndiCare Docs',
    sections: [
      { title: 'Editor foundation', items: ['Clean editor', 'AI drafting', 'Citations and references', 'Version timeline', 'Review and sign-off'] },
      { title: 'Document types', items: documentTypes },
      { title: 'Output', items: ['Copy content', 'Review before external use', 'No OS document storage'] }
    ]
  },
  reports: {
    title: 'Report Generator',
    sections: [
      { title: 'Inputs', items: ['Upload report material', 'Paste source material', 'Generated reports say based on supplied material'] },
      { title: 'Outputs', items: ['Extract findings', 'Evidence gaps', 'RM/RI responsibility labels', 'Due date suggestions', 'Action plan'] },
      { title: 'Report types', items: ['Reg 44 action plan', 'Reg 45 quality of care review', 'LAC review', 'Ofsted preparation', 'Safeguarding chronology', 'Missing episode review'] }
    ]
  },
  templates: {
    title: 'Templates',
    sections: [
      { title: 'Template library', items: ['Daily note template', 'Supervision note', 'Professional email', 'Reg 45 outline', 'Meeting agenda'] },
      { title: 'Controls', items: ['Open template', 'Copy', 'Draft with sector brain'] }
    ]
  },
  policies: {
    title: 'Policy Writer',
    sections: [
      { title: 'Policy drafting', items: ['Policy outline', 'Procedure steps', 'References section', 'Manager review prompt'] },
      { title: 'Safety', items: ['Guidance not legal advice', 'Review and sign-off'] }
    ]
  },
  meetings: {
    title: 'Meeting Notes',
    sections: [
      { title: 'Meeting workspace', items: ['Agenda', 'Notes', 'Decisions', 'Actions', 'Follow-up email'] },
      { title: 'AI help', items: ['Summarise', 'Extract actions', 'Professional wording'] }
    ]
  },
  voice: {
    title: 'Voice Studio',
    sections: [
      { title: 'Standalone voice', items: ['Voice button', 'Full voice mode', 'Captions', 'Separate standalone session'] },
      { title: 'Allowed help', items: ['General questions', 'Sector questions', 'Document drafting', 'Practice reflection'] },
      { title: 'Blocked', items: ['No OS records', 'No child/home context', 'No automatic writeback'] }
    ]
  }
}

export function generateStaticParams() {
  return assistantApps.map((app) => ({ app: app.slug }))
}

export default async function AssistantAppPage({ params }: { params: Promise<{ app: string }> }) {
  const { app: appParam } = await params
  const app = assistantApps.find((item) => item.slug === appParam)
  if (!app) notFound()

  const slug = app.slug
  const detail = workspaceDetails[slug]
  const Icon = appIcons[slug]
  const isVoice = slug === 'voice'

  return (
    <StandaloneAssistantShell eyebrow="Assistant app" title={detail.title} subtitle={app.description}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Icon className="h-8 w-8 text-cyan-500" aria-hidden />
              <h2 className="mt-5 text-4xl font-black tracking-[-0.07em]">{detail.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">{app.description}</p>
            </div>
            <Link href="/assistant/apps" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:text-white">
              All apps
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {detail.sections.map((section) => (
              <article key={section.title} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-black/20">
                <h3 className="text-lg font-black tracking-[-0.04em]">{section.title}</h3>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {section.items.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <aside className={isVoice ? 'rounded-[34px] bg-black p-6 text-white' : 'rounded-[34px] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5'}>
          {isVoice ? <StandaloneOrbVisual large /> : null}
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">Controlled workspace</p>
          <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">Foundation controls</h3>
          <div className="mt-5 grid gap-3">
            {[
              ['Open workspace', isVoice ? '/assistant/voice' : `/assistant/apps/${slug}`],
              ['Use assistant', '/assistant'],
              ['All apps', '/assistant/apps']
            ].map(([label, href]) => (
              <Link key={label} href={href} className="rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-black text-white dark:bg-white dark:text-slate-950">
                {label}
              </Link>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-300">Standalone work stays separate from live care records unless a reviewed OS workflow is used.</p>
        </aside>
      </div>
    </StandaloneAssistantShell>
  )
}

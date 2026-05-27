import Link from 'next/link'

import { StandaloneAssistantShell } from '@/lib/standalone-assistant/assistant-shell'
import { appIcons, assistantApps } from '@/lib/standalone-assistant/config'

export default function AssistantAppsPage() {
  return (
    <StandaloneAssistantShell eyebrow="Apps ecosystem" title="Assistant apps" subtitle="Foundation apps for standalone AI workspaces. These routes do not access IndiCare OS records.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assistantApps.map((app) => {
          const Icon = appIcons[app.slug]
          return (
            <article key={app.slug} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <Icon className="h-7 w-7 text-cyan-500" aria-hidden />
              <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">{app.status}</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">{app.name}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-500 dark:text-slate-400">{app.description}</p>
              <Link href={app.route} className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
                Open
              </Link>
            </article>
          )
        })}
      </div>
    </StandaloneAssistantShell>
  )
}

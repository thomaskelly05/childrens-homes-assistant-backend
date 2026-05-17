import Link from 'next/link'

import { CreateThreadPanel } from '@/components/connect/create-thread-panel'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getConnectThreads, getMeToday } from '@/lib/os-api/connect'

export default async function ConnectPage() {
  const [threadsResult, todayResult] = await Promise.all([getConnectThreads(), getMeToday()])
  const threads = threadsResult.data.items || []
  const today = todayResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IndiCare Connect"
        title="Home conversations"
        description="Schema-backed internal communication for adults in the same provider/home scope. No demo messages are shown."
        action={<Link href="/notifications" className="rounded-2xl border border-blue-100 bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-sm">Notifications</Link>}
      />
      <LiveDataStatus result={threadsResult} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow="Threads" title="Your Connect inbox" description="Home channels, direct messages and group threads appear here after they are created in the database." />
          <div className="space-y-3">
            {threads.map((thread) => (
              <Link key={thread.id} href={`/connect/${thread.id}`} className="block rounded-[24px] border border-slate-100 bg-slate-50 p-5 transition hover:border-blue-100 hover:bg-white hover:shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <StatusBadge value={thread.thread_type.replaceAll('_', ' ')} />
                    <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-slate-950">{thread.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{thread.latest_message_at ? `Latest message ${thread.latest_message_at}` : 'No messages in this thread yet.'}</p>
                  </div>
                  {thread.unread_count ? <span className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-black text-white">{thread.unread_count} unread</span> : null}
                </div>
              </Link>
            ))}
            {!threads.length ? (
              <EmptyState title="No Connect threads yet" description="Start a home channel, group thread or direct conversation. This page will not show fake messages." />
            ) : null}
          </div>
        </Card>

        <aside className="space-y-6">
          <Card>
            <SectionHeader eyebrow="Today" title="Unread and alerts" />
            <div className="grid gap-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <strong className="block text-3xl font-black text-slate-950">{today.connect?.count || 0}</strong>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Unread Connect</span>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <strong className="block text-3xl font-black text-slate-950">{today.notifications?.unread || 0}</strong>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notifications</span>
              </div>
            </div>
          </Card>
          <CreateThreadPanel />
        </aside>
      </section>
    </div>
  )
}

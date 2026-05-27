import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ConnectComposer } from '@/components/connect/connect-composer'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, EmptyState, PageHeader, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getConnectThread } from '@/lib/os-api/connect'

function formatDate(value?: string | null) {
  if (!value) return 'Date not returned'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default async function ConnectThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const result = await getConnectThread(threadId)
  const thread = result.data.thread
  if (!thread && result.source === 'live') notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IndiCare Connect"
        title={thread?.title || 'Thread unavailable'}
        description="Messages are scoped to the current provider/home membership and remain audit-aware."
        action={<Link href="/connect" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">Back to inbox</Link>}
      />
      <LiveDataStatus result={result} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <SectionHeader eyebrow={thread?.thread_type?.replaceAll('_', ' ') || 'Thread'} title="Messages" />
          <div className="space-y-3">
            {result.data.messages.map((message) => (
              <article key={message.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{message.author_name || 'Team member'}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(message.created_at)}</p>
                  </div>
                  <StatusBadge value={message.priority} />
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{message.body}</p>
              </article>
            ))}
            {!result.data.messages.length ? <EmptyState title="No messages yet" description="Send the first real message for this thread. No fake conversation is shown." /> : null}
          </div>
        </Card>

        <aside className="space-y-6">
          {thread ? <ConnectComposer threadId={thread.id} /> : null}
          <Card>
            <SectionHeader eyebrow="Scope" title="Safeguarding-safe messaging" />
            <p className="text-sm leading-7 text-slate-600">Use concise professional language. Link child or record context only when it is appropriate and necessary for the work.</p>
          </Card>
        </aside>
      </section>
    </div>
  )
}

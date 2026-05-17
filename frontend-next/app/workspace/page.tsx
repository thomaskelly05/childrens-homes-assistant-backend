import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import {
  ChronologySurface,
  ConnectSurface,
  FocusSurface,
  HandoverSurface,
  NotificationSurface,
  WorkspaceColumn,
  WorkspaceStack
} from '@/components/indicare/operational-surfaces'
import { EmptyState, RecordTimeline, StatusBadge } from '@/components/indicare/ui'
import { getWorkspaceBundle, recordTitle, text } from '@/lib/os-api/bundles'

function formatDate(value?: string) {
  if (!value) return 'Date not returned'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function timelineItem(row: Record<string, any>, index: number) {
  return {
    id: String(row.id || index),
    title: recordTitle(row, 'Chronology event'),
    date: formatDate(row.event_datetime || row.created_at || row.updated_at),
    body: text(row, ['summary', 'description', 'body', 'details'], 'No summary was returned for this record.'),
    href: row.id ? `/chronology/${encodeURIComponent(String(row.id))}` : undefined
  }
}

export default async function WorkspacePage() {
  const result = await getWorkspaceBundle()
  const bundle = result.data
  const identity = bundle.identity || {}
  const home = bundle.home || {}
  const displayName = text(identity, ['preferred_name', 'display_name', 'email'], 'Your workspace')
  const homeName = text(home, ['name', 'home_name', 'title'], identity.home_id ? `Home ${identity.home_id}` : 'Home not returned')
  const pinned = Array.isArray(bundle.preferences?.layout) ? bundle.preferences.layout : []

  return (
    <WorkspaceStack>
      <FocusSurface tone="blue">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-blue-700">Workspace</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.07em] text-slate-950 md:text-6xl">{text(bundle.today, ['greeting'], `Good to see you, ${displayName}`)}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">Your live operational workspace for {homeName}. Everything here is schema-backed or honestly empty.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge value={text(identity, ['role'], 'role not returned')} />
              <StatusBadge value={homeName} />
              <StatusBadge value={text(bundle.today, ['shift'], 'shift not returned')} />
            </div>
          </div>
          <div className="grid min-w-[220px] gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Link href="/connect" className="rounded-[24px] bg-white/85 p-4 shadow-sm ring-1 ring-white">
              <strong className="block text-3xl font-black text-slate-950">{bundle.connect.unread_count || 0}</strong>
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Connect</span>
            </Link>
            <Link href="/notifications" className="rounded-[24px] bg-white/85 p-4 shadow-sm ring-1 ring-white">
              <strong className="block text-3xl font-black text-slate-950">{bundle.notifications.unread_count || 0}</strong>
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Notifications</span>
            </Link>
            <Link href="/handover/current" className="rounded-[24px] bg-white/85 p-4 shadow-sm ring-1 ring-white">
              <strong className="block text-3xl font-black text-slate-950">{bundle.handover.items?.length || 0}</strong>
              <span className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Handover</span>
            </Link>
          </div>
        </div>
      </FocusSurface>
      <LiveDataStatus result={result} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <WorkspaceColumn>
          <HandoverSurface status={bundle.handover.status}>
            {bundle.handover.items?.length ? (
              <div className="space-y-3">
                {bundle.handover.items.slice(0, 5).map((item, index) => (
                  <article key={String(item.id || index)} className="rounded-[24px] bg-slate-50/80 p-4">
                    <h3 className="text-sm font-black text-slate-950">{recordTitle(item, 'Handover item')}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text(item, ['summary', 'detail', 'body'], 'No handover detail returned.')}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No handover has been recorded for this shift yet" description="Create a handover, open Connect, or view the home heartbeat when real shift information is available." />
            )}
          </HandoverSurface>

          <ChronologySurface description="Significant recent activity from live records.">
            <RecordTimeline items={bundle.recent_chronology.map(timelineItem)} />
          </ChronologySurface>
        </WorkspaceColumn>

        <WorkspaceColumn>
          <ConnectSurface unread={bundle.connect.unread_count}>
            {bundle.connect.recent_threads.length ? (
              <div className="space-y-3">
                {bundle.connect.recent_threads.slice(0, 4).map((thread) => (
                  <Link key={String(thread.id)} href={`/connect/${encodeURIComponent(String(thread.id))}`} className="block rounded-[22px] bg-white/80 p-4 text-sm font-bold text-slate-700 ring-1 ring-white">
                    {recordTitle(thread, 'Connect thread')}
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No Connect threads returned" description="Home channels and direct messages will appear here after real threads are created." />
            )}
          </ConnectSurface>

          <NotificationSurface unread={bundle.notifications.unread_count}>
            {bundle.notifications.items.length ? (
              <div className="space-y-3">
                {bundle.notifications.items.slice(0, 4).map((item, index) => (
                  <article key={String(item.id || index)} className="rounded-[22px] bg-slate-50 p-4">
                    <h3 className="text-sm font-black text-slate-950">{recordTitle(item, 'Notification')}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text(item, ['message', 'body', 'summary'], 'No notification detail returned.')}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No unread notifications" description="Provider-scoped notifications will appear here when live records require attention." />
            )}
          </NotificationSurface>

          <FocusSurface>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Priority children</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Relevant to my shift</h2>
            <div className="mt-5 space-y-3">
              {bundle.children.priority.concat(bundle.children.favourites).slice(0, 5).map((child) => (
                <Link key={String(child.id)} href={`/children/${encodeURIComponent(String(child.id))}`} className="block rounded-[22px] bg-slate-50 p-4 text-sm font-black text-slate-700">
                  {text(child, ['preferred_name', 'first_name', 'display_name'], 'Young person')}
                </Link>
              ))}
              {!bundle.children.priority.length && !bundle.children.favourites.length ? <EmptyState title="No priority children returned" description="Assigned, favourite or high-priority children will appear only when real records exist." /> : null}
            </div>
          </FocusSurface>

          <FocusSurface>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Customisation</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Pinned surfaces</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {pinned.filter((item: any) => item?.pinned !== false).map((item: any) => <StatusBadge key={String(item.id)} value={String(item.id).replaceAll('_', ' ')} />)}
              {!pinned.length ? <StatusBadge value="recommended layout" /> : null}
            </div>
          </FocusSurface>
        </WorkspaceColumn>
      </section>
    </WorkspaceStack>
  )
}

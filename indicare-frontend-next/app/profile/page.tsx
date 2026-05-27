import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { ConnectSurface, ContextSurface, NotificationSurface, ProfileHeroSurface, WorkspaceStack } from '@/components/indicare/operational-surfaces'
import { EmptyState, RecordTimeline, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getWorkspaceBundle, recordTitle, text } from '@/lib/os-api/bundles'

export default async function ProfilePage() {
  const result = await getWorkspaceBundle()
  const bundle = result.data
  const identity = bundle.identity || {}
  const name = text(identity, ['display_name', 'preferred_name', 'email'], 'My profile')
  const layout = (bundle.preferences?.layout as Array<{ id: string; pinned?: boolean; locked?: boolean }> | undefined) || []

  return (
    <WorkspaceStack>
      <ProfileHeroSurface
        name={name}
        subtitle="Your adult identity, profile preferences and operational workspace settings."
        avatar={text(identity, ['avatar_url'], '')}
        details={[
          text(identity, ['role'], 'role not returned'),
          text(bundle.home, ['name', 'home_name'], identity.home_id ? `Home ${identity.home_id}` : 'home not returned'),
          text(identity, ['email'], 'email not returned')
        ]}
      />
      <LiveDataStatus result={result} />

      <section className="grid gap-6 xl:grid-cols-2">
        <ContextSurface>
          <SectionHeader eyebrow="About me" title="Professional identity" description="Missing profile fields remain honest editable gaps." />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['Short bio', text(identity, ['profile_notes'], 'No bio has been returned yet.')],
              ['Professional strengths', text(bundle.preferences, ['professional_strengths'], 'No strengths have been returned yet.')],
              ['Therapeutic approach', text(bundle.preferences, ['therapeutic_approach'], 'No approach summary has been returned yet.')],
              ['Status', text(identity, ['status'], 'No status has been returned yet.')]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </ContextSurface>

        <ContextSurface>
          <SectionHeader eyebrow="Pinned workspace" title="Preferences" description="Dashboard preferences are schema-backed and critical safety widgets cannot be hidden." />
          <div className="flex flex-wrap gap-2">
            {layout.filter((item) => item.pinned !== false).map((item) => (
              <StatusBadge key={item.id} value={`${item.id.replaceAll('_', ' ')}${item.locked ? ' locked' : ''}`} />
            ))}
            {!layout.length ? <StatusBadge value="recommended layout" /> : null}
          </div>
        </ContextSurface>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ConnectSurface unread={bundle.connect.unread_count}>
          {bundle.connect.recent_threads.length ? (
            <div className="space-y-3">
              {bundle.connect.recent_threads.slice(0, 4).map((thread) => (
                <Link key={String(thread.id)} href={`/connect/${encodeURIComponent(String(thread.id))}`} className="block rounded-2xl bg-white/80 p-4 text-sm font-black text-slate-700">
                  {recordTitle(thread, 'Connect thread')}
                </Link>
              ))}
            </div>
          ) : <EmptyState title="No Connect activity returned" description="Real Connect presence and unread activity will appear here when available." />}
        </ConnectSurface>

        <NotificationSurface unread={bundle.notifications.unread_count}>
          {bundle.notifications.items.length ? (
            <div className="space-y-3">
              {bundle.notifications.items.slice(0, 4).map((item, index) => (
                <article key={String(item.id || index)} className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-sm font-black text-slate-950">{recordTitle(item, 'Notification')}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text(item, ['message', 'body', 'summary'], 'No detail returned.')}</p>
                </article>
              ))}
            </div>
          ) : <EmptyState title="No profile notifications" description="Unread notifications will appear when live records need your attention." />}
        </NotificationSurface>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ContextSurface>
          <SectionHeader eyebrow="Recent activity" title="Records and activity" />
          <RecordTimeline items={(bundle.recent_chronology || []).map((item, index) => ({
            id: String(item.id || index),
            title: recordTitle(item, 'Activity'),
            date: String(item.created_at || item.event_datetime || ''),
            body: text(item, ['summary', 'body', 'description'], 'No summary returned.')
          }))} />
        </ContextSurface>
        <ContextSurface>
          <SectionHeader eyebrow="Key children" title="Visible children" />
          {bundle.children.visible.length ? (
            <div className="space-y-3">
              {bundle.children.visible.slice(0, 6).map((child) => (
                <Link key={String(child.id)} href={`/children/${encodeURIComponent(String(child.id))}`} className="block rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">
                  {text(child, ['preferred_name', 'first_name', 'display_name'], 'Young person')}
                </Link>
              ))}
            </div>
          ) : <EmptyState title="No visible children returned" description="Assigned or key children will appear here when live allocation data exists." />}
        </ContextSurface>
      </section>
    </WorkspaceStack>
  )
}

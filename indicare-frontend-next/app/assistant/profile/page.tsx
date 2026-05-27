import { StandaloneAssistantShell } from '@/lib/standalone-assistant/assistant-shell'
import { assistantBrains } from '@/lib/standalone-assistant/config'
import { getProviderSettings } from '@/lib/os-api/platform'

export default async function AssistantProfilePage() {
  const settings = await getProviderSettings()
  const account = settings.data.account || {}
  const profile = (account.profile || {}) as Record<string, any>
  const user = (account.user || {}) as Record<string, any>
  const identity = [
    `Name: ${profile.display_name || user.email || 'Not returned'}`,
    `Role: ${profile.role_title || user.role || 'Not returned'}`,
    `Home: ${user.home_id || 'Not returned'}`,
    `Provider: ${user.provider_id || 'Not returned'}`
  ]
  const assistant = [
    `Default mode: ${profile.assistant_default_mode || 'Not returned'}`,
    `Tone: ${profile.assistant_tone || 'Not returned'}`,
    `Operational focus: ${profile.operational_focus || 'Not saved yet'}`,
    'Standalone assistant remains separate from live OS retrieval unless a scoped workflow opens it.'
  ]

  return (
    <StandaloneAssistantShell eyebrow="Standalone profile" title="Assistant profile" subtitle="Live account preferences for Assistant / ORB. Operational truth still comes from chronology and evidence, not generated memory.">
      <section className="grid gap-5 lg:grid-cols-2">
        <ProfileCard title="Identity" items={identity} />
        <ProfileCard title="Assistant preferences" items={assistant} />
        <ProfileCard title="Brains" items={assistantBrains.map((brain) => `${brain.name}: ${brain.description}`)} />
        <ProfileCard title="Accessibility" items={['Readable spacing', 'Keyboard friendly controls', 'Reduced clutter', 'Light/dark compatible']} />
      </section>
    </StandaloneAssistantShell>
  )
}

function ProfileCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <h2 className="text-2xl font-black tracking-[-0.05em]">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </article>
  )
}

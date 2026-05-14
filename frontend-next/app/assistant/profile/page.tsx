import { StandaloneAssistantShell } from '@/lib/standalone-assistant/assistant-shell'
import { assistantBrains } from '@/lib/standalone-assistant/config'

export default function AssistantProfilePage() {
  return (
    <StandaloneAssistantShell eyebrow="Standalone profile" title="Assistant profile" subtitle="Profile preferences for IndiCare Assistant only; separate from IndiCare OS settings.">
      <section className="grid gap-5 lg:grid-cols-2">
        <ProfileCard title="Identity" items={['Name: Your assistant profile', 'Role: Children homes professional', 'Sector experience: Intermediate', 'Response style: Professional and concise']} />
        <ProfileCard title="Voice" items={['Preferred voice: Calm', 'Captions: Optional', 'Wake phrase: Hey IndiCare', 'Voice session: Standalone assistant only']} />
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

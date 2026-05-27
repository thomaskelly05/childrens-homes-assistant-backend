import { StandaloneAssistantShell } from '@/lib/standalone-assistant/assistant-shell'

const settings = [
  ['AI privacy', 'No external AI training; minimise prompts and avoid raw prompt production logs unless explicitly enabled.'],
  ['Voice settings', 'Standalone voice sessions, captions, preferred voice and interruption controls.'],
  ['Memory settings', 'Standalone conversation and project memory only; no OS Orb memory sharing.'],
  ['Upload privacy', 'Safe filenames, max size checks, source classification and no public exposure.'],
  ['Data controls', 'Export and delete placeholders for assistant projects, files and conversations.'],
  ['Theme and accessibility', 'Light/dark compatibility, keyboard access, readable spacing and reduced motion support.'],
  ['App preferences', 'Choose default app, default brain and workspace shortcuts.']
]

export default function AssistantSettingsPage() {
  return (
    <StandaloneAssistantShell eyebrow="Standalone settings" title="Assistant settings" subtitle="Controls for the standalone product only. OS settings remain separate.">
      <section className="grid gap-4 md:grid-cols-2">
        {settings.map(([title, description]) => (
          <article key={title} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <h2 className="text-2xl font-black tracking-[-0.05em]">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">{description}</p>
            <button type="button" className="mt-5 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-white/10 dark:text-white">
              Configure
            </button>
          </article>
        ))}
      </section>
    </StandaloneAssistantShell>
  )
}

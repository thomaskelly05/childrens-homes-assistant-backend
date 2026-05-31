'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Link2 } from 'lucide-react'

import {
  ORB_KNOWLEDGE_BUILTIN_TABS,
  askOrbAboutResourcePrompt,
  builtinResourcesForTab,
  type OrbKnowledgeBuiltinTab
} from '@/lib/orb/orb-knowledge-builtin'

export function OrbKnowledgeBuiltinPanel({
  onAskOrb,
  onUseInAnswer,
  authBlocked
}: {
  onAskOrb: (prompt: string) => void
  onUseInAnswer?: (title: string) => void
  authBlocked?: boolean
}) {
  const [tab, setTab] = useState<OrbKnowledgeBuiltinTab>('official')
  const resources = useMemo(() => builtinResourcesForTab(tab), [tab])

  return (
    <div className="space-y-4" data-orb-knowledge-builtin>
      {authBlocked ? (
        <div
          className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          data-orb-knowledge-auth-blocked
        >
          <p className="font-semibold">Reconnect to continue</p>
          <p className="mt-1 text-xs text-amber-100/80">Your session may have expired.</p>
          <a
            href="/orb/login?returnUrl=/orb"
            className="mt-2 inline-flex rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            Sign in again
          </a>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1" data-orb-knowledge-builtin-tabs>
        {ORB_KNOWLEDGE_BUILTIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${
              tab === t.id
                ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/30'
                : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]'
            }`}
            data-orb-knowledge-builtin-tab={t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'uploaded' || tab === 'saved' ? (
        <div className="orb-station-empty-state rounded-xl border border-[var(--orb-line)] p-4" data-orb-knowledge-tab-empty>
          <p className="text-sm font-medium text-[var(--orb-foreground)]">
            {tab === 'uploaded' ? 'No uploaded documents yet' : 'No saved sources yet'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]">
            {tab === 'uploaded'
              ? 'Upload guidance or policies in Documents, or add a source when your account is connected.'
              : 'Save sources from chat answers to build your personal reference library.'}
          </p>
        </div>
      ) : resources.length === 0 ? (
        <p className="text-xs text-[var(--orb-muted)]">No resources in this category.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2" data-orb-knowledge-builtin-cards>
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="orb-doc-glass-card flex flex-col rounded-xl border border-[var(--orb-line)] p-3"
              data-orb-knowledge-resource={resource.id}
            >
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400/80" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--orb-foreground)]">{resource.title}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">{resource.sourceType}</p>
                  <span
                    className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      resource.status === 'official'
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : resource.status === 'needs_connection'
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-sky-500/15 text-sky-200'
                    }`}
                  >
                    {resource.status === 'built-in' ? 'Built-in' : resource.status === 'official' ? 'Official' : 'Needs connection'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[10px] font-semibold text-cyan-100 ring-1 ring-cyan-400/25 hover:bg-cyan-500/25"
                  onClick={() => onAskOrb(askOrbAboutResourcePrompt(resource.title))}
                  data-orb-knowledge-ask
                >
                  Ask ORB about this
                </button>
                {onUseInAnswer ? (
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--orb-line)] px-2.5 py-1 text-[10px] font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
                    onClick={() => onUseInAnswer(resource.title)}
                  >
                    Use in answer
                  </button>
                ) : null}
                {resource.status === 'needs_connection' ? (
                  <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-amber-200/90">
                    <Link2 className="h-3 w-3" aria-hidden />
                    Connect source
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

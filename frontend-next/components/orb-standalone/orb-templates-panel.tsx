'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'

import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  ORB_TEMPLATE_FALLBACK_CATEGORIES,
  filterFallbackTemplates,
  templateImmediatePrompt
} from '@/lib/orb/orb-templates-fallback'
import {
  isOrbStationAuthError,
  OrbStationAuthError,
  OrbStationEmptyState,
  OrbStationReconnectBanner,
  shouldBlockStationForAuth
} from '@/components/orb-standalone/orb-station-panel-states'
import {
  fetchOrbTemplateCategories,
  fetchOrbTemplates,
  generateOrbTemplate,
  type OrbTemplateSummary
} from '@/lib/orb/orb-billing-client'

const FALLBACK_CATEGORIES = [...ORB_TEMPLATE_FALLBACK_CATEGORIES]

const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  care_planning: 'Care planning',
  learning_academy: 'Learning',
  risk_assessment: 'Risk assessment',
  safeguarding: 'Safeguarding',
  recording: 'Recording',
  ofsted: 'Ofsted / SCCIF',
  sccif: 'Ofsted / SCCIF',
  leadership: 'Leadership / RI',
  supervision: 'Supervision',
  locality: 'Locality',
  learning: 'Learning'
}


const FEATURED_TEMPLATE_TITLES = [
  'Safeguarding concern record',
  'Missing from care return conversation',
  'Exploitation risk screening',
  'Contextual safeguarding assessment',
  'LADO referral preparation',
  'Daily log rewrite',
  'Incident debrief',
  'Physical intervention/restraint record',
  'Reg 44 visit summary',
  'Reg 45 quality review',
  'Staff supervision reflection',
  'Manager oversight note'
] as const

function isFeaturedTemplate(title: string): boolean {
  const lower = title.trim().toLowerCase()
  return FEATURED_TEMPLATE_TITLES.some((item) => lower.includes(item.toLowerCase()))
}

function friendlyCategoryLabel(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (TEMPLATE_CATEGORY_LABELS[key]) return TEMPLATE_CATEGORY_LABELS[key]
  if (/[a-z]+_[a-z]/.test(key)) {
    return key
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }
  return raw
    .replace(/\bOfsted\b/gi, 'Ofsted / SCCIF')
    .replace(/SCCIF/gi, 'Ofsted / SCCIF')
    .replace(/\s+/g, ' ')
    .trim()
}

export function OrbTemplatesPanel({
  open,
  onClose,
  onUseTemplate,
  residentialSurface = false,
  sessionReady = true
}: {
  open: boolean
  onClose: () => void
  onUseTemplate?: (prompt: string, template: OrbTemplateSummary) => void
  residentialSurface?: boolean
  sessionReady?: boolean
}) {
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<OrbTemplateSummary[]>([])
  const [selected, setSelected] = useState<OrbTemplateSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cats = await fetchOrbTemplateCategories().catch(() => [])
      if (cats.length) {
        setCategories(cats.map((c) => friendlyCategoryLabel(c.name || c.id)))
      }
      const list = await fetchOrbTemplates({ category: category || undefined, search: search || undefined })
      if (list.length) {
        setTemplates(list)
      } else {
        setTemplates(filterFallbackTemplates({ category: category || undefined, search: search || undefined }))
        setError(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Template library unavailable.'
      if (isOrbStationAuthError(message)) {
        setError(message)
        setTemplates(filterFallbackTemplates({ category: category || undefined, search: search || undefined }))
      } else {
        setTemplates(filterFallbackTemplates({ category: category || undefined, search: search || undefined }))
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  function buildImmediatePrompt(template: OrbTemplateSummary): string {
    return templateImmediatePrompt(template.title, {
      category: template.category,
      description: template.description
    })
  }

  async function handleUseTemplate(template: OrbTemplateSummary) {
    const prompt = buildImmediatePrompt(template)
    onUseTemplate?.(prompt, template)
    onClose()
    if (!template.id.startsWith('fallback-') && sessionReady) {
      setGenerating(true)
      try {
        await generateOrbTemplate({ template_id: template.id, context: '' })
      } catch {
        // Chat generation uses immediate prompt; API prefill is optional.
      } finally {
        setGenerating(false)
      }
    }
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Templates"
      subtitle="Choose a template, then ORB helps you adapt it."
      onClose={onClose}
      panelId="templates"
      ariaLabel="ORB template library"
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <div className="orb-templates-panel space-y-4 p-4" data-orb-templates-panel>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--orb-muted)]" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load()
            }}
            placeholder="Search templates…"
            className="w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] py-2.5 pl-10 pr-4 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !category
                ? 'border border-[var(--orb-line)] bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                category === cat
                  ? 'border border-[var(--orb-line)] bg-[var(--orb-surface-hover)] text-[var(--orb-foreground)]'
                  : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {error && shouldBlockStationForAuth(sessionReady, error) ? (
          <OrbStationAuthError detail={error} />
        ) : error && isOrbStationAuthError(error) ? (
          <OrbStationReconnectBanner onRefresh={() => void load()} />
        ) : error ? (
          <p className="text-sm text-amber-400/90">{error}</p>
        ) : null}

        {loading && !templates.length ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" aria-label="Loading templates" />
          </div>
        ) : null}

        {!loading && templates.length === 0 && !isOrbStationAuthError(error) ? (
          <OrbStationEmptyState
            title="No templates match your search"
            body="Try another category or search term."
          />
        ) : null}

        <ul
          className="grid max-h-[min(52vh,28rem)] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2"
          data-orb-templates-card-grid
        >
          {[...templates]
            .sort((a, b) => {
              const af = isFeaturedTemplate(a.title) ? 0 : 1
              const bf = isFeaturedTemplate(b.title) ? 0 : 1
              return af - bf
            })
            .map((tpl) => (
            <li key={tpl.id}>
              <article
                className={`orb-doc-glass-card orb-template-card flex h-full flex-col rounded-xl border px-4 py-3 transition ${
                  selected?.id === tpl.id
                    ? 'border-sky-400/40 bg-[var(--orb-surface-hover)] ring-1 ring-sky-400/20'
                    : 'border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] hover:border-sky-400/25'
                }`}
                data-orb-template-card={tpl.id}
                data-orb-template-item={tpl.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--orb-foreground)]">{tpl.title}</p>
                  {tpl.category ? (
                    <span className="shrink-0 rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--orb-muted)]">
                      {friendlyCategoryLabel(tpl.category)}
                    </span>
                  ) : null}
                </div>
                {tpl.description ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--orb-muted)]">
                    {tpl.description}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-[var(--orb-muted)]">Start with ORB to adapt this template.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => void handleUseTemplate(tpl)}
                    className="rounded-lg bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                    data-orb-use-template
                  >
                    Use template
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(tpl)}
                    className="rounded-lg border border-[var(--orb-line)] px-3 py-1.5 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
                    data-orb-template-preview
                  >
                    Preview
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {selected ? (
          <div className="orb-doc-glass-card rounded-xl border border-[var(--orb-line)] p-4">
            <p className="text-sm font-semibold text-[var(--orb-foreground)]">{selected.title}</p>
            <p className="mt-1 text-xs text-[var(--orb-muted)]">
              ORB will help you complete this template in chat with child-centred, inspection-ready wording.
            </p>
            <button
              type="button"
              disabled={generating}
              onClick={() => void handleUseTemplate(selected)}
              className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 disabled:opacity-60"
              data-orb-use-template
            >
              {generating ? 'Generating…' : 'Use template'}
            </button>
          </div>
        ) : null}
      </div>
    </OrbStandalonePanelShell>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import {
  OrbPremiumButton,
  OrbPremiumEmptyState,
  OrbPremiumPage,
  OrbPremiumPill,
  OrbPremiumToolbar
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
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
  OrbRecordingLibraryCards,
  type OrbRecordingLibraryAction
} from '@/components/orb/recording/OrbRecordingLibraryCards'
import {
  fetchOrbTemplateCategories,
  fetchOrbTemplates,
  generateOrbTemplate,
  type OrbTemplateSummary
} from '@/lib/orb/orb-billing-client'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'

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
  onRecordingAction,
  residentialSurface = false,
  sessionReady = true
}: {
  open: boolean
  onClose: () => void
  onUseTemplate?: (prompt: string, template: OrbTemplateSummary) => void
  onRecordingAction?: (action: OrbRecordingLibraryAction, recordType: OrbRecordingRecordType) => void
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
  const [recordingPreview, setRecordingPreview] = useState<OrbRecordingRecordType | null>(null)

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
      subtitle="Recording library and prompt templates — start in Dictate, ORB Write or chat."
      onClose={onClose}
      panelId="templates"
      ariaLabel="ORB template library"
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <OrbPremiumPage
        panelId="templates"
        toolbar={
          <OrbPremiumToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search templates and record types…"
            onSearchSubmit={() => void load()}
            filters={
              <>
                <OrbPremiumPill active={!category} onClick={() => setCategory('')}>
                  All
                </OrbPremiumPill>
                {categories.map((cat) => (
                  <OrbPremiumPill key={cat} active={category === cat} onClick={() => setCategory(cat)}>
                    {cat}
                  </OrbPremiumPill>
                ))}
              </>
            }
          />
        }
        className="orb-templates-panel"
      >
        <section data-orb-recording-library-section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--orb-foreground)]">Recording library</h3>
          <p className="mb-3 text-xs text-[var(--orb-muted)]">
            Structured residential record types shared across Dictate, Write and Documents.
          </p>
          <OrbRecordingLibraryCards
            search={search}
            onAction={(action, recordType) => {
              if (action === 'preview') {
                setRecordingPreview(recordType)
                return
              }
              onRecordingAction?.(action, recordType)
            }}
          />
        </section>

        {recordingPreview ? (
          <div className="orb-premium-card rounded-2xl border border-[var(--orb-line)] p-4" data-orb-recording-structure-preview>
            <p className="text-sm font-semibold">{recordingPreview.label} — structure</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--orb-muted)]">
              {recordingPreview.final_document_headings.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Prompt templates</h3>

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
          <OrbPremiumEmptyState
            title="No templates found"
            body="Try another category or search term."
            dataAttr="templates-empty"
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
                  <OrbPremiumButton
                    disabled={generating}
                    onClick={() => void handleUseTemplate(tpl)}
                    className="px-3 py-1.5 text-xs"
                    data-orb-use-template
                  >
                    {ORB_PREMIUM_ACTION_LABELS.useTemplate}
                  </OrbPremiumButton>
                  <OrbPremiumButton
                    variant="secondary"
                    onClick={() => setSelected(tpl)}
                    className="px-3 py-1.5 text-xs"
                    data-orb-template-preview
                  >
                    {ORB_PREMIUM_ACTION_LABELS.previewStructure}
                  </OrbPremiumButton>
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
            <OrbPremiumButton
              disabled={generating}
              onClick={() => void handleUseTemplate(selected)}
              fullWidth
              className="mt-3"
              data-orb-use-template
            >
              {generating ? 'Generating…' : ORB_PREMIUM_ACTION_LABELS.useTemplate}
            </OrbPremiumButton>
          </div>
        ) : null}
      </OrbPremiumPage>
    </OrbStandalonePanelShell>
  )
}

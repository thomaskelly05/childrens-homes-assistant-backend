'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, Star } from 'lucide-react'

import { OrbGlassCard } from '@/components/orb-residential/ui/orb-glass-card'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import {
  exportOrbTemplate,
  fetchOrbTemplateCategories,
  fetchOrbTemplates,
  generateOrbTemplate,
  type OrbTemplateSummary
} from '@/lib/orb/orb-templates-client'

const FALLBACK_CATEGORIES = [
  'Safeguarding',
  'Recording',
  'Care Planning',
  'Ofsted / SCCIF',
  'Leadership / RI',
  'Staff / Supervision',
  'Locality',
  'Learning'
]

export function OrbTemplatesScreen() {
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<OrbTemplateSummary[]>([])
  const [selected, setSelected] = useState<OrbTemplateSummary | null>(null)
  const [context, setContext] = useState('')
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cats = await fetchOrbTemplateCategories().catch(() => [])
      if (cats.length) {
        setCategories(cats.map((c) => c.name || c.id))
      }
      const list = await fetchOrbTemplates({ category: category || undefined, search: search || undefined })
      setTemplates(list)
    } catch {
      setError('Template library unavailable. Check you are signed in.')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    void load()
  }, [load])

  async function handleGenerate() {
    if (!selected) return
    setLoading(true)
    try {
      const result = (await generateOrbTemplate({
        template_id: selected.id,
        context
      })) as { data?: { content?: string }; content?: string }
      const content =
        (result as { data?: { content?: string } }).data?.content ||
        (result as { content?: string }).content ||
        JSON.stringify(result, null, 2)
      setGenerated(content)
    } catch {
      setError('Generate failed for this template.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExport(format: 'pdf' | 'docx') {
    if (!generated) return
    try {
      const response = await exportOrbTemplate(format, { content: generated, title: selected?.title })
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected?.title || 'template'}.${format === 'pdf' ? 'pdf' : 'docx'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(`Export ${format.toUpperCase()} unavailable.`)
    }
  }

  return (
    <OrbShell>
      <div className="py-6" data-orb-templates>
        <Link href="/orb" className="text-xs text-slate-500 hover:text-sky-300">
          ← ORB home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-white">Template Library</h1>
        <p className="mt-2 text-sm text-slate-400">Search, filter and generate professional templates.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-4 text-white"
            />
          </div>
          <OrbButton variant="secondary" onClick={() => void load()}>
            Search
          </OrbButton>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${!category ? 'bg-sky-500/30 text-white' : 'bg-white/[0.06] text-slate-400'}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                category === cat ? 'bg-sky-500/30 text-white' : 'bg-white/[0.06] text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {loading && !templates.length ? (
              <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
            ) : null}
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelected(tpl)}
                className={`w-full text-left ${selected?.id === tpl.id ? 'ring-2 ring-sky-400/50 rounded-3xl' : ''}`}
              >
                <OrbGlassCard>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{tpl.title}</p>
                      {tpl.category ? <p className="mt-1 text-xs text-slate-500">{tpl.category}</p> : null}
                    </div>
                    {tpl.favourite ? <Star className="h-4 w-4 text-amber-400" /> : null}
                  </div>
                  {tpl.description ? <p className="mt-2 text-sm text-slate-400">{tpl.description}</p> : null}
                </OrbGlassCard>
              </button>
            ))}
            {!loading && templates.length === 0 ? (
              <p className="text-sm text-slate-500">No templates found. Try another category or sign in.</p>
            ) : null}
          </div>

          <OrbGlassCard>
            <h2 className="text-lg font-semibold text-white">{selected?.title || 'Select a template'}</h2>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              placeholder="Add context for generation…"
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <OrbButton onClick={() => void handleGenerate()} disabled={!selected || loading}>
                Generate
              </OrbButton>
              <OrbButton variant="secondary" onClick={() => void handleExport('pdf')} disabled={!generated}>
                Export PDF
              </OrbButton>
              <OrbButton variant="secondary" onClick={() => void handleExport('docx')} disabled={!generated}>
                Export DOCX
              </OrbButton>
            </div>
            {generated ? (
              <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs text-slate-300">
                {generated}
              </pre>
            ) : null}
          </OrbGlassCard>
        </div>
      </div>
    </OrbShell>
  )
}

'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

import { OrbInputPanel } from '@/components/orb-residential/ui/orb-input-panel'
import { OrbResultCard, type OrbResultAccent } from '@/components/orb-residential/ui/orb-result-card'
import { OrbShell } from '@/components/orb-residential/ui/orb-shell'
import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import {
  analyseOrbStandaloneDocument,
  uploadOrbStandaloneDocument,
  type OrbDocumentUnderstanding
} from '@/lib/orb/standalone-client'

const DOC_TYPES = [
  'Daily record',
  'Incident',
  'Care plan',
  'Risk assessment',
  'Chronology',
  'Supervision'
]

type ReviewSection = { title: string; body: string; accent: OrbResultAccent }

function mapArray<T, R>(value: unknown, mapper: (item: T, index: number) => R): R[] {
  return Array.isArray(value) ? (value as T[]).map(mapper) : []
}

function sectionsFromUnderstanding(u: OrbDocumentUnderstanding): ReviewSection[] {
  const evalObj = (u.evaluation ?? {}) as Record<string, unknown>
  const fromEval = (key: string) => {
    const v = evalObj[key]
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.map(String).join('\n')
    if (v && typeof v === 'object' && 'summary' in (v as object)) return String((v as { summary: string }).summary)
    return ''
  }

  const sections: ReviewSection[] = [
    { title: 'Overall View', body: u.plain_english_summary || fromEval('overall_view'), accent: 'default' },
    {
      title: 'What is Strong',
      body:
        fromEval('strengths') ||
        mapArray<{ point?: string }, string>(u.important_points, (p) => String(p.point ?? ''))
          .filter(Boolean)
          .join('\n') ||
        '',
      accent: 'blue'
    },
    {
      title: 'What is Missing',
      body:
        mapArray<{ gap?: string }, string>(u.gaps_or_missing_information, (g) => String(g.gap ?? ''))
          .filter(Boolean)
          .join('\n') || fromEval('gaps'),
      accent: 'default'
    },
    { title: 'Child Voice', body: fromEval('child_voice'), accent: 'teal' },
    {
      title: 'Safeguarding',
      body:
        mapArray<{ risk?: string }, string>(u.risks_or_concerns, (r) => String(r.risk ?? ''))
          .filter(Boolean)
          .join('\n') || fromEval('safeguarding'),
      accent: 'amber'
    },
    { title: 'Professional Curiosity', body: fromEval('professional_curiosity'), accent: 'default' },
    { title: 'Recording Quality', body: fromEval('recording_quality'), accent: 'default' },
    {
      title: 'Evidence of Impact',
      body:
        fromEval('impact') ||
        mapArray<{ implication?: string }, string>(u.practice_implications, (p) => String(p.implication ?? ''))
          .filter(Boolean)
          .join('\n') ||
        '',
      accent: 'blue'
    },
    { title: 'Leadership / RI Oversight', body: fromEval('leadership'), accent: 'default' },
    { title: 'Ofsted / SCCIF Lens', body: fromEval('ofsted'), accent: 'purple' },
    { title: 'Outstanding Practice', body: fromEval('outstanding'), accent: 'gold' },
    {
      title: 'Suggested Improvements',
      body:
        mapArray<{ question?: string }, string>(u.suggested_questions, (q) => `• ${q.question ?? ''}`)
          .filter(Boolean)
          .join('\n') || fromEval('improvements'),
      accent: 'default'
    }
  ]

  return sections.filter((s) => s.body.trim())
}

export function OrbReviewScreen() {
  const [text, setText] = useState('')
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sections, setSections] = useState<ReviewSection[]>([])

  const runReview = useCallback(async () => {
    const body = text.trim()
    if (!body) {
      setError('Paste or upload text to review.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await analyseOrbStandaloneDocument({
        mode: 'full_review',
        title: docType,
        text: body
      })
      setSections(sectionsFromUnderstanding(result.understanding))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setLoading(false)
    }
  }, [docType, text])

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
      const uploaded = await uploadOrbStandaloneDocument({
        title: file.name,
        content_base64: btoa(binary),
        file_name: file.name,
        content_type: file.type || 'application/octet-stream'
      })
      const result = await analyseOrbStandaloneDocument({
        mode: 'full_review',
        source_id: uploaded.source_id,
        title: docType
      })
      setSections(sectionsFromUnderstanding(result.understanding))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OrbShell>
      <div className="mx-auto max-w-3xl py-6" data-orb-review>
        <Link href="/orb" className="text-xs text-slate-500 hover:text-sky-300">
          ← ORB home
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-white">Review This</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Paste a record, incident, care plan, risk assessment, chronology or supervision and ORB will review it through
          safeguarding, child voice, impact, leadership and Ofsted lenses.
        </p>

        <div className="mt-8">
        <OrbInputPanel>
          <label className="block text-sm text-slate-300">
            Document type
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Paste text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white"
              placeholder="Paste your record here…"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            Upload document
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              className="mt-2 block w-full text-sm text-slate-400"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <OrbButton className="mt-6 w-full" onClick={() => void runReview()} disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reviewing…
              </span>
            ) : (
              'Review with ORB'
            )}
          </OrbButton>
        </OrbInputPanel>
        </div>

        {sections.length > 0 ? (
          <div className="mt-8 space-y-4">
            {sections.map((section) => (
              <OrbResultCard key={section.title} title={section.title} accent={section.accent}>
                <p className="whitespace-pre-wrap">{section.body}</p>
              </OrbResultCard>
            ))}
          </div>
        ) : null}
      </div>
    </OrbShell>
  )
}

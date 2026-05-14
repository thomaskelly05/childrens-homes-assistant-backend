'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, Save, Sparkles, Wand2 } from 'lucide-react'

import { extractSuggestedLinks, type RecordingField, type RecordingWorkflow } from '@/lib/child-journey/workflows'

type SaveResponse = {
  ok: boolean
  status?: 'saved' | 'draft'
  recordId?: string
  sourceType?: string
  routeType?: string
  message?: string
  limitation?: string
  error?: string
}

function fieldInitialValue(field: RecordingField) {
  if (field.type === 'checkbox') return 'No'
  if (field.type === 'date') return new Date().toISOString().slice(0, 10)
  return ''
}

function FieldControl({
  field,
  value,
  onChange
}: {
  field: RecordingField
  value: string
  onChange: (value: string) => void
}) {
  const baseClass = 'mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100'

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={field.rows || 4}
        required={field.required}
        placeholder={field.placeholder}
        className={`${baseClass} resize-y leading-6`}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} required={field.required} className={baseClass}>
        <option value="">Choose...</option>
        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <label className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={value === 'Yes'}
          onChange={(event) => onChange(event.target.checked ? 'Yes' : 'No')}
          className="h-4 w-4 rounded border-slate-300"
        />
        Yes
      </label>
    )
  }

  return (
    <input
      type={field.type || 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
      placeholder={field.placeholder}
      className={baseClass}
    />
  )
}

export function RecordingForm({
  childId,
  childName,
  workflow
}: {
  childId: string
  childName: string
  workflow: RecordingWorkflow
}) {
  const router = useRouter()
  const initialValues = useMemo(() => {
    const values: Record<string, string> = {}
    workflow.sections.forEach((section) => {
      section.fields.forEach((field) => {
        values[field.name] = fieldInitialValue(field)
      })
    })
    return values
  }, [workflow])
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const suggestions = useMemo(() => extractSuggestedLinks(values), [values])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitting) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, submitting])

  function updateField(name: string, nextValue: string) {
    setDirty(true)
    setValues((current) => ({ ...current, [name]: nextValue }))
  }

  function cancel() {
    if (!dirty || window.confirm('Leave this form? Unsaved changes will be lost.')) {
      router.push(`/young-people/${encodeURIComponent(childId)}/journey`)
    }
  }

  function draftWithOrb() {
    const primaryField = workflow.primaryField
    if (!primaryField) return
    const current = values[primaryField]
    const draft = `${childName} was supported by staff today. Staff should replace this Orb draft with the adult's own observations, the child's voice, what support was offered, and any follow-up needed.`
    updateField(primaryField, current ? `${current}\n\n${draft}` : draft)
    setNotice('Orb draft inserted. Please review, edit and confirm before saving.')
  }

  function improveWording() {
    const primaryField = workflow.primaryField
    if (!primaryField || !values[primaryField]) {
      setNotice('Add some wording first, then use Improve wording.')
      return
    }
    updateField(primaryField, `${values[primaryField]}\n\nChild-centred check: describe what ${childName} experienced, what ${childName} said or showed, and how staff responded.`)
    setNotice('Child-centred wording prompt added. Review before saving.')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch('/api/recording', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          workflowId: workflow.id,
          values,
          suggestions
        })
      })
      const payload = (await response.json().catch(() => ({}))) as SaveResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || 'The record could not be saved. Check required fields and try again.')
      }
      setDirty(false)
      const params = new URLSearchParams({
        saved: payload.routeType || workflow.id,
        status: payload.status || 'saved'
      })
      if (payload.recordId) params.set('recordId', payload.recordId)
      if (payload.limitation) params.set('limitation', payload.limitation)
      router.push(`/young-people/${encodeURIComponent(childId)}/journey?${params.toString()}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The record could not be saved. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {notice ? (
        <div className="rounded-[24px] border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-bold leading-6 text-blue-800">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[24px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-purple-100 bg-purple-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-700">Orb support</p>
            <h2 className="mt-1 text-xl font-black text-purple-950">Orb can draft, but staff confirm before saving.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={draftWithOrb} className="rounded-2xl bg-purple-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-purple-950/20"><Sparkles className="mr-2 inline h-4 w-4" aria-hidden />Draft with Orb</button>
            <button type="button" onClick={() => setNotice('Dictation opens through Orb voice. For now, paste dictated text into the form before saving.')} className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-black text-purple-800"><Mic className="mr-2 inline h-4 w-4" aria-hidden />Dictate with Orb</button>
            <button type="button" onClick={improveWording} className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-black text-purple-800"><Wand2 className="mr-2 inline h-4 w-4" aria-hidden />Improve wording</button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {workflow.sections.map((section) => (
            <section key={section.title} className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
              <div className="mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  {section.badge ? <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{section.badge}</span> : null}
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{section.title}</h2>
                </div>
                {section.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{section.description}</p> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => {
                  const wide = field.type === 'textarea' || field.name === workflow.primaryField
                  return (
                    <label key={field.name} className={wide ? 'block md:col-span-2' : 'block'}>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {field.label}{field.required ? ' *' : ''}
                      </span>
                      <FieldControl field={field} value={values[field.name] || ''} onChange={(value) => updateField(field.name, value)} />
                      {field.helper ? <span className="mt-1 block text-xs leading-5 text-slate-500">{field.helper}</span> : null}
                    </label>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Suggested links</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Review before saving</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Deterministic suggestions from the words in this record. They do not save without your confirmation.</p>
            <div className="mt-4 space-y-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.label} className={`rounded-2xl border px-4 py-3 text-sm ${
                  suggestion.tone === 'red'
                    ? 'border-red-100 bg-red-50 text-red-800'
                    : suggestion.tone === 'amber'
                      ? 'border-amber-100 bg-amber-50 text-amber-800'
                      : suggestion.tone === 'emerald'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                        : suggestion.tone === 'purple'
                          ? 'border-purple-100 bg-purple-50 text-purple-800'
                          : 'border-blue-100 bg-blue-50 text-blue-800'
                }`}>
                  <strong className="block font-black">{suggestion.label}</strong>
                  <span className="mt-1 block text-xs leading-5">{suggestion.reason}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Quiet regulatory mapping</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {workflow.regulatoryBadges.map((badge) => (
                <span key={badge} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600">{badge}</span>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_16px_46px_rgba(15,23,42,0.14)]">
            <h2 className="text-xl font-black">Ready to save?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">This will link the record to {childName}, create the live source record where supported, and return to the journey.</p>
            <div className="mt-5 grid gap-2">
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
                <Save className="mr-2 h-4 w-4" aria-hidden />
                {submitting ? 'Saving...' : 'Save record'}
              </button>
              <button type="button" onClick={cancel} className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">
                Cancel
              </button>
            </div>
          </section>

          <Link href={`/young-people/${encodeURIComponent(childId)}/journey`} className="block rounded-[24px] border border-slate-200 bg-white p-4 text-center text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            Back to {childName}&apos;s journey
          </Link>
        </aside>
      </div>
    </form>
  )
}

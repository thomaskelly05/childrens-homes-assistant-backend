'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronDown, Link2, MessageSquareHeart, Save, Sparkles, Wand2 } from 'lucide-react'
import { WorkflowSaveIndicator } from '@/components/system-feedback/workflow-save-indicator'
import { getCsrfToken } from '@/lib/auth/api'
import { getSafeDraft, removeSafeDraft, setSafeDraft } from '@/lib/security/safe-storage'
import { saveStateFromStatus, type WorkflowReliabilitySnapshot } from '@/lib/workflows/reliability'

import {
  buildLinkedWorkflowHref,
  extractSuggestedLinks,
  type RecordingField,
  type RecordingWorkflow,
  type SuggestedLink
} from '@/lib/child-journey/workflows'

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
  onChange,
  id
}: {
  field: RecordingField
  value: string
  onChange: (value: string) => void
  id: string
}) {
  const baseClass = 'mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100'

  if (field.type === 'textarea') {
    return (
      <textarea
        id={id}
        data-testid={`recording-field-${field.name}`}
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
      <select id={id} data-testid={`recording-field-${field.name}`} value={value} onChange={(event) => onChange(event.target.value)} required={field.required} className={baseClass}>
        <option value="">Choose...</option>
        {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
        <input
          id={id}
          data-testid={`recording-field-${field.name}`}
          type="checkbox"
          checked={value === 'Yes'}
          onChange={(event) => onChange(event.target.checked ? 'Yes' : 'No')}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor={id}>Yes</label>
      </div>
    )
  }

  return (
    <input
      id={id}
      data-testid={`recording-field-${field.name}`}
      type={field.type || 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
      placeholder={field.placeholder}
      className={baseClass}
    />
  )
}

type QualityFlag = {
  label: string
  detail: string
  tone: 'amber' | 'red' | 'blue' | 'purple'
}

const childVoicePrompts = [
  'How did this feel for the child?',
  'What choices did the child make today?',
  'What changed for the child today?',
  'What mattered most to the child today?',
  'What went well for the child?',
  'What support helped?',
  'What should the next adult understand?',
  'What would the child want adults to understand?'
]

const quickTemplates = [
  'Today mattered because...',
  'What changed was...',
  'Staff observed...',
  'The child said...',
  'Staff supported by...',
  'This helped because...',
  'The agreed follow-up is...'
]

const chronologyAwarePrompts = [
  'Link this to the most recent chronology event if it explains a change.',
  'Check whether yesterday left an unresolved action.',
  'Check whether the child’s routine, relationships or mood changed.',
  'Name the support that should continue into handover.',
  'Describe the outcome before adding another workflow.',
  'Write why today mattered before moving to linked records.'
]

function recordText(values: Record<string, string>) {
  return Object.values(values).join('\n').trim()
}

function qualityFlags(values: Record<string, string>, primaryField: string | undefined): QualityFlag[] {
  const text = recordText(values)
  const primary = primaryField ? values[primaryField] || '' : text
  const flags: QualityFlag[] = []

  if (/\b(attention seeking|manipulative|naughty|deliberately|kicked off|played up|non[- ]?compliant)\b/i.test(text)) {
    flags.push({
      label: 'Reduce opinionated language',
      detail: 'Replace labels with observable behaviour, direct words and staff response.',
      tone: 'red'
    })
  }
  if (/\b(always|never|obviously|clearly|must have|probably)\b/i.test(text)) {
    flags.push({
      label: 'Check factual tone',
      detail: 'Avoid unsupported conclusions unless the source is clear.',
      tone: 'amber'
    })
  }
  if (primary.trim().length > 0 && primary.trim().length < 80) {
    flags.push({
      label: 'Add missing context',
      detail: 'Include what happened, where, staff support, child response and outcome.',
      tone: 'blue'
    })
  }
  if (!String(values.child_voice || values.wishes_feelings || '').trim()) {
    flags.push({
      label: 'Missing child voice',
      detail: 'Add words, wishes, feelings, choices or non-verbal communication if known.',
      tone: 'purple'
    })
  }
  if (!String(values.actions_required || values.follow_up_required || values.follow_up_actions || values.next_steps || '').trim() && /\b(concern|risk|injur|incident|missing|refus|low mood|police)\b/i.test(text)) {
    flags.push({
      label: 'Missing follow-up',
      detail: 'Clarify what happens next, who owns it and whether manager review is needed.',
      tone: 'amber'
    })
  }
  if (!/\b(helped|supported|outcome|settled|agreed|next|review|follow)/i.test(text) && text.length > 120) {
    flags.push({
      label: 'Missing outcome',
      detail: 'Add what changed after staff support or what remains unresolved.',
      tone: 'blue'
    })
  }

  return flags.slice(0, 6)
}

function flagClasses(tone: QualityFlag['tone']) {
  if (tone === 'red') return 'border-red-100 bg-red-50 text-red-800'
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-800'
  if (tone === 'purple') return 'border-purple-100 bg-purple-50 text-purple-800'
  return 'border-blue-100 bg-blue-50 text-blue-800'
}

function suggestionClasses(tone: SuggestedLink['tone']) {
  if (tone === 'red') return 'border-red-100 bg-red-50 text-red-800'
  if (tone === 'amber') return 'border-amber-100 bg-amber-50 text-amber-800'
  if (tone === 'emerald') return 'border-emerald-100 bg-emerald-50 text-emerald-800'
  if (tone === 'purple') return 'border-purple-100 bg-purple-50 text-purple-800'
  return 'border-blue-100 bg-blue-50 text-blue-800'
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
  const formRef = useRef<HTMLFormElement>(null)
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
  const [draftRestored, setDraftRestored] = useState(false)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [supportPromptsOpen, setSupportPromptsOpen] = useState(false)
  const [saveSnapshot, setSaveSnapshot] = useState<WorkflowReliabilitySnapshot>(() => saveStateFromStatus('not_saved'))

  const suggestions = useMemo(() => extractSuggestedLinks(values), [values])
  const flags = useMemo(() => qualityFlags(values, workflow.primaryField), [values, workflow.primaryField])
  const activeSection = workflow.sections[Math.min(activeSectionIndex, workflow.sections.length - 1)] || workflow.sections[0]
  const activeSectionHasText = activeSection?.fields.some((field) => String(values[field.name] || '').trim().length > 0)
  const sectionProgress = workflow.sections.filter((section) => section.fields.some((field) => String(values[field.name] || '').trim().length > 0)).length
  const autosaveKey = `indicare-recording-draft:${childId}:${workflow.id}`

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitting) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty, submitting])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function onOffline() {
      if (dirty) setSaveSnapshot(saveStateFromStatus('offline_draft'))
    }
    function onOnline() {
      if (dirty) setSaveSnapshot(saveStateFromStatus('draft'))
    }
    function onStorage(event: StorageEvent) {
      if (event.key === autosaveKey && event.newValue !== event.oldValue) {
        setSaveSnapshot(saveStateFromStatus('stale_session'))
        setNotice('Another tab changed this draft. Review the latest wording before saving.')
      }
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('storage', onStorage)
    }
  }, [autosaveKey, dirty])

  useEffect(() => {
    try {
      const saved = getSafeDraft<Record<string, string>>(autosaveKey)
      if (!saved) return
      const parsed = { values: saved.value, savedAt: saved.savedAt }
      if (parsed.values) {
        setValues((current) => ({ ...current, ...parsed.values }))
        setDraftRestored(true)
        setDirty(true)
        setSaveSnapshot(saveStateFromStatus('draft'))
        setNotice(`Unfinished draft restored${parsed.savedAt ? ` from ${new Date(parsed.savedAt).toLocaleString('en-GB')}` : ''}.`)
      }
    } catch {
      removeSafeDraft(autosaveKey)
    }
  }, [autosaveKey])

  useEffect(() => {
    if (!dirty || submitting) return
    const handle = window.setTimeout(() => {
      setSafeDraft(autosaveKey, values, undefined, 'confidential_child')
      setSaveSnapshot((current) => current.state === 'stale_session' ? current : saveStateFromStatus(navigator.onLine ? 'draft' : 'offline_draft'))
    }, 500)
    return () => window.clearTimeout(handle)
  }, [autosaveKey, dirty, submitting, values])

  useEffect(() => {
    const firstField = activeSection?.fields[0]
    if (!firstField) return
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>(`#recording-field-${firstField.name}`)?.focus()
    }, 0)
  }, [activeSectionIndex, activeSection])

  function updateField(name: string, nextValue: string) {
    setDirty(true)
    setSaveSnapshot(saveStateFromStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline_draft' : 'draft'))
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

  function addToField(fieldName: string, text: string) {
    const current = values[fieldName] || ''
    updateField(fieldName, current ? `${current}\n${text}` : text)
  }

  function insertTemplate(text: string) {
    const primaryField = workflow.primaryField
    if (!primaryField) return
    addToField(primaryField, text)
  }

  function handleSuggestion(suggestion: SuggestedLink) {
    if (suggestion.label.toLowerCase().includes('child voice')) {
      setNotice(`Child voice prompts: ${childVoicePrompts.join(' ')}`)
      return
    }
    if (suggestion.label.toLowerCase().includes('follow-up') || suggestion.label.toLowerCase().includes('action')) {
      addToField('actions_required', `Follow-up from suggestion: ${suggestion.label}.`)
      setNotice('Follow-up action prompt added. Review and assign before saving.')
      return
    }
    if (suggestion.label.toLowerCase().includes('care plan')) {
      addToField('plan_links', `Link suggested: ${suggestion.label}.`)
      setNotice('Care plan link prompt added. Review before saving.')
      return
    }
    setNotice(`${suggestion.label}: use the linked workflow button if this needs a separate record.`)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setSaveSnapshot(saveStateFromStatus('saving'))
    setError(null)
    setNotice(null)
    try {
      const response = await fetch('/api/recording', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken() } : {}) },
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
      if (payload.status === 'draft') {
        setSafeDraft(autosaveKey, values, undefined, 'confidential_child')
        setSaveSnapshot(saveStateFromStatus('draft'))
      } else {
        removeSafeDraft(autosaveKey)
        setSaveSnapshot(saveStateFromStatus(payload.status || 'saved'))
      }
      const params = new URLSearchParams({
        saved: payload.routeType || workflow.id,
        status: payload.status || 'saved'
      })
      if (payload.recordId) params.set('recordId', payload.recordId)
      if (payload.limitation) params.set('limitation', payload.limitation)
      router.push(`/young-people/${encodeURIComponent(childId)}/journey?${params.toString()}`)
    } catch (caught) {
      setSafeDraft(autosaveKey, values, undefined, 'confidential_child')
      setSaveSnapshot(saveStateFromStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline_draft' : 'retry_needed'))
      const detail = caught instanceof Error ? caught.message : 'The record could not be saved. Please try again.'
      setError(`Draft saved locally. It has not yet been added to the child's record. ${detail}`)
      setSubmitting(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" data-testid={`${workflow.id}-form`}>
      <div className="sticky top-3 z-20 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <WorkflowSaveIndicator snapshot={saveSnapshot} />
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {sectionProgress}/{workflow.sections.length} sections started
            </span>
            <button type="button" disabled={activeSectionIndex >= workflow.sections.length - 1} onClick={() => setActiveSectionIndex((index) => Math.min(index + 1, workflow.sections.length - 1))} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              {activeSectionHasText ? 'Continue next section' : 'Resume section'}
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Saving once...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      {draftRestored ? (
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-800" data-testid="draft-recovery-message">
          Resume where you left off. This is a local draft only until Save record confirms a live write.
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-[24px] border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-bold leading-6 text-blue-800" data-testid="save-state-message" aria-live="polite">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[24px] border border-red-100 bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-700" data-testid="save-state-error" aria-live="assertive">
          {error}
        </div>
      ) : null}
      {workflow.id === 'documents' ? (
        <div className="rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-bold leading-6 text-amber-800">
          Evidence upload is metadata-only in this workflow. Add the document title, what it evidences and any follow-up; file upload will show a controlled limitation until the live evidence attachment endpoint accepts files.
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
            <button type="button" onClick={improveWording} className="rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm font-black text-purple-800"><Wand2 className="mr-2 inline h-4 w-4" aria-hidden />Improve wording</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            `Orb, summarise ${childName}'s presentation today.`,
            'Orb, what follow-up is missing?',
            'Orb, make this more child-centred.',
            'Orb, show linked safeguarding concerns.'
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setNotice(`Orb prompt ready: "${prompt}" Open Orb if you want conversational support. No record will be saved silently.`)}
              data-testid="orb-prompt-chip"
              className="rounded-2xl border border-purple-200 bg-white/80 px-4 py-3 text-left text-xs font-black leading-5 text-purple-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Quick recording</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Templates, recent phrases and child voice snippets</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Tap a phrase to continue recording quickly. Staff still control the wording.</p>
          </div>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">Local draft autosave on</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickTemplates.map((template) => (
            <button key={template} type="button" onClick={() => insertTemplate(template)} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
              {template}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSupportPromptsOpen((value) => !value)} className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-600">
          <ChevronDown className={`mr-2 h-4 w-4 transition ${supportPromptsOpen ? 'rotate-180' : ''}`} aria-hidden />
          {supportPromptsOpen ? 'Hide reflective prompts' : 'Show reflective prompts'}
        </button>
        {supportPromptsOpen ? (
          <>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {childVoicePrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => addToField('child_voice', prompt)} className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-left text-sm font-bold text-purple-800">
                  <MessageSquareHeart className="mr-2 inline h-4 w-4" aria-hidden />
                  {prompt}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {chronologyAwarePrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => setNotice(prompt)} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm font-bold text-blue-800">
                  {prompt}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white p-3 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${workflow.title} sections`}>
          {workflow.sections.map((section, index) => (
            <button
              key={section.title}
              type="button"
              role="tab"
              aria-selected={activeSectionIndex === index}
              onClick={() => setActiveSectionIndex(index)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-left text-xs font-black uppercase tracking-[0.12em] transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeSectionIndex === index ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-800'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {activeSection ? (
            <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
              <div className="mb-5">
                <div className="flex flex-wrap items-center gap-2">
                  {activeSection.badge ? <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">{activeSection.badge}</span> : null}
                  <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{activeSection.title}</h2>
                </div>
                {activeSection.description ? <p className="mt-2 text-sm leading-6 text-slate-500">{activeSection.description}</p> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {activeSection.fields.map((field) => {
                  const wide = field.type === 'textarea' || field.name === workflow.primaryField
                  const fieldId = `recording-field-${field.name}`
                  return (
                    <div key={field.name} className={wide ? 'block md:col-span-2' : 'block'}>
                      <label htmlFor={fieldId} className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {field.label}{field.required ? ' *' : ''}
                      </label>
                      <FieldControl field={field} value={values[field.name] || ''} onChange={(value) => updateField(field.name, value)} id={fieldId} />
                      {field.helper ? <span className="mt-1 block text-xs leading-5 text-slate-500">{field.helper}</span> : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-700">Record quality assistance</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Suggestions only</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Orb-style checks highlight gaps; they do not edit or save the record.</p>
            <div className="mt-4 space-y-2">
              {flags.length ? flags.map((flag) => (
                <div key={flag.label} className={`rounded-2xl border px-4 py-3 text-sm ${flagClasses(flag.tone)}`}>
                  <strong className="block font-black">{flag.label}</strong>
                  <span className="mt-1 block text-xs leading-5">{flag.detail}</span>
                </div>
              )) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden />
                  No obvious quality gaps detected yet.
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-2">
              {['Make more child-centred', 'Reduce opinionated language', 'Highlight missing context', 'Suggest follow-up questions'].map((action) => (
                <button key={action} type="button" onClick={() => setNotice(`${action}: review the highlighted suggestions and edit the staff wording before saving.`)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black text-slate-700">
                  {action}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Suggested links</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">Review before saving</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Deterministic suggestions from the words in this record. They do not save without your confirmation.</p>
            <div className="mt-4 space-y-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.label} className={`rounded-2xl border px-4 py-3 text-sm ${suggestionClasses(suggestion.tone)}`}>
                  <strong className="block font-black">{suggestion.label}</strong>
                  <span className="mt-1 block text-xs leading-5">{suggestion.reason}</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleSuggestion(suggestion)} data-testid="smart-suggestion-chip" className="rounded-full bg-white/80 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] shadow-sm">
                      {suggestion.actionLabel || 'Use suggestion'}
                    </button>
                    {buildLinkedWorkflowHref(childId, suggestion) ? (
                      <Link href={buildLinkedWorkflowHref(childId, suggestion)!} data-testid={suggestion.workflowId === 'safeguarding' ? 'safeguarding-follow-up-action' : 'linked-workflow-action'} className="rounded-full bg-slate-950 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-sm">
                        <Link2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                        Open linked workflow
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
              {!suggestions.length ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <AlertTriangle className="mr-2 inline h-4 w-4 text-slate-400" aria-hidden />
                  No linkage suggestions yet. Daily note wording will be checked as you type.
                </div>
              ) : null}
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
            <p className="mt-2 text-sm leading-6 text-slate-300">This will link the record to {childName}, create the live source record where supported, and return to the journey with explicit write confirmation.</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">
              Chronology writeback is explicit and immutable in the backend projection. Suggestions do not create duplicate actions or chronology entries by themselves.
            </div>
            <div className="mt-5 grid gap-2">
              <button type="submit" data-testid="save-daily-note-button" disabled={submitting} className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
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

'use client'

import { useMemo, useState } from 'react'

type DashboardPreferences = {
  dashboard_preferences?: Record<string, unknown>
  pinned_widgets?: string[]
  hidden_optional_widgets?: string[]
  widget_order?: string[]
  favourite_children?: string[]
  favourite_templates?: string[]
  quick_actions?: string[]
  critical_widgets?: string[]
  recommended_widget_order?: string[]
  operational_focus?: string | null
}

const labels: Record<string, string> = {
  'safeguarding-open': 'Open safeguarding',
  'child-wellbeing': 'Child wellbeing',
  'operational-actions': 'My actions',
  'my-children': 'My children',
  'my-recent-records': 'My recent records',
  'my-pinned-templates': 'My pinned templates',
  'documents-review': 'Documents for review',
  'inspection-evidence': 'Evidence gaps',
  'child-voice': 'Child voice gaps'
}

function labelFor(id: string) {
  return labels[id] || id.replaceAll('-', ' ')
}

export function DashboardPreferencesPanel({
  initialPreferences,
  visibleChildren,
  templates
}: {
  initialPreferences: DashboardPreferences
  visibleChildren: Array<{ id: string; name: string }>
  templates: Array<{ id: string; title: string }>
}) {
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const critical = useMemo(() => new Set(preferences.critical_widgets || []), [preferences.critical_widgets])
  const order = preferences.widget_order?.length ? preferences.widget_order : preferences.recommended_widget_order || []
  const pinned = new Set(preferences.pinned_widgets || [])
  const hidden = new Set(preferences.hidden_optional_widgets || [])

  function update(next: Partial<DashboardPreferences>) {
    setPreferences((current) => ({ ...current, ...next }))
    setMessage('')
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/profile/dashboard-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboard_preferences: preferences.dashboard_preferences || {},
          pinned_widgets: preferences.pinned_widgets || [],
          hidden_optional_widgets: preferences.hidden_optional_widgets || [],
          widget_order: preferences.widget_order || [],
          favourite_children: preferences.favourite_children || [],
          favourite_templates: preferences.favourite_templates || [],
          quick_actions: preferences.quick_actions || [],
          operational_focus: preferences.operational_focus || ''
        })
      })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const payload = await response.json()
      update(payload)
      setMessage('Workspace preferences saved.')
    } catch (error) {
      setMessage(`Preferences were not saved: ${String(error)}`)
    } finally {
      setSaving(false)
    }
  }

  function moveWidget(id: string, direction: -1 | 1) {
    const next = [...order]
    const index = next.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    update({ widget_order: next })
  }

  function reset() {
    update({
      pinned_widgets: [],
      hidden_optional_widgets: [],
      widget_order: preferences.recommended_widget_order || [],
      favourite_children: [],
      favourite_templates: [],
      quick_actions: []
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] bg-gradient-to-br from-blue-50 via-white to-slate-50 p-5 ring-1 ring-blue-100">
        <label className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700" htmlFor="operational-focus">My operational focus</label>
        <textarea
          id="operational-focus"
          value={preferences.operational_focus || ''}
          onChange={(event) => update({ operational_focus: event.target.value })}
          placeholder="For example: key children, recording follow-up, manager review or handover focus."
          className="mt-3 min-h-24 w-full rounded-2xl border border-blue-100 bg-white p-4 text-sm font-bold leading-6 text-slate-800 outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="grid gap-3">
        {order.map((id, index) => (
          <article key={id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">{labelFor(id)}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{critical.has(id) ? 'Critical operational widget - always visible' : hidden.has(id) ? 'Optional widget hidden' : pinned.has(id) ? 'Pinned in my workspace' : 'Recommended workspace widget'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => moveWidget(id, -1)} disabled={index === 0 || critical.has(id)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Up</button>
                <button type="button" onClick={() => moveWidget(id, 1)} disabled={index === order.length - 1 || critical.has(id)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Down</button>
                <button type="button" onClick={() => update({ pinned_widgets: pinned.has(id) ? [...pinned].filter((item) => item !== id) : [...pinned, id] })} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">{pinned.has(id) ? 'Unpin' : 'Pin'}</button>
                {!critical.has(id) ? (
                  <button type="button" onClick={() => update({ hidden_optional_widgets: hidden.has(id) ? [...hidden].filter((item) => item !== id) : [...hidden, id] })} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">{hidden.has(id) ? 'Show' : 'Hide'}</button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PreferencePicker
          label="Favourite children"
          options={visibleChildren.map((child) => ({ value: child.id, label: child.name }))}
          selected={preferences.favourite_children || []}
          onChange={(value) => update({ favourite_children: value })}
        />
        <PreferencePicker
          label="Pinned templates"
          options={templates.map((template) => ({ value: template.id, label: template.title }))}
          selected={preferences.favourite_templates || []}
          onChange={(value) => update({ favourite_templates: value })}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 disabled:opacity-60">{saving ? 'Saving...' : 'Save preferences'}</button>
        <button type="button" onClick={reset} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700">Reset recommended layout</button>
      </div>
      {message ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700">{message}</p> : null}
    </div>
  )
}

function PreferencePicker({
  label,
  options,
  selected,
  onChange
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selected: string[]
  onChange: (value: string[]) => void
}) {
  const selectedSet = new Set(selected)
  return (
    <fieldset className="rounded-[26px] border border-slate-100 bg-slate-50 p-4">
      <legend className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</legend>
      <div className="mt-3 space-y-2">
        {options.slice(0, 6).map((option) => (
          <label key={option.value} className="flex min-h-11 items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={selectedSet.has(option.value)}
              onChange={(event) => {
                onChange(event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            {option.label}
          </label>
        ))}
        {!options.length ? <p className="text-sm leading-6 text-slate-500">No schema-backed options were returned for this session.</p> : null}
      </div>
    </fieldset>
  )
}

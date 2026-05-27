'use client'

import { useEffect, useState } from 'react'

import { NotificationAutomationStatus } from '@/components/connect/notification-automation-status'
import { NotificationEscalationCheck } from '@/components/connect/notification-escalation-check'
import { NotificationEscalationRunHistory } from '@/components/connect/notification-escalation-run-history'
import { NotificationEscalationRulesPanel } from '@/components/connect/notification-escalation-rules-panel'
import { NotificationPreferenceRuleCard } from '@/components/connect/notification-preference-rule-card'
import {
  getNotificationEscalationRules,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationEscalationRule,
  type NotificationPreferenceRule
} from '@/lib/os-api/notifications'

export function NotificationSettingsPanel() {
  const [rules, setRules] = useState<NotificationPreferenceRule[]>([])
  const [escalationRules, setEscalationRules] = useState<NotificationEscalationRule[]>([])
  const [limitations, setLimitations] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void Promise.all([getNotificationPreferences(), getNotificationEscalationRules()]).then(([prefs, esc]) => {
      const effective = prefs.data.effective_rules?.length
        ? prefs.data.effective_rules
        : prefs.data.preferences.rules
      setRules(effective)
      setEscalationRules(esc.data)
      setLimitations([...prefs.data.limitations, ...prefs.data.preferences.limitations])
      setLoaded(true)
    })
  }, [])

  async function save() {
    setSaving(true)
    try {
      const result = await updateNotificationPreferences({
        rules,
        urgent_safeguarding_always_on: true
      })
      setRules(result.data.effective_rules)
      setLimitations(result.data.limitations)
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div data-testid="notification-settings-panel" className="text-sm font-semibold text-slate-600">
        Loading notification settings…
      </div>
    )
  }

  return (
    <div data-testid="notification-settings-panel" className="space-y-8">
      <p
        className="rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-semibold text-amber-950"
        data-testid="notification-settings-urgent-copy"
      >
        Urgent safeguarding notifications remain visible for safety, even when categories are muted.
      </p>

      <section>
        <h2 className="text-lg font-black text-slate-950">Preference rules</h2>
        <p className="mt-1 text-sm text-slate-600">Configure how operational notifications appear in-app.</p>
        <div className="mt-4 space-y-3">
          {rules.map((rule, idx) => (
            <NotificationPreferenceRuleCard
              key={rule.id}
              rule={rule}
              onChange={(updated) => {
                const next = [...rules]
                next[idx] = updated
                setRules(next)
              }}
            />
          ))}
        </div>
        <button
          type="button"
          data-testid="notification-preferences-save"
          disabled={saving}
          onClick={() => void save()}
          className="mt-4 rounded-full bg-blue-600 px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-950" data-testid="notification-escalation-rules-heading">
          Escalation rules
        </h2>
        <NotificationEscalationRulesPanel rules={escalationRules} />
      </section>

      <NotificationAutomationStatus />

      <div id="escalation">
        <NotificationEscalationCheck />
      </div>

      <NotificationEscalationRunHistory />

      {limitations.length ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          {limitations.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

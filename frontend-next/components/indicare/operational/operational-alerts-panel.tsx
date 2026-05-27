'use client'

import Link from 'next/link'
import { AlertTriangle, CircleCheck, ShieldAlert } from 'lucide-react'

import { useOperationalContext } from '@/lib/operational/operational-context'

function severityForRoute(pathname: string) {
  if (/safeguarding|incident|missing|risk/.test(pathname)) return 'high'
  if (/ofsted|regulatory|governance|management/.test(pathname)) return 'medium'
  return 'normal'
}

export function OperationalAlertsPanel() {
  const { pathname, currentRiskContext, linkedActionsAndEvidence, operationalRole } = useOperationalContext()
  const severity = severityForRoute(pathname)
  const hasRiskSignal = Boolean(currentRiskContext)
  const hasLinkedEvidence = Boolean(linkedActionsAndEvidence?.selected_record_id)
  const alerts = [
    hasRiskSignal ? {
      id: 'risk-context',
      title: 'Risk context active',
      body: 'Support, ORB prompts and actions are focused on this risk-sensitive area.',
      href: pathname,
      tone: 'red'
    } : null,
    hasLinkedEvidence ? {
      id: 'linked-evidence',
      title: 'Evidence context available',
      body: 'Linked chronology, actions and evidence can be opened from this route.',
      href: '/evidence',
      tone: 'amber'
    } : null
  ].filter(Boolean) as Array<{ id: string; title: string; body: string; href: string; tone: 'red' | 'amber' }>

  return (
    <section data-testid="operational-alerts" className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Evidence checks</p>
          <p className="mt-1 text-xs font-bold text-slate-500">What needs attention, context or manager review.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${severity === 'high' ? 'bg-red-50 text-red-700' : severity === 'medium' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
          {severity}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {alerts.length ? alerts.map((alert) => (
          <Link key={alert.id} href={alert.href} className={`block rounded-2xl border px-3 py-3 ${alert.tone === 'red' ? 'border-red-100 bg-red-50 text-red-800' : 'border-amber-100 bg-amber-50 text-amber-800'}`}>
            <span className="flex items-center gap-2 text-xs font-black">
              {alert.tone === 'red' ? <ShieldAlert className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
              {alert.title}
            </span>
            <span className="mt-1 block text-xs font-bold leading-5 opacity-80">{alert.body}</span>
          </Link>
        )) : (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-emerald-800">
            <span className="flex items-center gap-2 text-xs font-black">
              <CircleCheck className="h-4 w-4" aria-hidden />
              No evidence checks needing attention
            </span>
            <span className="mt-1 block text-xs font-bold leading-5 opacity-80">Current role scope: {operationalRole.toUpperCase()}</span>
          </div>
        )}
      </div>
    </section>
  )
}
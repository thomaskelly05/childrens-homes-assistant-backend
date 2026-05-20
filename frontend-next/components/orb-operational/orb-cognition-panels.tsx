import { Activity, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react'

import type { OrbConversationResponse } from '@/lib/os-api/orb'

type AnyRecord = Record<string, unknown>

type PanelTone = 'blue' | 'emerald' | 'amber' | 'purple' | 'slate'

function record(value: unknown): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AnyRecord : {}
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function text(value: unknown, fallback: unknown = 'Not returned'): string {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 180)
  return String(value)
}

function toneClasses(tone: PanelTone) {
  const tones: Record<PanelTone, string> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-950',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-100 bg-amber-50 text-amber-950',
    purple: 'border-purple-100 bg-purple-50 text-purple-950',
    slate: 'border-slate-100 bg-slate-50 text-slate-800'
  }
  return tones[tone]
}

function MiniPanel({
  label,
  value,
  detail,
  tone = 'slate'
}: {
  label: string
  value: string | number
  detail?: string
  tone?: PanelTone
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses(tone)}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
      {detail ? <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{detail}</p> : null}
    </div>
  )
}

function InsightList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="text-sm font-semibold leading-6 text-slate-500">{empty}</p>
  return (
    <ul className="space-y-2 text-sm font-semibold leading-6 text-slate-600">
      {items.slice(0, 5).map((item, index) => <li key={`${item}-${index}`}>- {item}</li>)}
    </ul>
  )
}

export function OrbCognitionPanels({ response }: { response?: OrbConversationResponse }) {
  const cognition = record(response?.operational_cognition)
  const trajectory = record(response?.trajectory_reasoning)
  const atmosphere = record(response?.operational_atmosphere)
  const rmReflection = record(response?.rm_reflection)
  const careJourney = record(response?.care_journey)
  const regulatory = record(response?.regulatory_reasoning)

  const themes = list(cognition.themes)
  const impactIndicators = list(cognition.impact_indicators)
  const cognitionPrompts = list(cognition.rm_review_prompts)
  const trajectoryIndicators = list(trajectory.trajectory_indicators)
  const pressureIndicators = list(atmosphere.operational_pressure_indicators)
  const stabilityIndicators = list(atmosphere.stability_indicators)
  const reflectionPrompts = list(rmReflection.rm_reflection_prompts)
  const relationshipMarkers = [
    ...themes.filter((theme) => /relationship|voice|belonging|emotional/i.test(theme)),
    ...list(careJourney.protective_factors)
  ]
  const oversight = [
    ...list(regulatory.management_considerations),
    ...trajectoryIndicators
  ]

  const hasResponse = Boolean(response)

  return (
    <section className="space-y-4" data-testid="orb-cognition-panels">
      <div className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">Operational atmosphere</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MiniPanel label="Home atmosphere" value={text(atmosphere.atmosphere, hasResponse ? 'Review' : 'Ask ORB first')} detail={text(atmosphere.manager_summary, 'No atmosphere summary yet.')} tone="blue" />
          <MiniPanel label="Emotional stability" value={text(cognition.positive_signal_count, 0)} detail="Positive or stabilising signals in ORB context" tone="emerald" />
          <MiniPanel label="Safeguarding pressure" value={text(atmosphere.safeguarding_count, 0)} detail="Safeguarding records in this evidence window" tone={Number(atmosphere.safeguarding_count || 0) ? 'amber' : 'emerald'} />
          <MiniPanel label="Operational calmness" value={text(trajectory.trajectory, 'Not checked')} detail={text(cognition.trajectory, 'Direction appears after ORB checks records.')} tone="purple" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <InsightList items={pressureIndicators} empty="Pressure indicators appear when ORB sees safeguarding, drift, or unresolved actions." />
          <InsightList items={stabilityIndicators} empty="Stability indicators appear when ORB sees enough chronology or positive progress." />
        </div>
      </div>

      <div className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
        <div className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">Relationship and child impact</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(themes.length ? themes : ['Themes appear after ORB checks records']).map((item) => (
            <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-800">{item}</span>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Relationship intelligence</p>
            <InsightList items={relationshipMarkers} empty="Trusted adults, repair, family contact and child voice indicators appear here when present in source records." />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Child impact synthesis</p>
            <InsightList items={impactIndicators} empty="Child impact indicators appear when ORB can reuse care journey, chronology and metadata signals." />
          </div>
        </div>
      </div>

      <div className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">Reflective maturity</h2>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">RM reflection</p>
            <InsightList items={[...reflectionPrompts, ...cognitionPrompts]} empty="Reflective prompts appear from ORB RM reflection after records are checked." />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Oversight considerations</p>
            <InsightList items={oversight} empty="Governance, evidence and trajectory considerations appear when relevant to the selected scope." />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            <p className="text-xs font-semibold leading-5 text-slate-600">
              {text(cognition.cognition_summary, hasResponse ? 'ORB did not return a cognition summary for this response.' : 'Ask ORB to populate reflective operational cognition.')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

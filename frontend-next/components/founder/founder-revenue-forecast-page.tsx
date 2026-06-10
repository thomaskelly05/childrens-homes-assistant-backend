'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Save } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import { founderGet, founderPost } from '@/lib/founder/api/founder-api-client'
import {
  FORECAST_SCENARIO_LABELS,
  REVENUE_FORECAST_DISCLAIMER,
  type ForecastScenario,
  type RevenueForecast
} from '@/lib/founder/revenue/revenue-types'

const SCENARIOS: ForecastScenario[] = ['conservative', 'base', 'growth', 'aggressive']

type AssumptionsForm = {
  users: string
  providers: string
  subscriptionPriceGbp: string
  conversionRatePercent: string
  churnRatePercent: string
  aiCostPerUserGbp: string
  infrastructureCostGbp: string
}

const DEFAULT_FORM: AssumptionsForm = {
  users: '50',
  providers: '3',
  subscriptionPriceGbp: '9.99',
  conversionRatePercent: '8',
  churnRatePercent: '4',
  aiCostPerUserGbp: '1.20',
  infrastructureCostGbp: '120'
}

function formatGbp(value: number): string {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function FounderRevenueForecastPage() {
  const [loading, setLoading] = useState(false)
  const [scenario, setScenario] = useState<ForecastScenario>('base')
  const [form, setForm] = useState<AssumptionsForm>(DEFAULT_FORM)
  const [forecast, setForecast] = useState<RevenueForecast | null>(null)
  const [savedForecasts, setSavedForecasts] = useState<RevenueForecast[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSaved = useCallback(async () => {
    const result = await founderGet<{ forecasts: RevenueForecast[] }>('/revenue/forecasts')
    if (result.ok) setSavedForecasts(result.data.forecasts)
  }, [])

  useEffect(() => {
    void loadSaved()
  }, [loadSaved])

  async function generateForecast(submitForApproval = false) {
    setLoading(true)
    setError(null)
    setMessage(null)

    const result = await founderPost<{ forecast: RevenueForecast }>('/revenue/forecast', {
      scenario,
      users: Number(form.users),
      providers: Number(form.providers),
      subscriptionPriceGbp: Number(form.subscriptionPriceGbp),
      conversionRatePercent: Number(form.conversionRatePercent),
      churnRatePercent: Number(form.churnRatePercent),
      aiCostPerUserGbp: Number(form.aiCostPerUserGbp),
      infrastructureCostGbp: Number(form.infrastructureCostGbp),
      submitForApproval
    })

    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setForecast(result.data.forecast)
    setMessage(submitForApproval ? 'Forecast saved and sent to Approvals.' : 'Forecast saved.')
    await loadSaved()
  }

  const projections = forecast?.assumptions.projections

  return (
    <div className="space-y-8">
      <FounderNavHeader
        title="Revenue Forecast"
        subtitle="Modelled commercial scenarios for IndiCare Intelligence."
        showBack
        backHref="/founder/revenue"
      />

      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        {REVENUE_FORECAST_DISCLAIMER}
      </div>

      <FounderSectionCard eyebrow="Scenario" title="Choose forecast scenario">
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setScenario(item)}
              className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                scenario === item
                  ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {FORECAST_SCENARIO_LABELS[item]}
            </button>
          ))}
        </div>
      </FounderSectionCard>

      <FounderSectionCard eyebrow="Assumptions" title="Assumptions editor">
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ['users', 'Users'],
              ['providers', 'Providers'],
              ['subscriptionPriceGbp', 'Subscription price (£)'],
              ['conversionRatePercent', 'Conversion rate (%)'],
              ['churnRatePercent', 'Churn rate (%)'],
              ['aiCostPerUserGbp', 'AI cost per user (£)'],
              ['infrastructureCostGbp', 'Infrastructure cost (£/month)']
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm text-slate-300">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
              <input
                value={form[key]}
                onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void generateForecast(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Forecast
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void generateForecast(true)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 disabled:opacity-50"
          >
            Send to Approvals
          </button>
          {forecast ? (
            <SaveToFounderMemoryButton
              title={`Revenue forecast — ${FORECAST_SCENARIO_LABELS[forecast.scenario]}`}
              content={`${REVENUE_FORECAST_DISCLAIMER} Projected 12-month MRR: ${formatGbp(forecast.projectedMRR)}. ${forecast.runwayImpact}`}
              type="milestone"
              tags={['revenue', 'forecast', forecast.scenario]}
              linkedEntityId={forecast.id}
              linkedEntityType="revenue-forecast"
            />
          ) : null}
          <Link
            href="/founder/approvals"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 hover:text-slate-200"
          >
            Open Approvals
          </Link>
        </div>

        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </FounderSectionCard>

      {forecast && projections ? (
        <>
          <FounderSectionCard eyebrow="Projections" title="3 / 6 / 12 month projections">
            <div className="grid gap-4 lg:grid-cols-3">
              {(
                [
                  ['months3', '3 months'],
                  ['months6', '6 months'],
                  ['months12', '12 months']
                ] as const
              ).map(([key, label]) => {
                const projection = projections[key]
                return (
                  <article key={key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">{label}</p>
                    <p className="mt-3 text-sm text-slate-400">MRR: <span className="font-bold text-white">{formatGbp(projection.projectedMRR)}</span></p>
                    <p className="mt-1 text-sm text-slate-400">ARR: <span className="font-bold text-white">{formatGbp(projection.projectedARR)}</span></p>
                    <p className="mt-1 text-sm text-slate-400">Users: <span className="text-white">{projection.projectedUsers}</span></p>
                    <p className="mt-1 text-sm text-slate-400">Providers: <span className="text-white">{projection.projectedProviders}</span></p>
                    <p className="mt-1 text-sm text-slate-400">AI cost: <span className="text-white">{formatGbp(projection.projectedAIcost)}</span></p>
                    <p className="mt-1 text-sm text-slate-400">Gross margin: <span className="text-white">{formatGbp(projection.projectedGrossMargin)}</span></p>
                  </article>
                )
              })}
            </div>
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Risks" title="Risk notes and limitations">
            <ul className="space-y-2 text-sm text-slate-300">
              {forecast.risks.map((risk) => (
                <li key={risk}>• {risk}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-400">{forecast.runwayImpact}</p>
          </FounderSectionCard>
        </>
      ) : null}

      {savedForecasts.length > 0 ? (
        <FounderSectionCard eyebrow="Saved" title="Saved forecasts">
          <div className="space-y-3">
            {savedForecasts.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <p className="font-bold text-white">
                  {FORECAST_SCENARIO_LABELS[item.scenario]} — {formatGbp(item.projectedMRR)} MRR (12m)
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Saved {new Date(item.createdAt).toLocaleString('en-GB')}
                  {item.approvalStatus ? ` · ${item.approvalStatus}` : ''}
                </p>
              </article>
            ))}
          </div>
        </FounderSectionCard>
      ) : null}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, ShieldCheck, UserRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { fetchScopeOptions, workspaceHrefForScope } from '@/lib/os-scope'

function SelectorSkeleton() {
  return (
    <div data-testid="select-scope-options-skeleton" className="mt-6 grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((key) => (
        <div key={key} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </div>
  )
}

export function HomeChildSelector() {
  const router = useRouter()
  const { scope, applyScopeSelection, loading, error } = useOsScope()
  const [options, setOptions] = useState(scope)
  const [pickerHomeId, setPickerHomeId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const hasSelectedHome = Boolean(options.selected_home_id)
  const activeHomeId = pickerHomeId ?? options.selected_home_id ?? null

  const loadOptions = useCallback(async (homeId?: number) => {
    setOptionsLoading(true)
    try {
      const data = await fetchScopeOptions(homeId)
      setOptions(data)
      setLocalError(data.degraded ? data.warnings.join(' ') || 'Home and child list unavailable. Retry shortly.' : null)
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Could not load homes.')
    } finally {
      setOptionsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOptions(activeHomeId ?? undefined)
  }, [activeHomeId, loadOptions])

  async function chooseHome(homeId: number, homeName: string) {
    if (!homeId) return
    setBusy(true)
    setLocalError(null)
    try {
      const next = await applyScopeSelection({ scope_type: 'home', home_id: homeId, home_name: homeName })
      const href = workspaceHrefForScope(next)
      if (href && href !== '/select-scope') {
        router.replace(href)
      }
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Home selection failed.')
    } finally {
      setBusy(false)
    }
  }

  async function previewHomeChildren(homeId: number) {
    setPickerHomeId(homeId)
    await loadOptions(homeId)
  }

  async function chooseChild(childId: number, childName: string, homeId?: number | null) {
    const resolvedHomeId = homeId ?? activeHomeId
    if (!childId || !resolvedHomeId) {
      setLocalError('Select a home before choosing a child.')
      return
    }
    setBusy(true)
    setLocalError(null)
    try {
      const next = await applyScopeSelection({
        scope_type: 'child',
        child_id: childId,
        child_name: childName,
        home_id: resolvedHomeId,
        home_name: options.available_homes.find((home) => home.id === resolvedHomeId)?.name ?? options.selected_home_name ?? undefined
      })
      const href = workspaceHrefForScope(next)
      if (href && href !== '/select-scope' && next.selected_child_id) {
        router.replace(href)
      }
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Child selection failed.')
    } finally {
      setBusy(false)
    }
  }

  const homes = options.available_homes.length ? options.available_homes : options.recent_homes
  const children = options.available_children.length
    ? options.available_children
    : options.available_children_for_home?.length
      ? options.available_children_for_home
      : activeHomeId
        ? []
        : options.recent_children

  const showDegradedPanel = Boolean(localError || error || options.degraded)
  const emptyHomesMessage =
    options.degraded || showDegradedPanel
      ? null
      : homes.length === 0
        ? 'No homes are currently linked to your account.'
        : null

  return (
    <div data-testid="home-child-selector" className="mx-auto w-full max-w-3xl space-y-8">
      <header className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Scope-first workspace</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Choose where you are working</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Select one home or one child before operational dashboards, chronology, actions and workforce views load.
        </p>
        {hasSelectedHome && options.selected_home_name ? (
          <p data-testid="select-scope-current-home-label" className="mt-4 text-sm font-bold text-slate-700">
            Selected home: {options.selected_home_name}
          </p>
        ) : null}
        {showDegradedPanel ? (
          <div
            data-testid="select-scope-degraded-panel"
            className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"
          >
            <p>{localError || error || options.warnings.join(' ') || 'Home and child list unavailable. Retry shortly.'}</p>
            <button
              type="button"
              data-testid="select-scope-retry"
              className="mt-3 rounded-xl bg-amber-900 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white"
              onClick={() => {
                setLocalError(null)
                void loadOptions(activeHomeId ?? undefined)
              }}
            >
              Retry
            </button>
          </div>
        ) : null}
      </header>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">Homes</h2>
        </div>
        {optionsLoading ? (
          <SelectorSkeleton />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {homes.map((home) => (
              <div key={home.id} className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy || loading}
                  onClick={() => void chooseHome(home.id, home.name)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
                >
                  <p className="text-sm font-black text-slate-950">{home.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Open home workspace</p>
                </button>
                <button
                  type="button"
                  className="text-xs font-black uppercase tracking-[0.14em] text-blue-700"
                  disabled={busy || loading}
                  onClick={() => void previewHomeChildren(home.id)}
                >
                  Show children in this home
                </button>
              </div>
            ))}
            {emptyHomesMessage ? (
              <p data-testid="select-scope-no-homes" className="text-sm font-bold text-slate-500">
                {emptyHomesMessage}
              </p>
            ) : null}
          </div>
        )}
        {pickerHomeId ? (
          <button
            type="button"
            className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-blue-700"
            onClick={() => setPickerHomeId(null)}
          >
            Show all permitted homes
          </button>
        ) : null}
      </section>

      <section id="recent-children" className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5">
        <div className="flex items-center gap-3">
          <UserRound className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">
            {activeHomeId ? 'Children in this home' : 'Recent children'}
          </h2>
        </div>
        {optionsLoading && activeHomeId ? (
          <SelectorSkeleton />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                disabled={busy || loading || !activeHomeId}
                onClick={() => void chooseChild(child.id, child.name, child.home_id ?? activeHomeId)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
              >
                <p className="text-sm font-black text-slate-950">{child.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Open child workspace</p>
              </button>
            ))}
            {!children.length ? (
              <p data-testid="select-scope-children-hint" className="text-sm font-bold text-slate-500">
                {activeHomeId
                  ? 'No children returned for this home yet.'
                  : 'Select a home to load children.'}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="flex flex-wrap justify-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        <Link prefetch={false} href="/settings" className="rounded-full bg-white px-4 py-2 ring-1 ring-slate-200">
          Settings
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-800">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          No global dashboards until scope is selected
        </span>
      </div>
    </div>
  )
}

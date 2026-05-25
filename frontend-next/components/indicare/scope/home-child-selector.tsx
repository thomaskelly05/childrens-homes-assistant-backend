'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useOsScope } from '@/components/indicare/scope/os-scope-provider'
import { fetchScopeOptions, workspaceHrefForScope } from '@/lib/os-scope'

export function HomeChildSelector() {
  const router = useRouter()
  const { scope, applyScopeSelection, loading, error } = useOsScope()
  const [options, setOptions] = useState(scope)
  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(scope.selected_home_id ?? null)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchScopeOptions(selectedHomeId ?? undefined)
      .then((data) => {
        if (!cancelled) setOptions(data)
      })
      .catch((caught) => {
        if (!cancelled) setLocalError(caught instanceof Error ? caught.message : 'Could not load homes.')
      })
    return () => {
      cancelled = true
    }
  }, [selectedHomeId])

  async function chooseHome(homeId: number, homeName: string) {
    setBusy(true)
    setLocalError(null)
    try {
      const next = await applyScopeSelection({ scope_type: 'home', home_id: homeId, home_name: homeName })
      router.replace(workspaceHrefForScope(next))
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Home selection failed.')
    } finally {
      setBusy(false)
    }
  }

  async function chooseChild(childId: number, childName: string, homeId?: number | null) {
    setBusy(true)
    setLocalError(null)
    try {
      const next = await applyScopeSelection({
        scope_type: 'child',
        child_id: childId,
        child_name: childName,
        home_id: homeId ?? selectedHomeId ?? undefined,
        home_name: options.selected_home_name ?? undefined
      })
      router.replace(workspaceHrefForScope(next))
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : 'Child selection failed.')
    } finally {
      setBusy(false)
    }
  }

  const homes = options.available_homes.length ? options.available_homes : options.recent_homes
  const children = options.available_children_for_home.length ? options.available_children_for_home : options.recent_children

  return (
    <div data-testid="home-child-selector" className="mx-auto w-full max-w-3xl space-y-8">
      <header className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Scope-first workspace</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">Choose where you are working</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Select one home or one child before operational dashboards, chronology, actions and workforce views load.
        </p>
        {(error || localError || options.warnings.length) ? (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {localError || error || options.warnings.join(' ')}
          </div>
        ) : null}
      </header>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">Homes</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {homes.map((home) => (
            <button
              key={home.id}
              type="button"
              disabled={busy || loading}
              onClick={() => {
                setSelectedHomeId(home.id)
                void chooseHome(home.id, home.name)
              }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
            >
              <p className="text-sm font-black text-slate-950">{home.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Open home workspace</p>
            </button>
          ))}
          {!homes.length ? (
            <p className="text-sm font-bold text-slate-500">No homes returned yet. Retry shortly or contact your administrator.</p>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-blue-700"
          onClick={() => setSelectedHomeId(null)}
        >
          Show all permitted homes
        </button>
      </section>

      <section id="recent-children" className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5">
        <div className="flex items-center gap-3">
          <UserRound className="h-5 w-5 text-blue-600" aria-hidden />
          <h2 className="text-lg font-black text-slate-950">
            {selectedHomeId ? 'Children in this home' : 'Recent children'}
          </h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {children.map((child) => (
            <button
              key={child.id}
              type="button"
              disabled={busy || loading}
              onClick={() => void chooseChild(child.id, child.name, child.home_id ?? selectedHomeId)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
            >
              <p className="text-sm font-black text-slate-950">{child.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Open child workspace</p>
            </button>
          ))}
          {!children.length ? (
            <p className="text-sm font-bold text-slate-500">
              {selectedHomeId ? 'Select a home first or wait for the child list.' : 'Pick a home to load its children, or use a recent child below.'}
            </p>
          ) : null}
        </div>
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

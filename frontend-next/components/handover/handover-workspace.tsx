'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { HandoverDraftEditor } from '@/components/handover/handover-draft-editor'
import { HandoverDraftList } from '@/components/handover/handover-draft-list'
import { HandoverIntelligencePanel } from '@/components/handover/handover-intelligence-panel'
import {
  childActionsHref,
  homeActionsHref,
  homeHandoverReviewsHref,
  homeRecordingAlertsHref,
  homeRecordingReviewsHref,
  homeSafeguardingHref
} from '@/lib/navigation/scope-routes'
import {
  getHandoverDraft,
  getHandoverIntelligence,
  listHandoverDrafts,
  type HandoverDraftRecord,
  type HandoverIntelligenceDashboard
} from '@/lib/os-api/handover-intelligence'

type Props = {
  childId?: number
  homeId?: number
  draftId?: string
}

export function HandoverWorkspace({ childId, homeId, draftId: initialDraftId }: Props) {
  const [dashboard, setDashboard] = useState<HandoverIntelligenceDashboard | null>(null)
  const [drafts, setDrafts] = useState<HandoverDraftRecord[]>([])
  const [activeDraftId, setActiveDraftId] = useState(initialDraftId || '')
  const [activeDraft, setActiveDraft] = useState<HandoverDraftRecord | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const scopedLinks = useMemo(() => {
    const hid = homeId != null ? String(homeId) : null
    const cid = childId != null ? String(childId) : null
    return {
      alerts: cid
        ? `/record/alerts?child_id=${encodeURIComponent(cid)}`
        : hid
          ? homeRecordingAlertsHref(hid)
          : '/record/alerts',
      reviews: cid
        ? `/record/reviews?child_id=${encodeURIComponent(cid)}`
        : hid
          ? homeRecordingReviewsHref(hid)
          : '/record/reviews',
      safeguarding: cid
        ? `/safeguarding?child_id=${encodeURIComponent(cid)}`
        : hid
          ? homeSafeguardingHref(hid)
          : '/safeguarding',
      briefing: hid ? `/command-centre/briefing?home_id=${encodeURIComponent(hid)}` : '/command-centre/briefing',
      handoverReviews: hid ? homeHandoverReviewsHref(hid) : '/handover/reviews',
      actions: cid ? childActionsHref(cid) : hid ? homeActionsHref(hid) : '/select-scope',
      orb: cid
        ? `/assistant/orb?scope=child&young_person_id=${encodeURIComponent(cid)}&mode=manager_daily_brief`
        : hid
          ? `/assistant/orb?scope=home&home_id=${encodeURIComponent(hid)}&mode=manager_daily_brief`
          : '/assistant/orb?mode=manager_daily_brief'
    }
  }, [childId, homeId])

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const [intel, listed] = await Promise.all([
        getHandoverIntelligence({ child_id: childId, home_id: homeId }),
        listHandoverDrafts({ child_id: childId, limit: 20 })
      ])
      if (intel.ok) setDashboard(intel.data)
      else setLoadError('Handover intelligence could not be loaded. You can still edit drafts below.')
      if (listed.ok) setDrafts(listed.data.items || [])
    } catch {
      setLoadError('Handover data is temporarily unavailable. Try again shortly — your session is still active.')
    }
  }, [childId, homeId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!activeDraftId) {
      setActiveDraft(null)
      return
    }
    void getHandoverDraft(activeDraftId).then((result) => {
      if (result.ok && result.data) setActiveDraft(result.data)
    })
  }, [activeDraftId])

  useEffect(() => {
    if (initialDraftId) setActiveDraftId(initialDraftId)
  }, [initialDraftId])

  return (
    <div data-testid="handover-workspace" className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Shift operating rhythm</p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Shift handover</h1>
        <p className="max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Prepare safe, child-centred handover using recording alerts, safeguarding network, reviews and actions.
          {homeId ? ' Scoped to this home — global command centre data is not loaded automatically.' : null}
          {childId ? ' Scoped to this child.' : null}
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-black">
          <Link prefetch={false} href={scopedLinks.alerts} className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">
            Recording alerts
          </Link>
          <Link prefetch={false} href={scopedLinks.reviews} className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">
            Reviews
          </Link>
          <Link prefetch={false} href={scopedLinks.safeguarding} className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">
            Safeguarding
          </Link>
          <Link prefetch={false} href={scopedLinks.briefing} className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-700">
            Manager brief
          </Link>
          <Link
            prefetch={false}
            href={scopedLinks.handoverReviews}
            data-testid="handover-workspace-review-link"
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900"
          >
            Handover reviews
          </Link>
          <Link
            prefetch={false}
            href={scopedLinks.orb}
            data-testid="handover-workspace-orb-link"
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-900"
          >
            Ask ORB
          </Link>
        </div>
      </header>

      {loadError ? (
        <p data-testid="handover-workspace-degraded" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          {loadError}
        </p>
      ) : null}

      {dashboard?.summary ? (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          {dashboard.summary}
          {dashboard.shift_label ? (
            <span className="ml-2 text-xs text-slate-500">({dashboard.shift_label})</span>
          ) : null}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.95fr)]">
        <div className="space-y-4 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Your drafts</p>
              <HandoverDraftList
                drafts={drafts}
                activeDraftId={activeDraftId}
                onSelect={(id) => setActiveDraftId(id)}
              />
            </div>
            <HandoverDraftEditor
              childId={childId}
              draftId={activeDraftId}
              initialTitle={activeDraft?.title}
              initialBody={activeDraft?.body}
              initialSections={activeDraft?.sections}
              initialStatus={activeDraft?.status}
              initialReviewStatus={activeDraft?.review_status}
              initialDraft={activeDraft}
              onSaved={(id) => {
                setActiveDraftId(id)
                void refresh()
              }}
            />
          </div>
        </div>
        <HandoverIntelligencePanel dashboard={dashboard} fallbackRoutes={scopedLinks} />
      </section>
    </div>
  )
}

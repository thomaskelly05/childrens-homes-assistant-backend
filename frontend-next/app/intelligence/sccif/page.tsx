'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { SccifAlignmentDashboard } from '@/components/intelligence-sccif/sccif-alignment-dashboard'
import { PageHeader } from '@/components/indicare/ui'
import { homeInspectionReadinessHref, homeReg45Href, homeWorkspaceHref } from '@/lib/navigation/scope-routes'
import type { SccifAlignmentFilters } from '@/lib/os-api/sccif-alignment'

export default function SccifAlignmentPage() {
  const searchParams = useSearchParams()
  const childIdRaw = searchParams.get('child_id')
  const homeIdRaw = searchParams.get('home_id')
  const staffId = searchParams.get('staff_id') || undefined
  const childId = childIdRaw ? Number(childIdRaw) : undefined
  const homeId = homeIdRaw && Number.isFinite(Number(homeIdRaw)) ? String(homeIdRaw) : null
  const filters: SccifAlignmentFilters = {}
  if (childId != null && Number.isFinite(childId)) filters.child_id = childId
  if (staffId) filters.staff_id = staffId
  const inspectionHref = homeId
    ? homeInspectionReadinessHref(homeId)
    : '/intelligence/inspection-readiness'
  const reg44Href = homeId
    ? `${homeInspectionReadinessHref(homeId)}&pack=reg44`
    : '/intelligence/inspection-readiness?pack=reg44'
  const reg45Href = homeId ? homeReg45Href(homeId) : '/intelligence/reg45'

  return (
    <main data-testid="sccif-alignment-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
      <PageHeader
        eyebrow="Inspection evidence support"
        title="SCCIF and Quality Standards alignment"
        description="Quality Standards alignment and SCCIF evidence snapshot — gaps to review for managers. Supports Inspection evidence preparation; does not guarantee compliance or predict grades."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              prefetch={false}
              href={homeId ? homeWorkspaceHref(homeId) : '/select-scope'}
              data-testid="sccif-back-home-workspace"
              className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
            >
              {homeId ? 'Home workspace' : 'Choose home'}
            </Link>
            <Link
              href="/record/governance"
              className="inline-flex min-h-10 items-center rounded-2xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-black text-purple-950"
            >
              Recording governance
            </Link>
            <Link
              prefetch={false}
              href={inspectionHref}
              data-testid="sccif-open-inspection-readiness"
              className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-950"
            >
              Inspection evidence preparation
            </Link>
            <Link
              prefetch={false}
              href={reg44Href}
              data-testid="sccif-generate-reg44"
              className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-600 px-4 py-2.5 text-xs font-black text-white"
            >
              Generate Reg 44
            </Link>
            <Link
              prefetch={false}
              href={reg45Href}
              data-testid="sccif-generate-reg45"
              className="inline-flex min-h-10 items-center rounded-2xl border border-indigo-200 bg-indigo-600 px-4 py-2.5 text-xs font-black text-white"
            >
              Generate Reg 45
            </Link>
          </div>
        }
      />

      <p
        data-testid="sccif-evidence-pack-note"
        className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs font-semibold text-blue-950"
      >
        Evidence pack support: use Inspection evidence preparation to prepare Reg 44 and Reg 45 review packs from safe
        metadata. Not a compliance decision.
      </p>

      <SccifAlignmentDashboard filters={Object.keys(filters).length ? filters : undefined} />
    </main>
  )
}

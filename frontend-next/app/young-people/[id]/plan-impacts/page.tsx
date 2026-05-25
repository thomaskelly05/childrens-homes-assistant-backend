import Link from 'next/link'

import { PlanImpactDashboard } from '@/components/young-people/plan-impacts/plan-impact-dashboard'
import { PageHeader } from '@/components/indicare/ui'

export default async function ChildPlanImpactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div data-testid="child-plan-impacts-page" className="space-y-6">
      <PageHeader
        eyebrow="Plan impacts"
        title="Suggested plan updates"
        description="Review health, education, family, care and risk plan impacts. Accept, reject or create an action — plans are never updated silently."
        action={
          <Link href={`/young-people/${id}/workspace`} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">
            Workspace
          </Link>
        }
      />
      <PlanImpactDashboard childId={id} />
    </div>
  )
}

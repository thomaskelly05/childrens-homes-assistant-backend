import Link from 'next/link'

import { PlanImpactDashboard } from '@/components/young-people/plan-impacts/plan-impact-dashboard'
import { PageHeader } from '@/components/indicare/ui'

export default async function ChildPlanImpactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div data-testid="child-plan-impacts-page" className="space-y-6">
      <PageHeader
        eyebrow="Get to Know Me"
        title="Living care plans"
        description="Each plan has its own guidance and should grow from referral, records, reviews and the child’s voice. Suggested updates wait for manager review before becoming part of the live plan."
        action={
          <Link
            href={`/young-people/${id}/workspace`}
            data-testid="child-plan-impacts-back-workspace"
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700"
          >
            Back to profile
          </Link>
        }
      />
      <PlanImpactDashboard childId={id} />
    </div>
  )
}

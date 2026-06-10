'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { buildCompanyOperatingModel } from '@/lib/founder/company/company-service'

export function FounderCompanyDepartmentsPage() {
  const model = useMemo(() => buildCompanyOperatingModel(), [])

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Executive departments"
          subtitle="Nine departments with Thomas as executive owner and AI agents as department leads."
          showBack
          backHref="/founder/company"
        />

        <FounderSectionCard title="All departments">
          <div className="space-y-3">
            {model.departments.map((dept) => (
              <Link
                key={dept.id}
                href={`/founder/company/departments/${dept.id}`}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition hover:border-cyan-400/30"
              >
                <div>
                  <p className="font-bold text-white">{dept.name}</p>
                  <p className="text-sm text-slate-400">{dept.aiAgentOwner} · {dept.executiveOwner}</p>
                  <p className="mt-1 text-xs text-slate-500">{dept.purpose}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </Link>
            ))}
          </div>
        </FounderSectionCard>
      </div>
    </div>
  )
}

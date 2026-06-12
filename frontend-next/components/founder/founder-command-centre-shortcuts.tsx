'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Beaker,
  CheckSquare,
  Mail,
  PoundSterling,
  Shield,
  Timer,
  Wallet,
  Workflow
} from 'lucide-react'

import { founderGet } from '@/lib/founder/api/founder-api-client'
import type { AutonomyOverview, EmailReportPreview } from '@/lib/founder/autonomy/scheduler-types'

type ShortcutCard = {
  id: string
  title: string
  value: string
  detail?: string
  href: string
  tone: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet'
  icon: typeof CheckSquare
}

const TONE_CLASSES = {
  cyan: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  violet: 'border-violet-400/30 bg-violet-500/10 text-violet-200'
} as const

export function FounderCommandCentreShortcuts() {
  const [cards, setCards] = useState<ShortcutCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      const [autonomyResult, previewResult] = await Promise.all([
        founderGet<{ overview: AutonomyOverview }>('/autonomy/overview'),
        founderGet<{ preview: EmailReportPreview | null; record: { subject?: string; safetyStatus?: string } | null }>(
          '/autonomy/email/preview'
        )
      ])

      if (!active) return

      const overview = autonomyResult.ok ? autonomyResult.data.overview : null
      const preview = previewResult.ok ? previewResult.data : null

      const microCheck = overview?.tasks.find((t) => t.taskType === 'internal_brain_rotating_micro_check')
      const businessReport = overview?.tasks.find((t) => t.taskType === 'daily_business_report')
      const liveGate = overview?.liveLlmGate
      const emailRecord = preview?.record

      const built: ShortcutCard[] = [
        {
          id: 'business-report',
          title: "Today's Business Report",
          value: businessReport?.status ?? 'Scheduled 16:00',
          detail: emailRecord?.subject
            ? `Latest: ${emailRecord.safetyStatus ?? 'dry_run'}`
            : `Daily at ${overview?.emailSettings.dailyHourUtc ?? 16}:00 UTC`,
          href: '/founder/autonomy',
          tone: 'violet',
          icon: Mail
        },
        {
          id: 'brain-audit',
          title: 'Brain audit status',
          value: 'Coverage audit',
          detail: 'Review internal brain domains',
          href: '/founder/intelligence-centre/brain-audit',
          tone: 'emerald',
          icon: Shield
        },
        {
          id: 'approvals',
          title: 'Approvals needing Tom',
          value: `${overview?.liveLlmGate.pendingApprovals.length ?? 0} pending`,
          detail: liveGate?.currentRecommendation
            ? `Live LLM: ${liveGate.currentRecommendation.replace(/_/g, ' ')}`
            : 'Review approval queue',
          href: '/founder/approvals',
          tone: 'amber',
          icon: CheckSquare
        },
        {
          id: 'internal-brain',
          title: 'Latest rotating micro-check',
          value: microCheck?.status ?? 'Unknown',
          detail: microCheck?.lastRunAt
            ? `Last run ${new Date(microCheck.lastRunAt).toLocaleString('en-GB')}`
            : 'Every 15 minutes',
          href: '/founder/intelligence-centre/brain-audit',
          tone: 'emerald',
          icon: Shield
        },
        {
          id: 'live-llm',
          title: 'Live LLM gate status',
          value: liveGate?.liveAdversarialPassed ? 'Adversarial passed' : 'Gated',
          detail: liveGate?.currentRecommendation ? 'Tom approval required' : 'No recommendation pending',
          href: '/founder/autonomy',
          tone: 'cyan',
          icon: Timer
        },
        {
          id: 'weakest-areas',
          title: 'Current weakest areas',
          value: 'Review audit',
          detail: 'Brain coverage gaps and weak domains',
          href: '/founder/intelligence-centre/brain-audit',
          tone: 'amber',
          icon: AlertTriangle
        },
        {
          id: 'revenue',
          title: 'Revenue snapshot',
          value: 'Pipeline review',
          detail: 'Open revenue agent for live pipeline data',
          href: '/founder/revenue',
          tone: 'emerald',
          icon: PoundSterling
        },
        {
          id: 'finance',
          title: 'Finance snapshot',
          value: 'Burn & runway',
          detail: 'Open finance agent for latest snapshot',
          href: '/founder/finance',
          tone: 'violet',
          icon: Wallet
        },
        {
          id: 'learning',
          title: 'Learning proposals',
          value: 'Review proposals',
          detail: 'Approval-gated brain improvements',
          href: '/founder/learning-loop',
          tone: 'cyan',
          icon: Workflow
        },
        {
          id: 'quality',
          title: 'Quality issues',
          value: liveGate && !liveGate.internalHighRiskPassed ? 'Review needed' : 'Monitoring',
          detail: 'Quality Lab and ORB evaluation',
          href: '/founder/quality-lab',
          tone: 'amber',
          icon: Beaker
        },
        {
          id: 'launch-blockers',
          title: 'Launch blockers',
          value: liveGate && !liveGate.liveGoldPassed ? 'Gates active' : 'Review gates',
          detail: 'Launch gates cannot be overridden',
          href: '/founder/orb-evaluation',
          tone: 'rose',
          icon: AlertTriangle
        }
      ]

      setCards(built)
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return <p className="text-sm text-slate-400" data-testid="command-centre-shortcuts-loading">Loading shortcuts…</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="command-centre-shortcuts">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.id}
            href={card.href}
            className={`rounded-2xl border p-4 transition hover:brightness-110 ${TONE_CLASSES[card.tone]}`}
            data-testid={`command-centre-card-${card.id}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" aria-hidden />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">{card.title}</p>
                <p className="mt-1 text-lg font-bold">{card.value}</p>
                {card.detail ? <p className="mt-1 text-xs opacity-80">{card.detail}</p> : null}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

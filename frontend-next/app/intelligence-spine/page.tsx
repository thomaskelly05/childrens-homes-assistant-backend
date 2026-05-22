import Link from 'next/link'

import { IntelligenceSpineActionsPanel } from '@/components/indicare/intelligence/intelligence-spine-actions-panel'
import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { postIntelligenceSpine } from '@/lib/os-api/intelligence-spine'

const DECISION_NOTICE =
  'This is decision support only. It does not replace professional judgement, safeguarding procedures or manager review. Do not treat outputs as a final decision.'

const demoSpine = {
  summary: {
    headline: 'records indicate 4 intelligence themes for structured review; manager oversight suggested',
    evidence_status: 'mixed',
    pattern_count: 4,
    priority_action_count: 3,
    manager_oversight_count: 2
  },
  manager_daily_brief: {
    headline: 'Records indicate 2 areas may need manager review today.',
    urgent_review: ['records indicate manager review may not be visible on significant events; manager oversight required'],
    safeguarding_signals: ['evidence suggests safeguarding themes may need source review'],
    children_to_review: ['evidence suggests child voice may be limited across recent care records; review recommended'],
    suggested_manager_actions: ['confirm manager review in source records']
  },
  patterns: [
    {
      pattern_type: 'child_voice_missing',
      severity: 'medium',
      summary: 'evidence suggests child voice may be limited across recent care records; review recommended'
    },
    {
      pattern_type: 'manager_review_missing',
      severity: 'high',
      summary: 'records indicate manager review may not be visible on significant events; manager oversight required'
    }
  ],
  ofsted_simulation: [
    {
      judgement_area: 'overall_experiences_and_progress',
      evidence_strength: 'emerging',
      inspection_questions: ["Inspectors may ask how children's daily experiences show progress from starting points."]
    },
    {
      judgement_area: 'help_and_protection',
      evidence_strength: 'moderate',
      likely_challenges: ['Manager oversight may not be consistently visible on significant events.']
    },
    {
      judgement_area: 'effectiveness_of_leaders_and_managers',
      evidence_strength: 'limited',
      missing_evidence: ['Reg 45 quality of care review evidence']
    }
  ],
  evidence_graph: {
    graph_summary: 'records indicate 8 evidence nodes and 5 links for human review',
    evidence_gaps: ['Expected missing_episode -> return_home_interview link not visible in passed records.']
  },
  record_quality: [
    {
      record_id: 'dn-1',
      record_type: 'daily_note',
      overall_quality: 'developing',
      therapeutic_language_flags: ['challenging behaviour'],
      manager_review_required: false
    }
  ],
  priority_actions: [
    {
      title: 'Review manager review missing',
      priority: 'urgent',
      suggested_next_step: 'confirm manager review in source records'
    }
  ],
  proposed_actions: [
    {
      id: 'demo-1',
      action_type: 'manager_signoff',
      title: 'Manager sign-off review recommended',
      summary: 'records indicate manager review may not be visible on significant events',
      priority: 'urgent',
      status: 'proposed',
      reason: 'manager oversight suggested',
      suggested_next_step: 'source review required — human decision required',
      regulatory_links: ['Regulation 44'],
      sccif_links: []
    }
  ],
  action_summary: {
    total: 1,
    by_status: { proposed: 1 },
    by_priority: { urgent: 1 },
    urgent_count: 1,
    proposed_count: 1
  },
  action_notice: 'Actions are proposed for manager review and are not automatically accepted.',
  what_has_improved: ['records indicate no major deterioration patterns in supplied evidence; source review still required.'],
  what_has_deteriorated: [],
  manager_review_required: ['records indicate manager review may not be visible on significant events; manager oversight required.']
}

function severityTone(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes('critical') || lower.includes('high')) return 'overdue'
  if (lower.includes('medium')) return 'review'
  return 'available'
}

type PageProps = {
  searchParams?: Promise<{ home_id?: string; child_id?: string }>
}

export default async function IntelligenceSpinePage({ searchParams }: PageProps) {
  const params = (await searchParams) || {}
  const homeId = params.home_id || undefined
  const childId = params.child_id || undefined

  const live = await postIntelligenceSpine({
    mode: 'manager_daily_brief',
    home_id: homeId,
    child_id: childId,
    days: 1,
    include_live_records: true
  })

  const usingDemo = live.source !== 'live'
  const spine = usingDemo ? demoSpine : live.data
  const brief = spine.manager_daily_brief
  const metadata = spine.metadata
  const summary = spine.summary || demoSpine.summary

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow="IndiCare Super Intelligence"
        title="Intelligence Spine"
        description="A calm decision-support layer connecting child journey, safeguarding, chronology, Reg 44/45, workforce and Ofsted readiness evidence. Records indicate themes for review — not final judgements."
        action={
          <Link
            prefetch={false}
            href="/ofsted-readiness"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30"
          >
            Ofsted readiness
          </Link>
        }
      />

      <LiveDataStatus result={live} />

      {usingDemo ? (
        <Card className="border border-amber-200 bg-amber-50/80">
          <p className="text-sm font-bold text-amber-900">
            Demo intelligence shown because live intelligence could not be loaded. Source review required before operational use.
          </p>
          {live.warning ? <p className="mt-2 text-sm text-amber-800">{live.warning}</p> : null}
        </Card>
      ) : null}

      <Card className="border border-amber-100 bg-amber-50/60">
        <p className="text-sm font-bold leading-7 text-amber-900">{spine.decision_support_notice || DECISION_NOTICE}</p>
        <p className="mt-2 text-sm text-amber-800/90">
          Live records analysed: {metadata?.total_records_analysed ?? '—'} ({metadata?.live_records_found ?? 0} from database,{' '}
          {metadata?.supplied_records_found ?? 0} supplied)
        </p>
      </Card>

      {metadata?.collector_warnings?.length ? (
        <Card>
          <SectionHeader eyebrow="Collector" title="Collector warnings" description="Source review required where live data was limited." />
          <ul className="space-y-2">
            {metadata.collector_warnings.map((warning) => (
              <li key={warning} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                {warning}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Review themes" value={summary.pattern_count ?? 0} detail="Pattern signals for manager review" />
        <StatCard label="Priority actions" value={summary.priority_action_count ?? 0} detail="Manager oversight suggested" />
        <StatCard label="Evidence status" value={summary.evidence_status || 'mixed'} detail="Needs source review" />
        <StatCard label="Records analysed" value={metadata?.total_records_analysed ?? 0} detail="Live + supplied payloads" />
      </section>

      <Card>
        <SectionHeader eyebrow="Overview" title="Intelligence Spine Overview" description={summary.headline || 'review recommended'} />
        <p className="text-sm leading-7 text-slate-600">
          The spine orchestrates regulatory ontology, document readiness, pattern detection, evidence graph intelligence, record quality
          review and Ofsted evidence-strength simulation. Mode: {metadata?.mode || 'manager_daily_brief'}.
        </p>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Registered Manager"
          title="Registered Manager Daily Brief"
          description={brief?.headline || 'Calm oversight themes for today — review recommended.'}
        />
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Urgent review</p>
            <ul className="space-y-2">
              {(brief?.urgent_review || []).map((item) => (
                <li key={item} className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                  {item}
                </li>
              ))}
              {!brief?.urgent_review?.length ? (
                <li className="text-sm text-slate-500">No urgent themes returned; source review still recommended.</li>
              ) : null}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Suggested manager actions</p>
            <ul className="space-y-2">
              {(brief?.suggested_manager_actions || []).map((item) => (
                <li key={item} className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Children to review</p>
            <ul className="space-y-2 text-sm font-bold text-slate-600">
              {(brief?.children_to_review || []).slice(0, 5).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Positive progress</p>
            <ul className="space-y-2 text-sm font-bold text-emerald-700">
              {(brief?.positive_progress || []).slice(0, 5).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Overdue actions</p>
            <ul className="space-y-2 text-sm font-bold text-amber-800">
              {(brief?.overdue_actions || []).slice(0, 5).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Leadership" title="Manager oversight prompts" description="Calm oversight themes — not final decisions." />
          <ul className="space-y-3">
            {(spine.manager_review_required || []).map((item) => (
              <li key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Safeguarding" title="Safeguarding Signals" description="Evidence suggests themes only — this may need escalation to professional review." />
          <DataTable
            headers={['Pattern', 'Severity', 'Summary']}
            rows={(spine.patterns || [])
              .filter((p) => /safeguarding|missing|incident|manager_review/.test(p.pattern_type))
              .map((p) => [
                p.pattern_type.replaceAll('_', ' '),
                <StatusBadge key={p.pattern_type} value={p.severity} />,
                p.summary
              ])}
            empty={<EmptyState title="No safeguarding patterns returned" description="Safeguarding records may be limited in the current window." />}
          />
          {(brief?.safeguarding_signals || []).length ? (
            <ul className="mt-4 space-y-2">
              {brief!.safeguarding_signals!.map((line) => (
                <li key={line} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <Card>
        <SectionHeader
          eyebrow="Inspection"
          title="Ofsted Judgement Simulation"
          description="Evidence strength simulation across SCCIF areas. No grades — manager review recommended."
        />
        <DataTable
          headers={['Area', 'Evidence strength', 'Prompt']}
          rows={(spine.ofsted_simulation || []).map((area) => [
            area.judgement_area.replaceAll('_', ' '),
            <StatusBadge key={area.judgement_area} value={area.evidence_strength} />,
            area.inspection_questions?.[0] || area.likely_challenges?.[0] || area.likely_strengths?.[0] || 'review recommended'
          ])}
          empty={<EmptyState title="No simulation returned" description="POST /intelligence/ofsted-simulation with records." />}
        />
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Chronology" title="Evidence Graph Summary" description={spine.evidence_graph?.graph_summary || 'review recommended'} />
          <ul className="space-y-2 text-sm font-bold text-slate-600">
            {(spine.evidence_graph?.evidence_gaps || []).map((gap) => (
              <li key={gap} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                {gap}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionHeader eyebrow="Recording" title="Recording Quality" description="Supportive guidance only — not automatic rewriting." />
          <DataTable
            headers={['Record', 'Quality', 'Flags']}
            rows={(spine.record_quality || []).map((r) => [
              `${r.record_type} ${r.record_id}`,
              <StatusBadge key={r.record_id} value={r.overall_quality} />,
              r.therapeutic_language_flags?.length ? 'therapeutic language review recommended' : 'none flagged'
            ])}
            empty={<EmptyState title="No record reviews" description="Record quality reviews appear when narrative records are available." />}
          />
          {(brief?.quality_of_recording || []).length ? (
            <ul className="mt-4 space-y-2 text-sm font-bold text-slate-600">
              {brief!.quality_of_recording!.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <Card className="border border-blue-100 bg-blue-50/50">
        <SectionHeader
          eyebrow="Stage 3"
          title="Intelligence Actions"
          description="Actions are proposed only. A manager must review and decide."
        />
        <p className="mb-4 text-sm font-bold text-blue-900">
          {spine.action_notice ||
            'Actions are proposed for manager review and are not automatically accepted. Human decision required — not a safeguarding decision.'}
        </p>
        {spine.action_summary ? (
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <StatCard label="Proposed actions" value={spine.action_summary.total ?? 0} detail="Awaiting manager decision" />
            <StatCard label="Urgent" value={spine.action_summary.urgent_count ?? 0} detail="Manager oversight suggested" />
            <StatCard
              label="By status"
              value={Object.keys(spine.action_summary.by_status || {}).length}
              detail={Object.entries(spine.action_summary.by_status || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ') || 'proposed only'}
            />
            <StatCard
              label="By priority"
              value={Object.keys(spine.action_summary.by_priority || {}).length}
              detail={Object.entries(spine.action_summary.by_priority || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ') || '—'}
            />
          </div>
        ) : null}

        <IntelligenceSpineActionsPanel
          proposedActions={spine.proposed_actions || []}
          homeId={homeId}
          childId={childId}
        />
        <div className="mt-8 space-y-6">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-red-500">Urgent manager review</p>
            {(spine.proposed_actions || []).filter((a) => a.priority === 'urgent').length ? (
              <p className="text-sm text-slate-600">
                {(spine.proposed_actions || []).filter((a) => a.priority === 'urgent').length} urgent proposed action(s) — use Action Board for decisions.
              </p>
            ) : (
              <p className="text-sm text-slate-500">No urgent manager review actions in this window.</p>
            )}
          </div>
        </div>
        <p className="mt-6 text-xs font-bold text-slate-500">
          Save proposed actions explicitly before recording accept, dismiss or complete on the audit trail.
        </p>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Actions" title="Priority Actions" />
          <DataTable
            headers={['Action', 'Priority', 'Next step']}
            rows={(spine.priority_actions || []).map((a) => [
              a.title,
              <StatusBadge key={a.title} value={severityTone(a.priority)} />,
              a.suggested_next_step
            ])}
            empty={<EmptyState title="No priority actions" description="Actions are generated from patterns requiring oversight." />}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Trends" title="What Has Improved" />
          <ul className="space-y-2">
            {(spine.what_has_improved || []).map((line) => (
              <li key={line} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <SectionHeader eyebrow="Oversight" title="What Needs Oversight" />
            <ul className="space-y-2">
              {(spine.what_has_deteriorated || spine.patterns || []).map((p) => {
                const text = typeof p === 'string' ? p : p.summary
                const key = typeof p === 'string' ? p : p.pattern_type
                return (
                  <li key={key} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                    {text}
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Connected surfaces" title="Existing IndiCare intelligence" />
        <div className="flex flex-wrap gap-3">
          {[
            ['/intelligence-actions', 'Action Board'],
            ['/intelligence-oversight', 'Oversight review'],
            ['/command-centre', 'Command centre'],
            ['/ofsted-readiness', 'Ofsted readiness'],
            ['/regulatory', 'Regulatory framework'],
            ['/safeguarding', 'Safeguarding'],
            ['/chronology', 'Chronology'],
            ['/governance/command-centre', 'Governance OS']
          ].map(([href, label]) => (
            <Link
              key={href}
              prefetch={false}
              href={href}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
            >
              {label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}

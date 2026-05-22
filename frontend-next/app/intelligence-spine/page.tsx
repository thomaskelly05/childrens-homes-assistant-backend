import Link from 'next/link'

import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'

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
      likely_strengths: ['Records indicate daily note evidence is present for review.'],
      inspection_questions: ['Inspectors may ask how children\'s daily experiences show progress from starting points.']
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
      therapeutic_language_flags: ['\\bchallenging behaviour\\b'],
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
  what_has_improved: ['records indicate no major deterioration patterns in supplied evidence; source review still required.'],
  manager_review_required: ['records indicate manager review may not be visible on significant events; manager oversight required.']
}

function severityTone(value: string) {
  const lower = value.toLowerCase()
  if (lower.includes('critical') || lower.includes('high')) return 'overdue'
  if (lower.includes('medium')) return 'review'
  return 'available'
}

export default function IntelligenceSpinePage() {
  const spine = demoSpine

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

      <Card className="border border-amber-100 bg-amber-50/60">
        <p className="text-sm font-bold leading-7 text-amber-900">{DECISION_NOTICE}</p>
        <p className="mt-2 text-sm text-amber-800/90">
          API endpoints: POST /intelligence/spine, /patterns, /ofsted-simulation, /record-quality, /evidence-graph
        </p>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Review themes" value={spine.summary.pattern_count} detail="Pattern signals in demo view" />
        <StatCard label="Priority actions" value={spine.summary.priority_action_count} detail="Manager oversight suggested" />
        <StatCard label="Evidence status" value={spine.summary.evidence_status} detail="Mixed — needs source review" />
        <StatCard label="Oversight prompts" value={spine.summary.manager_oversight_count} detail="Human-in-the-loop required" />
      </section>

      <Card>
        <SectionHeader
          eyebrow="Overview"
          title="Intelligence Spine Overview"
          description={spine.summary.headline}
        />
        <p className="text-sm leading-7 text-slate-600">
          The spine orchestrates regulatory ontology, document readiness, pattern detection, evidence graph intelligence,
          record quality review and Ofsted evidence-strength simulation. Connect live records via POST /intelligence/spine.
        </p>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Leadership" title="Manager Daily Brief" description="Calm oversight themes for today — review recommended." />
          <ul className="space-y-3">
            {spine.manager_review_required.map((item) => (
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
            rows={spine.patterns
              .filter((p) => /safeguarding|missing|incident|manager_review/.test(p.pattern_type))
              .map((p) => [
                p.pattern_type.replaceAll('_', ' '),
                <StatusBadge key={p.pattern_type} value={p.severity} />,
                p.summary
              ])}
            empty={<EmptyState title="No safeguarding patterns in demo" description="Pass safeguarding records to POST /intelligence/patterns." />}
          />
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
          rows={spine.ofsted_simulation.map((area) => [
            area.judgement_area.replaceAll('_', ' '),
            <StatusBadge key={area.judgement_area} value={area.evidence_strength} />,
            area.inspection_questions?.[0] || area.likely_challenges?.[0] || area.likely_strengths?.[0] || 'review recommended'
          ])}
          empty={<EmptyState title="No simulation returned" description="POST /intelligence/ofsted-simulation with records." />}
        />
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Chronology" title="Evidence Graph Summary" description={spine.evidence_graph.graph_summary} />
          <ul className="space-y-2 text-sm font-bold text-slate-600">
            {spine.evidence_graph.evidence_gaps.map((gap) => (
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
            rows={spine.record_quality.map((r) => [
              `${r.record_type} ${r.record_id}`,
              <StatusBadge key={r.record_id} value={r.overall_quality} />,
              r.therapeutic_language_flags?.length ? 'therapeutic language review recommended' : 'none flagged'
            ])}
            empty={<EmptyState title="No record reviews" description="POST /intelligence/record-quality with narrative records." />}
          />
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Actions" title="Priority Actions" />
          <DataTable
            headers={['Action', 'Priority', 'Next step']}
            rows={spine.priority_actions.map((a) => [
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
            {spine.what_has_improved.map((line) => (
              <li key={line} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <SectionHeader eyebrow="Oversight" title="What Needs Oversight" />
            <ul className="space-y-2">
              {spine.patterns.map((p) => (
                <li key={p.pattern_type} className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                  {p.summary}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      <Card>
        <SectionHeader eyebrow="Connected surfaces" title="Existing IndiCare intelligence" />
        <div className="flex flex-wrap gap-3">
          {[
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

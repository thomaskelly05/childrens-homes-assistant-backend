import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, PageHeader, RecordTimeline, SectionHeader, StatusBadge } from '@/components/indicare/ui'
import { getOsChronology } from '@/lib/os-api/chronology'

export default async function SafeguardingEscalationsPage() {
  const chronologyResult = await getOsChronology({ sourceType: 'safeguarding' })
  const timeline = chronologyResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Safeguarding escalation"
        title="Operational safeguarding flow"
        description="Incident to safeguarding consideration, manager review, strategy discussion, actions, evidence, chronology update and oversight sign-off. No automatic safeguarding conclusions are made."
      />
      <LiveDataStatus result={chronologyResult} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <SectionHeader eyebrow="Workflow" title="Escalation timeline" />
          <RecordTimeline
            items={timeline.map((item) => ({
              id: item.id,
              title: item.title,
              date: item.dateTime,
              body: item.summary,
              href: item.sourceId ? `/safeguarding/${item.sourceId}` : '/safeguarding'
            }))}
          />
        </Card>
        <Card>
          <SectionHeader eyebrow="Review guardrails" title="Safe assistant prompts" />
          <div className="space-y-3">
            {[
              'Does this require safeguarding review?',
              'What follow-up is missing?',
              'Which incidents are linked?',
              'What evidence is missing?',
              'What should management review?'
            ].map((prompt) => (
              <Link key={prompt} href={`/assistant?q=${encodeURIComponent(prompt)}`} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-800">{prompt}</Link>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
            Always use: <StatusBadge value="evidence suggests" /> <StatusBadge value="review required" /> <StatusBadge value="records indicate" />
          </div>
        </Card>
      </section>
    </div>
  )
}

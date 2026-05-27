import Link from 'next/link'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, DataTable, EmptyState, PageHeader, SectionHeader, StatCard, StatusBadge } from '@/components/indicare/ui'
import { getWorkforceRecordingQuality } from '@/lib/os-api/workforce'

export default async function WorkforceRecordingQualityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams
  const result = await getWorkforceRecordingQuality(query.staff_id)
  const quality = result.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workforce Intelligence"
        title="Recording quality intelligence"
        description="Scores staff recording for child voice, safeguarding language, restorative language, vague wording, reflection quality and timeliness."
        action={<Link href="/staff" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30">Staff dashboard</Link>}
      />
      <LiveDataStatus result={result} />
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Average score" value={quality.home_trends?.average_score ?? 'n/a'} detail="Home recording quality" />
        <StatCard label="Records reviewed" value={quality.home_trends?.records_reviewed ?? 0} detail="Daily notes and incidents" />
        <StatCard label="Manager reviews" value={quality.home_trends?.manager_review_required ?? 0} detail="Low-scoring records" />
        <StatCard label="Concerns" value={quality.concerns.length} detail="Vague wording or weak reflection" />
      </section>
      <Card>
        <SectionHeader eyebrow="Practice trends" title="Staff recording quality dashboard" description="Reusable scoring model for managers, reports and ORB." />
        <DataTable
          headers={['Staff', 'Average', 'Rating', 'Child voice', 'Restorative', 'Vague wording']}
          rows={quality.staff_scores.map((item) => [
            String(item.staff_id || 'unknown'),
            String(item.average_score ?? 'n/a'),
            <StatusBadge key="rating" value={String(item.rating || 'not scored')} />,
            `${item.child_voice_presence ?? 0}%`,
            `${item.restorative_language ?? 0}%`,
            String(item.vague_wording ?? 0)
          ])}
          empty={<EmptyState title="No recording quality scores" description="No daily notes, incidents or staff recording quality records were returned." />}
        />
      </Card>
      <Card>
        <SectionHeader eyebrow="Manager review" title="Records needing attention" />
        <DataTable
          headers={['Record', 'Score', 'Reflection', 'Vague wording']}
          rows={quality.concerns.map((item) => [
            item.title || item.record_id || 'Recording',
            String(item.score ?? 'n/a'),
            String(item.reflection_quality || 'not scored'),
            (item.vague_wording_hits || []).join(', ') || 'none'
          ])}
          empty={<EmptyState title="No review concerns" description="No low scoring or vague records were returned." />}
        />
      </Card>
    </div>
  )
}

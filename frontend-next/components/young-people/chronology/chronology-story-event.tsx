import Link from 'next/link'

export function ChronologyStoryEvent({
  event,
  childId
}: {
  event: Record<string, unknown>
  childId: string
}) {
  const title = String(event.title || 'Record')
  const summary = String(event.safe_summary || '')
  const archiveId = event.archive_record_id ? String(event.archive_record_id) : ''

  return (
    <article data-testid="chronology-story-event" className="relative border-l-2 border-sky-200 pl-6 pb-6">
      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-sky-500" />
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {String(event.event_date || '').slice(0, 10) || 'Undated'}
        {event.recorded_at ? ` · recorded ${String(event.recorded_at).slice(0, 10)}` : ''} ·{' '}
        {String(event.source_type || event.record_type || 'record')}
      </p>
      <h3 className="mt-1 text-base font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{summary}</p>
      <p className="mt-2 text-xs text-slate-500">
        {event.author_name ? `Recorded by ${String(event.author_name)}` : null}
        {event.signed_off_by_name ? ` · Signed off by ${String(event.signed_off_by_name)}` : null}
      </p>
      {archiveId ? (
        <Link href={`/young-people/${childId}/archive`} className="mt-2 inline-block text-xs font-black text-sky-700">
          Open archive record →
        </Link>
      ) : null}
    </article>
  )
}

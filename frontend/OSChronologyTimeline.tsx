import React, { useEffect, useMemo, useState } from 'react';

type ChronologyEvent = {
  id: string;
  home_id?: number | null;
  young_person_id?: number | null;
  event_type: string;
  event_title: string;
  event_summary?: string | null;
  event_at: string;
  sccif_area?: string | null;
  regulation_refs?: string[];
  visibility: string;
  is_sensitive: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSChronologyTimeline({
  homeId,
  youngPersonId,
}: {
  homeId?: number;
  youngPersonId?: number;
}) {
  const [events, setEvents] = useState<ChronologyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const search = new URLSearchParams();
      if (homeId) search.set('home_id', String(homeId));
      if (youngPersonId) search.set('young_person_id', String(youngPersonId));
      if (filter) search.set('event_type', filter);

      const response = await fetch(
        API_BASE + '/api/os-command/chronology?' + search.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load chronology');
      }

      const result: ChronologyEvent[] = await response.json();
      setEvents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId, youngPersonId, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, ChronologyEvent[]> = {};

    for (const event of events) {
      const date = new Date(event.event_at).toLocaleDateString();
      groups[date] ||= [];
      groups[date].push(event);
    }

    return groups;
  }, [events]);

  return (
    <main className="rounded-2xl border bg-white p-5 shadow-sm">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chronology Timeline</h1>
          <p className="text-sm text-slate-500">
            Safeguarding, operational and inspection chronology.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All events</option>
            <option value="missing_from_care_started">Missing started</option>
            <option value="missing_from_care_returned">Missing returned</option>
            <option value="medication_escalation">Medication</option>
            <option value="reg40_decision">Reg 40</option>
            <option value="os_command_completed">Command completed</option>
          </select>

          <button
            onClick={() => void load()}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
          Loading chronology timeline...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date}>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {date}
                </div>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-4">
                {items.map((event) => (
                  <TimelineEvent key={event.id} event={event} />
                ))}
              </div>
            </section>
          ))}

          {events.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
              No chronology events found.
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function TimelineEvent({ event }: { event: ChronologyEvent }) {
  return (
    <article className="relative rounded-2xl border bg-slate-50 p-4 pl-6">
      <div className="absolute left-3 top-6 h-2.5 w-2.5 rounded-full bg-slate-900" />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge>{event.event_type.replaceAll('_', ' ')}</Badge>

        {event.sccif_area && (
          <Badge>{event.sccif_area.replaceAll('_', ' ')}</Badge>
        )}

        {event.is_sensitive && (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
            Sensitive
          </span>
        )}
      </div>

      <div className="mb-1 text-lg font-semibold">{event.event_title}</div>

      {event.event_summary && (
        <p className="mb-3 text-sm text-slate-700">
          {event.event_summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>{new Date(event.event_at).toLocaleString()}</span>

        {event.home_id && <span>Home {event.home_id}</span>}

        {event.young_person_id && (
          <span>Young Person {event.young_person_id}</span>
        )}

        <span className="capitalize">{event.visibility}</span>
      </div>

      {event.regulation_refs && event.regulation_refs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.regulation_refs.map((ref) => (
            <span
              key={ref}
              className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700"
            >
              {ref}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium capitalize text-slate-700">
      {children}
    </span>
  );
}

import React, { useEffect, useMemo, useState } from 'react';

type Overlay = {
  overlay_id: string;
  overlay_type: string;
  title: string;
  summary?: string | null;
  severity: string;
  confidence_score: number;
  display_colour?: string | null;
  metadata?: Record<string, unknown>;
};

type TimelineEvent = {
  chronology_event_id: string;
  home_id: number;
  young_person_id?: number | null;
  event_type: string;
  event_title: string;
  event_summary?: string | null;
  event_at: string;
  sccif_area?: string | null;
  overlays: Overlay[];
  overlay_count: number;
  max_overlay_severity_rank?: number | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSChronologyIntelligenceTimeline({
  homeId,
  youngPersonId,
}: {
  homeId?: number;
  youngPersonId?: number;
}) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overlayType, setOverlayType] = useState('');

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (homeId) params.set('home_id', String(homeId));
      if (youngPersonId) params.set('young_person_id', String(youngPersonId));
      if (overlayType) params.set('overlay_type', overlayType);

      const response = await fetch(
        API_BASE + '/api/os-command/chronology-intelligence?' + params.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load chronology intelligence');
      }

      const result: TimelineEvent[] = await response.json();
      setEvents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function generateOverlays() {
    try {
      await fetch(API_BASE + '/api/os-command/chronology-intelligence/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          home_id: homeId,
          young_person_id: youngPersonId,
        }),
      });

      await load();
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void load();
  }, [homeId, youngPersonId, overlayType]);

  const grouped = useMemo(() => {
    const groups: Record<string, TimelineEvent[]> = {};

    for (const event of events) {
      const day = new Date(event.event_at).toLocaleDateString();
      groups[day] ||= [];
      groups[day].push(event);
    }

    return groups;
  }, [events]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-3xl font-bold">Chronology Intelligence</h1>
          <p className="mt-1 text-sm text-slate-600">
            Risk-aware and inspection-aware safeguarding timeline.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={overlayType}
            onChange={(e) => setOverlayType(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All overlays</option>
            <option value="risk">Risk</option>
            <option value="safeguarding_pattern">Safeguarding patterns</option>
            <option value="contextual_risk">Contextual risk</option>
            <option value="inspection_evidence">Inspection evidence</option>
            <option value="manager_review">Manager review</option>
          </select>

          <button
            onClick={() => void generateOverlays()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Generate Intelligence
          </button>

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
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Loading chronology intelligence...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, rows]) => (
            <section key={date}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-semibold">{date}</h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="space-y-4">
                {rows.map((event) => (
                  <article
                    key={event.chronology_event_id}
                    className="rounded-2xl border bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">
                          {event.event_title}
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{event.event_type}</span>

                          {event.sccif_area && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                              {event.sccif_area.replaceAll('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500">
                        <div>
                          {new Date(event.event_at).toLocaleTimeString()}
                        </div>
                        <div>{event.overlay_count} overlays</div>
                      </div>
                    </div>

                    {event.event_summary && (
                      <p className="mb-4 text-sm text-slate-700">
                        {event.event_summary}
                      </p>
                    )}

                    <div className="space-y-3">
                      {(event.overlays || []).map((overlay) => (
                        <div
                          key={overlay.overlay_id}
                          className="rounded-xl border p-4"
                          style={{
                            borderColor: overlay.display_colour || '#cbd5e1',
                          }}
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold">{overlay.title}</div>

                              {overlay.summary && (
                                <p className="mt-1 text-sm text-slate-600">
                                  {overlay.summary}
                                </p>
                              )}
                            </div>

                            <OverlayBadge
                              type={overlay.overlay_type}
                              severity={overlay.severity}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span>
                              Confidence {Math.round(overlay.confidence_score * 100)}%
                            </span>

                            <span className="capitalize">
                              {overlay.overlay_type.replaceAll('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function OverlayBadge({
  type,
  severity,
}: {
  type: string;
  severity: string;
}) {
  const tone =
    severity === 'critical'
      ? 'bg-red-100 text-red-700'
      : severity === 'high'
        ? 'bg-amber-100 text-amber-700'
        : severity === 'moderate'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
        {severity}
      </span>

      <span className="text-[11px] uppercase tracking-wide text-slate-500">
        {type.replaceAll('_', ' ')}
      </span>
    </div>
  );
}

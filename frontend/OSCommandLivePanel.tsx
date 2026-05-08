import React, { useEffect, useMemo, useRef, useState } from 'react';

type LiveEvent = {
  id: string;
  home_id?: number | null;
  young_person_id?: number | null;
  event_type: string;
  title: string;
  entity_table: string;
  entity_id: string;
  created_at: string;
  payload?: Record<string, unknown>;
};

const WS_BASE = (import.meta.env.VITE_WS_BASE_URL || '').replace(/\/$/, '');

export default function OSCommandLivePanel({ homeId }: { homeId?: number }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const qs = homeId ? '?home_id=' + String(homeId) : '';
    const ws = new WebSocket(WS_BASE + '/ws/os-command' + qs);
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data);

        if (parsed.type === 'events' && Array.isArray(parsed.events)) {
          setEvents((current) => {
            const merged = [...parsed.events, ...current];
            const seen = new Set<string>();
            return merged.filter((e) => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            }).slice(0, 100);
          });
        }
      } catch {
        // ignore malformed payloads
      }
    };

    return () => {
      ws.close();
    };
  }, [homeId]);

  const grouped = useMemo(() => {
    const groups: Record<string, LiveEvent[]> = {};

    for (const event of events) {
      const key = event.event_type;
      groups[key] ||= [];
      groups[key].push(event);
    }

    return groups;
  }, [events]);

  return (
    <aside className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Live Operations</h2>
          <p className="text-sm text-slate-500">
            Real-time safeguarding and operational events.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={connected ? 'text-emerald-600' : 'text-red-600'}>
            ●
          </span>
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([eventType, list]) => (
          <section key={eventType}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {eventType.replaceAll('.', ' ')}
            </h3>

            <div className="space-y-2">
              {list.slice(0, 8).map((event) => (
                <article key={event.id} className="rounded-xl border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{event.title}</div>

                      <div className="mt-1 text-xs text-slate-500">
                        {event.entity_table} #{event.entity_id}
                        {event.home_id ? ' | Home ' + String(event.home_id) : ''}
                        {event.young_person_id ? ' | YP ' + String(event.young_person_id) : ''}
                      </div>
                    </div>

                    <time className="text-xs text-slate-400">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {events.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
            Waiting for live operational events...
          </div>
        )}
      </div>
    </aside>
  );
}

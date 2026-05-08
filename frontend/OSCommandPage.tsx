import React, { useEffect, useMemo, useState } from 'react';
import { captureOSCommandItem, fetchOSCommand, updateOSCommandItem } from './osCommandApi';
import type { OSCommandItem, OSCommandResponse } from './osCommandTypes';

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;

export default function OSCommandPage() {
  const [data, setData] = useState<OSCommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const result = await fetchOSCommand({
        domain: domain || undefined,
        priority: priority || undefined,
        limit: 100,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load OS Command');
    }
  }

  useEffect(() => {
    void load();
  }, [domain, priority]);

  const items = useMemo(() => {
    return [...(data?.items ?? [])].sort((a, b) => {
      const ap = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 9;
      const bp = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 9;
      return ap - bp;
    });
  }, [data]);

  async function complete(item: OSCommandItem) {
    setBusyId(item.feed_id);

    try {
      let itemId = item.command_item_id;

      if (!itemId) {
        const captured = await captureOSCommandItem(item.feed_id);
        itemId = captured.id;
      }

      await updateOSCommandItem(itemId, {
        status: 'completed',
        decision: 'Completed from OS Command',
        rationale: 'User marked this command item as complete.',
      });

      await load();
    } finally {
      setBusyId(null);
    }
  }

  const summary = data?.summary?.[0];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">IndiCare OS</p>
          <h1 className="text-3xl font-bold">OS Command</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            One command centre for safeguarding, risk, compliance, manager review and Ofsted readiness.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All domains</option>
            <option value="safeguarding">Safeguarding</option>
            <option value="reg40">Reg 40</option>
            <option value="missing_from_care">Missing</option>
            <option value="risk">Risk</option>
            <option value="quality">Quality</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-3 md:grid-cols-5">
        <Metric label="Open" value={summary?.open_total ?? items.length} />
        <Metric label="Critical" value={summary?.critical_count ?? 0} />
        <Metric label="High" value={summary?.high_count ?? 0} />
        <Metric label="Overdue" value={summary?.overdue_count ?? 0} />
        <Metric label="Reg 40" value={summary?.reg40_count ?? 0} />
      </section>

      <section className="grid gap-4">
        {items.map((item) => (
          <article key={item.feed_id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge>{item.priority}</Badge>
                  <Badge>{item.domain}</Badge>
                  {item.sccif_area && (
                    <Badge>{item.sccif_area.replaceAll('_', ' ')}</Badge>
                  )}
                </div>

                <h2 className="text-lg font-semibold">{item.title}</h2>

                {item.summary && (
                  <p className="mt-1 text-sm text-slate-700">{item.summary}</p>
                )}

                {item.recommended_action && (
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
                    <strong>Recommended action:</strong> {item.recommended_action}
                  </p>
                )}

                <div className="mt-3 text-xs text-slate-500">
                  Source: {item.source_table ?? 'manual'}
                  {item.source_id ? ' #' + String(item.source_id) : ''}
                  {item.due_at ? ' | Due: ' + new Date(item.due_at).toLocaleString() : ''}
                </div>
              </div>

              <button
                onClick={() => void complete(item)}
                disabled={busyId === item.feed_id}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busyId === item.feed_id ? 'Saving...' : 'Mark complete'}
              </button>
            </div>
          </article>
        ))}

        {items.length === 0 && (
          <div className="rounded-2xl border bg-white p-8 text-center text-slate-600">
            No open command items found.
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
      {children}
    </span>
  );
}

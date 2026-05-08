import React, { useEffect, useMemo, useState } from 'react';

type NetworkNode = {
  id: string;
  home_id: number;
  node_type: string;
  display_name: string;
  young_person_id?: number | null;
  risk_level: string;
  outgoing_edges: Array<{
    edge_id: string;
    edge_type: string;
    target_node_id: string;
    strength: number;
    risk_level: string;
    occurrence_count: number;
  }>;
};

type NetworkAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  summary: string;
  status: string;
  created_at: string;
};

type Response = {
  nodes: NetworkNode[];
  alerts: NetworkAlert[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSSafeguardingNetworkBoard({
  homeId,
}: {
  homeId?: number;
}) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (homeId) params.set('home_id', String(homeId));
      if (filter) params.set('node_type', filter);

      const response = await fetch(
        API_BASE + '/api/os-command/safeguarding-network?' + params.toString(),
        { credentials: 'include' },
      );

      const result: Response = await response.json();
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId, filter]);

  const metrics = useMemo(() => {
    const nodes = data?.nodes || [];
    const alerts = data?.alerts || [];

    return {
      nodes: nodes.length,
      highRisk: nodes.filter((n) => ['high', 'critical'].includes(n.risk_level)).length,
      alerts: alerts.length,
      relationships: nodes.reduce((a, b) => a + b.outgoing_edges.length, 0),
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-4xl font-bold">Safeguarding Network Mapping</h1>
          <p className="mt-1 text-sm text-slate-600">
            Contextual safeguarding relationships, peer risks and exploitation intelligence.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-2xl border bg-white px-4 py-3 text-sm"
          >
            <option value="">All node types</option>
            <option value="young_person">Young person</option>
            <option value="location">Location</option>
            <option value="external_person">External person</option>
            <option value="online_contact">Online contact</option>
            <option value="peer">Peer</option>
            <option value="risk_theme">Risk theme</option>
          </select>

          <button
            onClick={() => void load()}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Refresh Network
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
          Loading safeguarding network intelligence...
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <MetricCard title="Network nodes" value={metrics.nodes} />
            <MetricCard title="Relationships" value={metrics.relationships} />
            <MetricCard title="High-risk nodes" value={metrics.highRisk} />
            <MetricCard title="Risk alerts" value={metrics.alerts} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-2xl font-bold">Contextual Safeguarding Network</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Relationship mapping across young people, locations, peers and contextual risks.
                </p>
              </div>

              <div className="space-y-4">
                {(data?.nodes || []).map((node) => (
                  <article
                    key={node.id}
                    className="rounded-2xl border bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{node.display_name}</div>
                        <div className="text-sm capitalize text-slate-500">
                          {node.node_type.replaceAll('_', ' ')}
                        </div>
                      </div>

                      <RiskBadge risk={node.risk_level} />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Relationships
                      </div>

                      <div className="space-y-2">
                        {node.outgoing_edges.length === 0 ? (
                          <div className="text-sm text-slate-400">
                            No active relationships
                          </div>
                        ) : (
                          node.outgoing_edges.map((edge) => (
                            <div
                              key={edge.edge_id}
                              className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2"
                            >
                              <div>
                                <div className="text-sm font-medium capitalize">
                                  {edge.edge_type.replaceAll('_', ' ')}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Occurrences: {edge.occurrence_count}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  Strength {Math.round(edge.strength * 100)}%
                                </span>

                                <RiskBadge risk={edge.risk_level} compact />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-2xl font-bold">Network Risk Alerts</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Shared contextual safeguarding risks and organisational concerns.
                </p>
              </div>

              <div className="space-y-4">
                {(data?.alerts || []).map((alert) => (
                  <article
                    key={alert.id}
                    className="rounded-2xl border bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{alert.title}</div>
                        <div className="text-sm text-slate-500 capitalize">
                          {alert.alert_type.replaceAll('_', ' ')}
                        </div>
                      </div>

                      <RiskBadge risk={alert.severity} />
                    </div>

                    <p className="mb-4 text-sm text-slate-700">
                      {alert.summary}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">
                        Status: {alert.status.replaceAll('_', ' ')}
                      </span>

                      <span>
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-4xl font-bold">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{title}</div>
    </div>
  );
}

function RiskBadge({
  risk,
  compact = false,
}: {
  risk: string;
  compact?: boolean;
}) {
  const tone =
    risk === 'critical'
      ? 'bg-red-100 text-red-700'
      : risk === 'high'
        ? 'bg-amber-100 text-amber-700'
        : risk === 'moderate'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span
      className={`rounded-full font-semibold capitalize ${tone} ${
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      {risk}
    </span>
  );
}

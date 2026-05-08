import React, { useEffect, useMemo, useState } from 'react';

type CommandCentre = {
  id: string;
  provider_id?: number | null;
  total_homes: number;
  urgent_homes: number;
  critical_commands: number;
  immediate_actions: number;
  active_missing_episodes: number;
  overdue_reg40_count: number;
  high_risk_patterns: number;
  critical_risk_snapshots: number;
  low_resilience_homes: number;
  inspection_urgent_homes: number;
  average_quality_score?: number | null;
  average_resilience_score?: number | null;
  leadership_recommendations: string[];
  provider_state: string;
};

type HomeMatrix = {
  home_id: number;
  open_commands: number;
  critical_commands: number;
  overdue_commands: number;
  safeguarding_pressure: number;
  quality_pressure: number;
  oversight_state?: string | null;
  readiness_state?: string | null;
  resilience_state?: string | null;
  risk_level?: string | null;
  immediate_actions: number;
  today_actions: number;
  quality_score: number;
  matrix_state: string;
};

type Response = {
  command_centre: CommandCentre[];
  home_matrix: HomeMatrix[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSProviderCommandCentre() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const response = await fetch(
        API_BASE + '/api/os-command/provider-command-centre',
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
  }, []);

  const executive = data?.command_centre?.[0];

  const summary = useMemo(() => {
    return {
      homes: executive?.total_homes || 0,
      urgent: executive?.urgent_homes || 0,
      criticalCommands: executive?.critical_commands || 0,
      immediate: executive?.immediate_actions || 0,
    };
  }, [executive]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-4xl font-bold">Provider Command Centre</h1>
          <p className="mt-1 text-sm text-slate-600">
            Executive safeguarding intelligence and operational oversight.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void load()}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Refresh Command Centre
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-3xl border bg-white p-10 text-center text-slate-500">
          Loading provider command intelligence...
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-4">
            <ExecutiveCard title="Homes" value={summary.homes} />
            <ExecutiveCard title="Urgent Homes" value={summary.urgent} />
            <ExecutiveCard title="Critical Commands" value={summary.criticalCommands} />
            <ExecutiveCard title="Immediate Actions" value={summary.immediate} />
          </section>

          {executive && (
            <section className="mb-6 rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Executive Safeguarding State</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Provider-wide safeguarding, inspection and resilience oversight.
                  </p>
                </div>

                <ProviderStateBadge state={executive.provider_state} />
              </div>

              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <MetricBlock
                  label="Active missing episodes"
                  value={executive.active_missing_episodes}
                />
                <MetricBlock
                  label="Overdue Reg 40s"
                  value={executive.overdue_reg40_count}
                />
                <MetricBlock
                  label="High risk patterns"
                  value={executive.high_risk_patterns}
                />
                <MetricBlock
                  label="Critical risk snapshots"
                  value={executive.critical_risk_snapshots}
                />
                <MetricBlock
                  label="Low resilience homes"
                  value={executive.low_resilience_homes}
                />
                <MetricBlock
                  label="Inspection urgent homes"
                  value={executive.inspection_urgent_homes}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Organisational Quality
                  </div>

                  <div className="space-y-3">
                    <MetricLine
                      label="Average quality score"
                      value={Math.round(executive.average_quality_score || 0)}
                    />

                    <MetricLine
                      label="Average resilience score"
                      value={Math.round(executive.average_resilience_score || 0)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Leadership Recommendations
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700">
                    {(executive.leadership_recommendations || [])
                      .filter(Boolean)
                      .map((rec) => (
                        <li key={rec}>• {rec}</li>
                      ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Multi-Home Operational Matrix</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cross-home safeguarding pressure, resilience and inspection visibility.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-3 py-3">Home</th>
                    <th className="px-3 py-3">State</th>
                    <th className="px-3 py-3">Critical</th>
                    <th className="px-3 py-3">Immediate</th>
                    <th className="px-3 py-3">Overdue</th>
                    <th className="px-3 py-3">Inspection</th>
                    <th className="px-3 py-3">Resilience</th>
                    <th className="px-3 py-3">Risk</th>
                    <th className="px-3 py-3">Quality</th>
                  </tr>
                </thead>

                <tbody>
                  {(data?.home_matrix || []).map((home) => (
                    <tr key={home.home_id} className="border-b last:border-b-0">
                      <td className="px-3 py-4 font-semibold">
                        Home #{home.home_id}
                      </td>

                      <td className="px-3 py-4">
                        <MatrixStateBadge state={home.matrix_state} />
                      </td>

                      <td className="px-3 py-4">{home.critical_commands}</td>
                      <td className="px-3 py-4">{home.immediate_actions}</td>
                      <td className="px-3 py-4">{home.overdue_commands}</td>

                      <td className="px-3 py-4 capitalize">
                        {home.readiness_state || 'unknown'}
                      </td>

                      <td className="px-3 py-4 capitalize">
                        {home.resilience_state || 'unknown'}
                      </td>

                      <td className="px-3 py-4 capitalize">
                        {home.risk_level || 'unknown'}
                      </td>

                      <td className="px-3 py-4">
                        {Math.round(home.quality_score || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function ExecutiveCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-4xl font-bold">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{title}</div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ProviderStateBadge({ state }: { state: string }) {
  const tone =
    state === 'critical'
      ? 'bg-red-100 text-red-700'
      : state === 'high'
        ? 'bg-amber-100 text-amber-700'
        : state === 'monitor'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${tone}`}>
      {state}
    </span>
  );
}

function MatrixStateBadge({ state }: { state: string }) {
  const tone =
    state === 'critical'
      ? 'bg-red-100 text-red-700'
      : state === 'high'
        ? 'bg-amber-100 text-amber-700'
        : state === 'workforce_pressure'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {state.replaceAll('_', ' ')}
    </span>
  );
}

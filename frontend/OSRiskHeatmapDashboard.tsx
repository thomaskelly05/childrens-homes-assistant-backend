import React, { useEffect, useMemo, useState } from 'react';

type HeatmapRow = {
  home_id: number;
  young_person_id?: number | null;
  overall_risk_level: string;
  overall_risk_score: number;
  safeguarding_score: number;
  missing_risk_score: number;
  medication_risk_score: number;
  workforce_risk_score: number;
  compliance_risk_score: number;
  inspection_risk_score: number;
  ai_summary?: string | null;
  calculated_at: string;
  heatmap_colour: string;
};

type TrendRow = {
  reporting_week: string;
  critical_risk_homes: number;
  high_risk_homes: number;
  avg_risk_score?: number | null;
  avg_safeguarding_score?: number | null;
  avg_missing_risk_score?: number | null;
  avg_compliance_risk_score?: number | null;
  avg_inspection_risk_score?: number | null;
};

type AnalyticsResponse = {
  heatmap: HeatmapRow[];
  trends: TrendRow[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSRiskHeatmapDashboard({
  homeId,
}: {
  homeId?: number;
}) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (homeId) params.set('home_id', String(homeId));

      const response = await fetch(
        API_BASE + '/api/os-command/risk-analytics?' + params.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load risk analytics');
      }

      const result: AnalyticsResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId]);

  const totals = useMemo(() => {
    const rows = data?.heatmap || [];

    return {
      critical: rows.filter((r) => r.overall_risk_level === 'critical').length,
      high: rows.filter((r) => r.overall_risk_level === 'high').length,
      avg:
        rows.length > 0
          ? Math.round(
              rows.reduce((sum, row) => sum + row.overall_risk_score, 0) /
                rows.length,
            )
          : 0,
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-3xl font-bold">Risk Intelligence</h1>
          <p className="mt-1 text-sm text-slate-600">
            Predictive safeguarding analytics and operational risk visibility.
          </p>
        </div>

        <button
          onClick={() => void load()}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Refresh
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <MetricCard label="Critical Risk" value={totals.critical} />
        <MetricCard label="High Risk" value={totals.high} />
        <MetricCard label="Average Risk Score" value={totals.avg} />
      </section>

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Loading risk analytics...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Operational Heatmap</h2>
              <p className="text-sm text-slate-500">
                Current safeguarding and operational pressure.
              </p>
            </div>

            <div className="space-y-4">
              {(data?.heatmap || []).map((row, index) => (
                <HeatmapCard key={index} row={row} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Trend Intelligence</h2>
              <p className="text-sm text-slate-500">
                Cross-home safeguarding and inspection trends.
              </p>
            </div>

            <div className="space-y-3">
              {(data?.trends || []).map((trend, index) => (
                <TrendCard key={index} row={trend} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function HeatmapCard({ row }: { row: HeatmapRow }) {
  return (
    <article className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Home {row.home_id}</div>

          {row.young_person_id && (
            <div className="text-sm text-slate-500">
              Young Person {row.young_person_id}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: row.heatmap_colour }}
          />

          <span className="text-sm font-semibold capitalize">
            {row.overall_risk_level}
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <Stat label="Overall" value={Math.round(row.overall_risk_score)} />
        <Stat label="Safeguarding" value={Math.round(row.safeguarding_score)} />
        <Stat label="Missing" value={Math.round(row.missing_risk_score)} />
        <Stat label="Medication" value={Math.round(row.medication_risk_score)} />
        <Stat label="Compliance" value={Math.round(row.compliance_risk_score)} />
        <Stat label="Inspection" value={Math.round(row.inspection_risk_score)} />
      </div>

      {row.ai_summary && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          {row.ai_summary}
        </div>
      )}
    </article>
  );
}

function TrendCard({ row }: { row: TrendRow }) {
  return (
    <article className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">
          {new Date(row.reporting_week).toLocaleDateString()}
        </div>

        <div className="text-xs text-slate-500">
          Avg risk {Math.round(row.avg_risk_score || 0)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Critical" value={row.critical_risk_homes} />
        <Stat label="High" value={row.high_risk_homes} />
        <Stat
          label="Safeguarding"
          value={Math.round(row.avg_safeguarding_score || 0)}
        />
        <Stat
          label="Inspection"
          value={Math.round(row.avg_inspection_risk_score || 0)}
        />
      </div>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

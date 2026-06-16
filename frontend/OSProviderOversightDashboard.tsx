import React, { useEffect, useMemo, useState } from 'react';
import type {
  InspectionReadinessRow,
  OversightResponse,
  ProviderOversightRow,
  SCCIFEvidenceSummaryRow,
} from './osOversightTypes';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSProviderOversightDashboard() {
  const [data, setData] = useState<OversightResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_BASE + '/api/os-command/provider-oversight', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load oversight dashboard');
      }

      const result: OversightResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const oversight = data?.oversight || [];

    return {
      homes: oversight.length,
      critical: oversight.reduce((sum, row) => sum + row.critical_commands, 0),
      overdue: oversight.reduce((sum, row) => sum + row.overdue_commands, 0),
      safeguarding: oversight.reduce((sum, row) => sum + row.safeguarding_pressure, 0),
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-3xl font-bold">Provider Oversight</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Cross-home safeguarding, compliance and inspection oversight.
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

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <MetricCard label="Homes" value={totals.homes} />
        <MetricCard label="Critical" value={totals.critical} />
        <MetricCard label="Overdue" value={totals.overdue} />
        <MetricCard label="Safeguarding Pressure" value={totals.safeguarding} />
      </section>

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Loading oversight dashboard...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Operational Oversight</h2>
                <p className="text-sm text-slate-500">
                  Live provider-level operational pressure.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(data?.oversight || []).map((row) => (
                <OversightCard key={row.home_id} row={row} />
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Inspection evidence preparation</h2>
                <p className="text-sm text-slate-500">
                  SCCIF and operational readiness indicators.
                </p>
              </div>

              <div className="space-y-3">
                {(data?.readiness || []).map((row) => (
                  <InspectionCard key={row.home_id} row={row} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Evidence Coverage</h2>
                <p className="text-sm text-slate-500">
                  SCCIF evidence distribution.
                </p>
              </div>

              <div className="space-y-3">
                {(data?.evidence || []).map((row, index) => (
                  <EvidenceCard key={index} row={row} />
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
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

function OversightCard({ row }: { row: ProviderOversightRow }) {
  return (
    <article className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Home {row.home_id}</div>
          <div className="text-sm text-slate-500">
            {row.open_commands} open operational items
          </div>
        </div>

        <StatusBadge state={row.oversight_state} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <Stat label="Critical" value={row.critical_commands} />
        <Stat label="High" value={row.high_commands} />
        <Stat label="Overdue" value={row.overdue_commands} />
        <Stat label="Safeguarding" value={row.safeguarding_pressure} />
      </div>
    </article>
  );
}

function InspectionCard({ row }: { row: InspectionReadinessRow }) {
  return (
    <article className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Home {row.home_id}</div>
          <div className="text-sm text-slate-500">
            Strong evidence: {row.strong_evidence}
          </div>
        </div>

        <StatusBadge state={row.readiness_state} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Critical" value={row.critical_open} />
        <Stat label="Reg 40" value={row.reg40_overdue} />
        <Stat label="Missing" value={row.active_missing} />
        <Stat label="Evidence gaps" value={row.evidence_gaps} />
      </div>
    </article>
  );
}

function EvidenceCard({ row }: { row: SCCIFEvidenceSummaryRow }) {
  return (
    <article className="rounded-2xl border bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold capitalize">
          {row.sccif_area.replaceAll('_', ' ')}
        </div>

        <div className="text-xs text-slate-500">
          Home {row.home_id}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <Stat label="Strong" value={row.strong_count} />
        <Stat label="Adequate" value={row.adequate_count} />
        <Stat label="Weak" value={row.weak_count} />
        <Stat label="Gaps" value={row.gap_count} />
      </div>
    </article>
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

function StatusBadge({ state }: { state: string }) {
  const tone =
    state === 'critical' || state === 'urgent'
      ? 'bg-red-100 text-red-700'
      : state === 'high' || state === 'requires_attention'
        ? 'bg-amber-100 text-amber-700'
        : state === 'monitor'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {state.replaceAll('_', ' ')}
    </span>
  );
}

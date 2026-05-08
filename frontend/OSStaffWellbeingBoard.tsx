import React, { useEffect, useMemo, useState } from 'react';

type StaffWellbeing = {
  id: string;
  home_id: number;
  staff_id: number;
  wellbeing_score: number;
  burnout_risk_score: number;
  risk_level: string;
  safeguarding_command_count: number;
  critical_command_count: number;
  missing_episode_exposure_count: number;
  rota_instability_score: number;
  emotional_load_score: number;
  leadership_concern: boolean;
  recommendations: string[];
};

type HomeResilience = {
  id: string;
  home_id: number;
  resilience_score: number;
  staffing_pressure_score: number;
  safeguarding_workforce_pressure: number;
  high_risk_staff_count: number;
  critical_risk_staff_count: number;
  open_workforce_commands: number;
  resilience_state: string;
  leadership_summary?: string | null;
  recommendations: string[];
};

type Response = {
  staff: StaffWellbeing[];
  homes: HomeResilience[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSStaffWellbeingBoard({
  homeId,
}: {
  homeId?: number;
}) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState('');

  async function load() {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (homeId) params.set('home_id', String(homeId));
      if (riskFilter) params.set('risk_level', riskFilter);

      const response = await fetch(
        API_BASE + '/api/os-command/staff-wellbeing?' + params.toString(),
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
  }, [homeId, riskFilter]);

  const summary = useMemo(() => {
    const staff = data?.staff || [];

    return {
      critical: staff.filter((s) => s.risk_level === 'critical').length,
      high: staff.filter((s) => s.risk_level === 'high').length,
      avgBurnout:
        staff.length === 0
          ? 0
          : Math.round(
              staff.reduce((a, b) => a + b.burnout_risk_score, 0) / staff.length,
            ),
    };
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-3xl font-bold">Workforce Wellbeing</h1>
          <p className="mt-1 text-sm text-slate-600">
            Burnout intelligence, safer staffing analytics and organisational resilience.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All risk levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => void load()}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Refresh
          </button>
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Loading workforce intelligence...
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <MetricCard title="Critical burnout risks" value={summary.critical} />
            <MetricCard title="High burnout risks" value={summary.high} />
            <MetricCard title="Average burnout score" value={summary.avgBurnout} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Staff Wellbeing Risk</h2>
                <p className="text-sm text-slate-500">
                  Safeguarding workload exposure and burnout indicators.
                </p>
              </div>

              <div className="space-y-4">
                {(data?.staff || []).map((staff) => (
                  <article
                    key={staff.id}
                    className="rounded-2xl border bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          Staff #{staff.staff_id}
                        </div>
                        <div className="text-sm text-slate-500">
                          Wellbeing score {Math.round(staff.wellbeing_score)}
                        </div>
                      </div>

                      <RiskBadge risk={staff.risk_level} />
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <Stat
                        label="Burnout"
                        value={Math.round(staff.burnout_risk_score)}
                      />
                      <Stat
                        label="Safeguarding"
                        value={staff.safeguarding_command_count}
                      />
                      <Stat
                        label="Critical"
                        value={staff.critical_command_count}
                      />
                      <Stat
                        label="Missing"
                        value={staff.missing_episode_exposure_count}
                      />
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {staff.leadership_concern && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          Leadership concern
                        </span>
                      )}

                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                        Emotional load {Math.round(staff.emotional_load_score)}
                      </span>

                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                        Rota instability {Math.round(staff.rota_instability_score)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Recommendations
                      </div>

                      <ul className="space-y-1 text-sm text-slate-700">
                        {staff.recommendations.map((rec) => (
                          <li key={rec}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Home Resilience</h2>
                <p className="text-sm text-slate-500">
                  Organisational safeguarding resilience and staffing sustainability.
                </p>
              </div>

              <div className="space-y-4">
                {(data?.homes || []).map((home) => (
                  <article
                    key={home.id}
                    className="rounded-2xl border bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          Home #{home.home_id}
                        </div>
                        <div className="text-sm text-slate-500">
                          Resilience score {Math.round(home.resilience_score)}
                        </div>
                      </div>

                      <ResilienceBadge state={home.resilience_state} />
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                      <Stat
                        label="High risk staff"
                        value={home.high_risk_staff_count}
                      />
                      <Stat
                        label="Critical risk staff"
                        value={home.critical_risk_staff_count}
                      />
                      <Stat
                        label="Staffing pressure"
                        value={Math.round(home.staffing_pressure_score)}
                      />
                      <Stat
                        label="Safeguarding pressure"
                        value={Math.round(home.safeguarding_workforce_pressure)}
                      />
                    </div>

                    {home.leadership_summary && (
                      <p className="mb-4 text-sm text-slate-700">
                        {home.leadership_summary}
                      </p>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Leadership recommendations
                      </div>

                      <ul className="space-y-1 text-sm text-slate-700">
                        {home.recommendations.map((rec) => (
                          <li key={rec}>• {rec}</li>
                        ))}
                      </ul>
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
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{title}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const tone =
    risk === 'critical'
      ? 'bg-red-100 text-red-700'
      : risk === 'high'
        ? 'bg-amber-100 text-amber-700'
        : risk === 'moderate'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {risk}
    </span>
  );
}

function ResilienceBadge({ state }: { state: string }) {
  const tone =
    state === 'critical'
      ? 'bg-red-100 text-red-700'
      : state === 'high'
        ? 'bg-amber-100 text-amber-700'
        : state === 'moderate'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {state}
    </span>
  );
}

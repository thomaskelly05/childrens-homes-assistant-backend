import React, { useEffect, useMemo, useState } from 'react';

type Pattern = {
  id: string;
  home_id: number;
  young_person_id?: number | null;
  pattern_type: string;
  category: string;
  title: string;
  summary?: string | null;
  severity: string;
  confidence_score: number;
  occurrence_count: number;
  escalation_status: string;
  risk_indicators: string[];
  recommended_actions: string[];
  last_detected_at: string;
};

type ContextualRisk = {
  id: string;
  home_id: number;
  young_person_id: number;
  indicator_type: string;
  severity: string;
  source: string;
  summary: string;
  requires_strategy_discussion: boolean;
  identified_at: string;
};

type PatternResponse = {
  patterns: Pattern[];
  contextual_risks: ContextualRisk[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSSafeguardingPatternsBoard({
  homeId,
}: {
  homeId?: number;
}) {
  const [data, setData] = useState<PatternResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState('');

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (homeId) params.set('home_id', String(homeId));
      if (severity) params.set('severity', severity);

      const response = await fetch(
        API_BASE + '/api/os-command/safeguarding-patterns?' + params.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load safeguarding patterns');
      }

      const result: PatternResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId, severity]);

  const groupedPatterns = useMemo(() => {
    const groups: Record<string, Pattern[]> = {};

    for (const pattern of data?.patterns || []) {
      groups[pattern.severity] ||= [];
      groups[pattern.severity].push(pattern);
    }

    return groups;
  }, [data]);

  async function detectPatterns() {
    try {
      await fetch(API_BASE + '/api/os-command/safeguarding-patterns/detect', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          home_id: homeId,
        }),
      });

      await load();
    } catch {
      // ignore
    }
  }

  async function updatePattern(id: string, status: string) {
    try {
      await fetch(API_BASE + '/api/os-command/safeguarding-patterns/' + id, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escalation_status: status,
          management_note: 'Reviewed from safeguarding intelligence board.',
        }),
      });

      await load();
    } catch {
      // ignore
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-3xl font-bold">Safeguarding Intelligence</h1>
          <p className="mt-1 text-sm text-slate-600">
            Escalating patterns, contextual safeguarding risks and operational intelligence.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>

          <button
            onClick={() => void detectPatterns()}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Detect Patterns
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
          Loading safeguarding intelligence...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Escalating Patterns</h2>
              <p className="text-sm text-slate-500">
                Behavioural, safeguarding and contextual escalation intelligence.
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedPatterns).map(([level, items]) => (
                <section key={level}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {level}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {items.map((pattern) => (
                      <article
                        key={pattern.id}
                        className="rounded-2xl border bg-slate-50 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{pattern.title}</div>

                            {pattern.summary && (
                              <p className="mt-1 text-sm text-slate-600">
                                {pattern.summary}
                              </p>
                            )}
                          </div>

                          <SeverityBadge severity={pattern.severity} />
                        </div>

                        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
                          <Stat label="Confidence" value={`${Math.round(pattern.confidence_score * 100)}%`} />
                          <Stat label="Occurrences" value={pattern.occurrence_count} />
                          <Stat label="Status" value={pattern.escalation_status} />
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                          {(pattern.risk_indicators || []).map((risk) => (
                            <span
                              key={risk}
                              className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700"
                            >
                              {risk}
                            </span>
                          ))}
                        </div>

                        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Recommended Actions
                          </div>

                          <ul className="space-y-1 text-sm text-slate-700">
                            {(pattern.recommended_actions || []).map((action) => (
                              <li key={action}>• {action}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => void updatePattern(pattern.id, 'reviewing')}
                            className="rounded-xl border bg-white px-3 py-2 text-sm font-medium"
                          >
                            Reviewing
                          </button>

                          <button
                            onClick={() => void updatePattern(pattern.id, 'actioned')}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Actioned
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Contextual Risks</h2>
              <p className="text-sm text-slate-500">
                Emerging exploitation and safeguarding indicators.
              </p>
            </div>

            <div className="space-y-3">
              {(data?.contextual_risks || []).map((risk) => (
                <article
                  key={risk.id}
                  className="rounded-2xl border bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {risk.indicator_type.replaceAll('_', ' ')}
                      </div>

                      <div className="text-sm text-slate-500">
                        Young Person {risk.young_person_id}
                      </div>
                    </div>

                    <SeverityBadge severity={risk.severity} />
                  </div>

                  <p className="mb-3 text-sm text-slate-700">{risk.summary}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{risk.source}</span>

                    {risk.requires_strategy_discussion && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                        Strategy discussion required
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const tone =
    severity === 'critical'
      ? 'bg-red-100 text-red-700'
      : severity === 'high'
        ? 'bg-amber-100 text-amber-700'
        : severity === 'moderate'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {severity}
    </span>
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

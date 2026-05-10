import React, { useEffect, useMemo, useState } from 'react';

type Workspace = {
  id: string;
  home_id: number;
  title: string;
  status: string;
  total_items: number;
  inspector_visible_items: number;
  cep_items: number;
  hp_items: number;
  lm_items: number;
  evidence_gaps: number;
  created_at: string;
};

type WorkspaceItem = {
  id: string;
  workspace_id: string;
  sccif_area: string;
  item_type: string;
  title: string;
  summary?: string | null;
  strength?: string | null;
  manager_commentary?: string | null;
  inspector_visible: boolean;
  created_at: string;
};

type WorkspaceResponse = {
  workspaces: Workspace[];
  items: WorkspaceItem[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSInspectionModeWorkspace({ homeId }: { homeId?: number }) {
  const [data, setData] = useState<WorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (homeId) params.set('home_id', String(homeId));
      if (selectedWorkspace) params.set('workspace_id', selectedWorkspace);

      const response = await fetch(
        API_BASE + '/api/os-command/inspection/workspaces?' + params.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load inspection workspaces');
      }

      const result: WorkspaceResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId, selectedWorkspace]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, WorkspaceItem[]> = {};

    for (const item of data?.items || []) {
      groups[item.sccif_area] ||= [];
      groups[item.sccif_area].push(item);
    }

    return groups;
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-950">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            IndiCare OS
          </p>
          <h1 className="text-3xl font-bold">Inspection Mode</h1>
          <p className="mt-1 text-sm text-slate-600">
            SCCIF evidence workspaces and Ofsted inspection preparation.
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

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">
          Loading inspection mode...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Inspection Workspaces</h2>
              <p className="text-sm text-slate-500">
                Prepared evidence and SCCIF structures.
              </p>
            </div>

            <div className="space-y-3">
              {(data?.workspaces || []).map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => setSelectedWorkspace(workspace.id)}
                  className="w-full rounded-2xl border bg-slate-50 p-4 text-left transition hover:border-slate-400"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{workspace.title}</div>
                      <div className="text-sm text-slate-500">
                        Home {workspace.home_id}
                      </div>
                    </div>

                    <StatusBadge state={workspace.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Items" value={workspace.total_items} />
                    <Stat label="Visible" value={workspace.inspector_visible_items} />
                    <Stat label="Gaps" value={workspace.evidence_gaps} />
                    <Stat label="Protected" value={workspace.hp_items} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Inspection Evidence</h2>
              <p className="text-sm text-slate-500">
                Chronology-linked SCCIF evidence and management commentary.
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedItems).map(([area, items]) => (
                <section key={area}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {area.replaceAll('_', ' ')}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border bg-slate-50 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{item.title}</div>

                            {item.summary && (
                              <p className="mt-1 text-sm text-slate-600">
                                {item.summary}
                              </p>
                            )}
                          </div>

                          <StrengthBadge strength={item.strength} />
                        </div>

                        {item.manager_commentary && (
                          <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            {item.manager_commentary}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="capitalize">{item.item_type}</span>

                          <span>
                            {item.inspector_visible
                              ? 'Inspector visible'
                              : 'Management only'}
                          </span>

                          <span>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
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
    state === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : state === 'locked'
        ? 'bg-amber-100 text-amber-700'
        : state === 'closed'
          ? 'bg-slate-200 text-slate-700'
          : 'bg-blue-100 text-blue-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {state}
    </span>
  );
}

function StrengthBadge({ strength }: { strength?: string | null }) {
  const tone =
    strength === 'strong'
      ? 'bg-emerald-100 text-emerald-700'
      : strength === 'adequate'
        ? 'bg-blue-100 text-blue-700'
        : strength === 'weak'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-red-100 text-red-700';

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${tone}`}>
      {strength || 'gap'}
    </span>
  );
}

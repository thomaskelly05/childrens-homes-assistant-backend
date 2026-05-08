import React, { useEffect, useMemo, useState } from 'react';

type ShiftBoardRow = {
  shift_session_id: string;
  home_id: number;
  shift_type: string;
  shift_status: string;
  open_tasks: number;
  critical_tasks: number;
  high_tasks: number;
  overdue_tasks: number;
  handover_items: number;
  follow_up_items: number;
  shift_state: string;
  started_at?: string | null;
};

type ShiftTaskRow = {
  id: string;
  home_id: number;
  young_person_id?: number | null;
  title: string;
  summary?: string | null;
  priority: string;
  status: string;
  task_state: string;
  due_at?: string | null;
};

type ShiftBoardResponse = {
  shifts: ShiftBoardRow[];
  tasks: ShiftTaskRow[];
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSShiftLeaderBoard({ homeId }: { homeId?: number }) {
  const [data, setData] = useState<ShiftBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (homeId) params.set('home_id', String(homeId));
      if (selectedShift) params.set('shift_session_id', selectedShift);

      const response = await fetch(
        API_BASE + '/api/os-command/shift-board?' + params.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load shift board');
      }

      const result: ShiftBoardResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId, selectedShift]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, ShiftTaskRow[]> = {};

    for (const task of data?.tasks || []) {
      const key = task.task_state;
      groups[key] ||= [];
      groups[key].push(task);
    }

    return groups;
  }, [data]);

  async function completeTask(taskId: string) {
    try {
      await fetch(API_BASE + '/api/os-command/shift-board/tasks/' + taskId + '/complete', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completion_note: 'Completed from shift leader board',
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
          <h1 className="text-3xl font-bold">Shift Leader Board</h1>
          <p className="mt-1 text-sm text-slate-600">
            Live operational priorities, safeguarding tasks and handovers.
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
          Loading shift board...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Active Shifts</h2>
                <p className="text-sm text-slate-500">
                  Current operational shift state.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(data?.shifts || []).map((shift) => (
                <button
                  key={shift.shift_session_id}
                  onClick={() => setSelectedShift(shift.shift_session_id)}
                  className="w-full rounded-2xl border bg-slate-50 p-4 text-left transition hover:border-slate-400"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">
                        Home {shift.home_id}
                      </div>

                      <div className="text-sm text-slate-500 capitalize">
                        {shift.shift_type} shift
                      </div>
                    </div>

                    <StatusBadge state={shift.shift_state} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Open" value={shift.open_tasks} />
                    <Stat label="Critical" value={shift.critical_tasks} />
                    <Stat label="Overdue" value={shift.overdue_tasks} />
                    <Stat label="Handovers" value={shift.handover_items} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Operational Tasks</h2>
                <p className="text-sm text-slate-500">
                  Prioritised safeguarding and operational actions.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([state, tasks]) => (
                <section key={state}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      {state.replaceAll('_', ' ')}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <article
                        key={task.id}
                        className="rounded-2xl border bg-slate-50 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{task.title}</div>

                            {task.summary && (
                              <p className="mt-1 text-sm text-slate-600">
                                {task.summary}
                              </p>
                            )}
                          </div>

                          <PriorityBadge priority={task.priority} />
                        </div>

                        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>Home {task.home_id}</span>

                          {task.young_person_id && (
                            <span>Young Person {task.young_person_id}</span>
                          )}

                          {task.due_at && (
                            <span>
                              Due {new Date(task.due_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => void completeTask(task.id)}
                            className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                          >
                            Complete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}

              {(data?.tasks || []).length === 0 && (
                <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                  No operational tasks.
                </div>
              )}
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
    state === 'critical'
      ? 'bg-red-100 text-red-700'
      : state === 'high'
        ? 'bg-amber-100 text-amber-700'
        : state === 'active'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {state}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === 'critical'
      ? 'bg-red-100 text-red-700'
      : priority === 'high'
        ? 'bg-amber-100 text-amber-700'
        : priority === 'medium'
          ? 'bg-blue-100 text-blue-700'
          : 'bg-slate-200 text-slate-700';

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${tone}`}>
      {priority}
    </span>
  );
}

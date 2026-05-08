import React, { useEffect, useState } from 'react';

type ManagerReview = {
  id: string;
  home_id: number;
  young_person_id?: number | null;
  review_type: string;
  status: string;
  title: string;
  context_summary: string;
  analysis?: string | null;
  manager_evaluation?: string | null;
  child_impact?: string | null;
  safeguarding_judgement?: string | null;
  actions_required: string[];
  ai_assisted: boolean;
  ai_confidence?: number | null;
  ai_limitations?: string | null;
  board_state: string;
  created_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function OSManagerReviewBoard({
  homeId,
}: {
  homeId?: number;
}) {
  const [reviews, setReviews] = useState<ManagerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ManagerReview | null>(null);
  const [evaluation, setEvaluation] = useState('');
  const [childImpact, setChildImpact] = useState('');
  const [judgement, setJudgement] = useState('');

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (homeId) params.set('home_id', String(homeId));

      const response = await fetch(
        API_BASE + '/api/os-command/manager-reviews?' + params.toString(),
        { credentials: 'include' },
      );

      if (!response.ok) {
        throw new Error('Failed to load manager reviews');
      }

      const result: ManagerReview[] = await response.json();
      setReviews(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [homeId]);

  async function generateReview() {
    try {
      await fetch(API_BASE + '/api/os-command/manager-reviews/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          home_id: homeId,
          review_type: 'safeguarding_review',
        }),
      });

      await load();
    } catch {
      // ignore
    }
  }

  async function approveReview() {
    if (!selectedReview) return;

    try {
      await fetch(
        API_BASE + '/api/os-command/manager-reviews/' + selectedReview.id + '/approve',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            manager_evaluation: evaluation,
            child_impact: childImpact,
            safeguarding_judgement: judgement,
          }),
        },
      );

      setSelectedReview(null);
      setEvaluation('');
      setChildImpact('');
      setJudgement('');

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
          <h1 className="text-3xl font-bold">Manager Reviews</h1>
          <p className="mt-1 text-sm text-slate-600">
            AI-supported safeguarding and leadership oversight reviews.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void generateReview()}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Generate Review
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
          Loading manager reviews...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Review Queue</h2>
              <p className="text-sm text-slate-500">
                Leadership oversight and safeguarding evaluation workflows.
              </p>
            </div>

            <div className="space-y-3">
              {reviews.map((review) => (
                <button
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className="w-full rounded-2xl border bg-slate-50 p-4 text-left transition hover:border-slate-400"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{review.title}</div>
                      <div className="text-sm text-slate-500 capitalize">
                        {review.review_type.replaceAll('_', ' ')}
                      </div>
                    </div>

                    <StatusBadge state={review.board_state} />
                  </div>

                  <div className="text-sm text-slate-600 line-clamp-3">
                    {review.context_summary}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {review.ai_assisted ? 'AI assisted' : 'Manual'}
                    </span>

                    <span>
                      {review.ai_confidence
                        ? `${Math.round(review.ai_confidence * 100)}% confidence`
                        : 'No confidence score'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            {selectedReview ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedReview.title}</h2>
                    <p className="mt-1 text-sm text-slate-500 capitalize">
                      {selectedReview.review_type.replaceAll('_', ' ')}
                    </p>
                  </div>

                  <StatusBadge state={selectedReview.board_state} />
                </div>

                <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-blue-900">
                    AI-assisted oversight
                  </div>

                  <p className="text-sm text-blue-800">
                    {selectedReview.ai_limitations}
                  </p>
                </div>

                <section className="mb-5 rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Context Summary
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {selectedReview.context_summary}
                  </p>
                </section>

                <section className="mb-5 rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    AI Analysis Draft
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {selectedReview.analysis}
                  </p>
                </section>

                <section className="mb-5 rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Recommended Actions
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700">
                    {(selectedReview.actions_required || []).map((action) => (
                      <li key={action}>• {action}</li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Professional Evaluation
                    </label>
                    <textarea
                      value={evaluation}
                      onChange={(e) => setEvaluation(e.target.value)}
                      rows={5}
                      className="w-full rounded-2xl border p-3 text-sm"
                      placeholder="Record management oversight, evaluation and professional analysis..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Child Impact
                    </label>
                    <textarea
                      value={childImpact}
                      onChange={(e) => setChildImpact(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border p-3 text-sm"
                      placeholder="Describe the impact on the child or young person..."
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Safeguarding Judgement
                    </label>
                    <textarea
                      value={judgement}
                      onChange={(e) => setJudgement(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border p-3 text-sm"
                      placeholder="Record safeguarding judgement and required oversight..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => void approveReview()}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
                    >
                      Approve Review
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-slate-500">
                Select a review to begin management evaluation.
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ state }: { state: string }) {
  const tone =
    state === 'overdue_draft'
      ? 'bg-red-100 text-red-700'
      : state === 'awaiting_review'
        ? 'bg-amber-100 text-amber-700'
        : state === 'approved'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-blue-100 text-blue-700';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {state.replaceAll('_', ' ')}
    </span>
  );
}

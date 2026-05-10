-- IndiCare Reg 44 Trend Engine
-- Compares multiple Reg 44 reports to identify recurring safeguarding themes,
-- repeated actions, good-practice patterns and provider-level learning.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.reg44_trend_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id int4 NULL,
  home_id int4 NULL,
  snapshot_scope text NOT NULL DEFAULT 'home',
  period_start date NULL,
  period_end date NULL,

  title text NOT NULL,
  summary text NULL,
  safeguarding_summary text NULL,
  good_practice_summary text NULL,
  repeated_actions_summary text NULL,
  provider_learning_summary text NULL,
  reg45_summary text NULL,

  reports_analysed int4 NOT NULL DEFAULT 0,
  evidence_items_analysed int4 NOT NULL DEFAULT 0,
  actions_analysed int4 NOT NULL DEFAULT 0,

  safeguarding_count int4 NOT NULL DEFAULT 0,
  good_practice_count int4 NOT NULL DEFAULT 0,
  shortfall_count int4 NOT NULL DEFAULT 0,
  overdue_action_count int4 NOT NULL DEFAULT 0,
  reg45_relevant_count int4 NOT NULL DEFAULT 0,

  risk_rating text NOT NULL DEFAULT 'low',
  confidence_score numeric(5,2) NULL,

  created_by int4 NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reg44_trend_snapshots_home ON public.reg44_trend_snapshots(home_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_reg44_trend_snapshots_provider ON public.reg44_trend_snapshots(provider_id, period_end DESC);

CREATE TABLE IF NOT EXISTS public.reg44_trend_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.reg44_trend_snapshots(id) ON DELETE CASCADE,

  provider_id int4 NULL,
  home_id int4 NULL,

  trend_type text NOT NULL,
  theme_key text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  evidence_count int4 NOT NULL DEFAULT 0,
  action_count int4 NOT NULL DEFAULT 0,
  report_count int4 NOT NULL DEFAULT 0,

  first_seen_at date NULL,
  last_seen_at date NULL,
  direction text NOT NULL DEFAULT 'stable',
  severity text NOT NULL DEFAULT 'low',

  safeguarding_relevant boolean NOT NULL DEFAULT false,
  reg45_relevant boolean NOT NULL DEFAULT false,
  provider_learning_relevant boolean NOT NULL DEFAULT false,
  good_practice boolean NOT NULL DEFAULT false,
  repeated_shortfall boolean NOT NULL DEFAULT false,

  example_evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  example_action_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],

  recommended_action text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reg44_trend_items_snapshot ON public.reg44_trend_items(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_reg44_trend_items_home ON public.reg44_trend_items(home_id);
CREATE INDEX IF NOT EXISTS idx_reg44_trend_items_type ON public.reg44_trend_items(trend_type);
CREATE INDEX IF NOT EXISTS idx_reg44_trend_items_severity ON public.reg44_trend_items(severity);

CREATE OR REPLACE VIEW public.vw_reg44_theme_counts AS
SELECT
  e.provider_id,
  e.home_id,
  e.evidence_type::text AS theme_key,
  count(*) AS evidence_count,
  count(DISTINCT e.report_import_id) AS report_count,
  count(*) FILTER (WHERE e.safeguarding_relevant) AS safeguarding_count,
  count(*) FILTER (WHERE e.positive) AS good_practice_count,
  count(*) FILTER (WHERE e.requires_action) AS shortfall_count,
  count(*) FILTER (WHERE e.reg45_relevant) AS reg45_count,
  min(i.visit_date) AS first_seen_at,
  max(i.visit_date) AS last_seen_at
FROM public.reg44_report_evidence_items e
JOIN public.reg44_report_imports i ON i.id = e.report_import_id
GROUP BY e.provider_id, e.home_id, e.evidence_type::text;

CREATE OR REPLACE VIEW public.vw_reg44_repeated_actions AS
SELECT
  a.provider_id,
  a.home_id,
  lower(regexp_replace(left(a.title, 80), '[^a-zA-Z0-9 ]', '', 'g')) AS action_theme,
  count(*) AS action_count,
  count(DISTINCT a.report_import_id) AS report_count,
  count(*) FILTER (WHERE a.status NOT IN ('completed','cancelled')) AS open_count,
  count(*) FILTER (WHERE a.due_date < current_date AND a.status NOT IN ('completed','cancelled')) AS overdue_count,
  min(i.visit_date) AS first_seen_at,
  max(i.visit_date) AS last_seen_at,
  array_agg(a.id ORDER BY a.created_at DESC) FILTER (WHERE a.id IS NOT NULL) AS action_ids
FROM public.reg44_report_actions a
JOIN public.reg44_report_imports i ON i.id = a.report_import_id
GROUP BY a.provider_id, a.home_id, lower(regexp_replace(left(a.title, 80), '[^a-zA-Z0-9 ]', '', 'g'))
HAVING count(*) > 1 OR count(*) FILTER (WHERE a.due_date < current_date AND a.status NOT IN ('completed','cancelled')) > 0;

CREATE OR REPLACE VIEW public.vw_reg44_provider_theme_counts AS
SELECT
  provider_id,
  evidence_type::text AS theme_key,
  count(*) AS evidence_count,
  count(DISTINCT home_id) AS home_count,
  count(DISTINCT report_import_id) AS report_count,
  count(*) FILTER (WHERE safeguarding_relevant) AS safeguarding_count,
  count(*) FILTER (WHERE positive) AS good_practice_count,
  count(*) FILTER (WHERE requires_action) AS shortfall_count,
  count(*) FILTER (WHERE reg45_relevant) AS reg45_count,
  min(created_at)::date AS first_seen_at,
  max(created_at)::date AS last_seen_at
FROM public.reg44_report_evidence_items
GROUP BY provider_id, evidence_type::text;

CREATE OR REPLACE FUNCTION public.reg44_generate_trend_snapshot(
  p_home_id int4 DEFAULT NULL,
  p_provider_id int4 DEFAULT NULL,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL,
  p_created_by int4 DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_snapshot_id uuid;
  v_scope text;
  v_reports int4;
  v_evidence int4;
  v_actions int4;
  v_safeguarding int4;
  v_good int4;
  v_shortfalls int4;
  v_overdue int4;
  v_reg45 int4;
  v_risk text;
BEGIN
  v_scope := CASE WHEN p_home_id IS NOT NULL THEN 'home' WHEN p_provider_id IS NOT NULL THEN 'provider' ELSE 'global' END;

  SELECT count(*) INTO v_reports
  FROM public.reg44_report_imports i
  WHERE (p_home_id IS NULL OR i.home_id = p_home_id)
    AND (p_provider_id IS NULL OR i.provider_id = p_provider_id)
    AND (p_period_start IS NULL OR COALESCE(i.visit_date, i.report_month, i.created_at::date) >= p_period_start)
    AND (p_period_end IS NULL OR COALESCE(i.visit_date, i.report_month, i.created_at::date) <= p_period_end);

  SELECT count(*),
         count(*) FILTER (WHERE safeguarding_relevant),
         count(*) FILTER (WHERE positive),
         count(*) FILTER (WHERE requires_action),
         count(*) FILTER (WHERE reg45_relevant)
  INTO v_evidence, v_safeguarding, v_good, v_shortfalls, v_reg45
  FROM public.reg44_report_evidence_items e
  JOIN public.reg44_report_imports i ON i.id = e.report_import_id
  WHERE (p_home_id IS NULL OR e.home_id = p_home_id)
    AND (p_provider_id IS NULL OR e.provider_id = p_provider_id)
    AND (p_period_start IS NULL OR COALESCE(i.visit_date, i.report_month, i.created_at::date) >= p_period_start)
    AND (p_period_end IS NULL OR COALESCE(i.visit_date, i.report_month, i.created_at::date) <= p_period_end);

  SELECT count(*),
         count(*) FILTER (WHERE due_date < current_date AND status NOT IN ('completed','cancelled'))
  INTO v_actions, v_overdue
  FROM public.reg44_report_actions a
  JOIN public.reg44_report_imports i ON i.id = a.report_import_id
  WHERE (p_home_id IS NULL OR a.home_id = p_home_id)
    AND (p_provider_id IS NULL OR a.provider_id = p_provider_id)
    AND (p_period_start IS NULL OR COALESCE(i.visit_date, i.report_month, i.created_at::date) >= p_period_start)
    AND (p_period_end IS NULL OR COALESCE(i.visit_date, i.report_month, i.created_at::date) <= p_period_end);

  v_risk := CASE
    WHEN COALESCE(v_safeguarding,0) >= 6 OR COALESCE(v_overdue,0) >= 4 THEN 'high'
    WHEN COALESCE(v_safeguarding,0) >= 3 OR COALESCE(v_shortfalls,0) >= 5 OR COALESCE(v_overdue,0) >= 2 THEN 'medium'
    ELSE 'low'
  END;

  INSERT INTO public.reg44_trend_snapshots (
    provider_id, home_id, snapshot_scope, period_start, period_end, title,
    summary, safeguarding_summary, good_practice_summary, repeated_actions_summary,
    provider_learning_summary, reg45_summary, reports_analysed, evidence_items_analysed,
    actions_analysed, safeguarding_count, good_practice_count, shortfall_count,
    overdue_action_count, reg45_relevant_count, risk_rating, confidence_score, created_by
  ) VALUES (
    p_provider_id, p_home_id, v_scope, p_period_start, COALESCE(p_period_end, current_date),
    'Reg 44 trend snapshot - ' || v_scope,
    'Analysed ' || COALESCE(v_reports,0) || ' reports, ' || COALESCE(v_evidence,0) || ' evidence items and ' || COALESCE(v_actions,0) || ' actions.',
    COALESCE(v_safeguarding,0) || ' safeguarding-relevant findings identified.',
    COALESCE(v_good,0) || ' good-practice findings identified.',
    COALESCE(v_overdue,0) || ' overdue or unresolved actions identified.',
    'Provider learning should prioritise recurring shortfalls, safeguarding findings and repeated actions.',
    COALESCE(v_reg45,0) || ' items are relevant to Reg 45 learning.',
    COALESCE(v_reports,0), COALESCE(v_evidence,0), COALESCE(v_actions,0),
    COALESCE(v_safeguarding,0), COALESCE(v_good,0), COALESCE(v_shortfalls,0),
    COALESCE(v_overdue,0), COALESCE(v_reg45,0), v_risk, 0.70, p_created_by
  ) RETURNING id INTO v_snapshot_id;

  INSERT INTO public.reg44_trend_items (
    snapshot_id, provider_id, home_id, trend_type, theme_key, title, summary,
    evidence_count, report_count, first_seen_at, last_seen_at, direction, severity,
    safeguarding_relevant, reg45_relevant, provider_learning_relevant, good_practice,
    repeated_shortfall, recommended_action
  )
  SELECT
    v_snapshot_id, t.provider_id, t.home_id, 'theme', t.theme_key,
    'Recurring Reg 44 theme: ' || t.theme_key,
    t.evidence_count || ' findings across ' || t.report_count || ' reports.',
    t.evidence_count, t.report_count, t.first_seen_at, t.last_seen_at,
    CASE WHEN t.report_count >= 3 THEN 'recurring' ELSE 'stable' END,
    CASE WHEN t.safeguarding_count >= 3 OR t.shortfall_count >= 4 THEN 'high'
         WHEN t.safeguarding_count > 0 OR t.shortfall_count >= 2 THEN 'medium'
         ELSE 'low' END,
    t.safeguarding_count > 0,
    t.reg45_count > 0,
    t.reg45_count > 0 OR t.report_count >= 2,
    t.good_practice_count > 0 AND t.shortfall_count = 0,
    t.shortfall_count > 1,
    CASE WHEN t.safeguarding_count > 0 THEN 'Review safeguarding oversight and ensure management evaluation is evidenced.'
         WHEN t.shortfall_count > 1 THEN 'Create improvement plan and track completion across future Reg 44 visits.'
         WHEN t.good_practice_count > 0 THEN 'Capture and share good practice as provider learning.'
         ELSE 'Monitor theme in future Reg 44 reports.' END
  FROM public.vw_reg44_theme_counts t
  WHERE (p_home_id IS NULL OR t.home_id = p_home_id)
    AND (p_provider_id IS NULL OR t.provider_id = p_provider_id)
    AND t.report_count >= 1;

  INSERT INTO public.reg44_trend_items (
    snapshot_id, provider_id, home_id, trend_type, theme_key, title, summary,
    action_count, report_count, first_seen_at, last_seen_at, direction, severity,
    reg45_relevant, provider_learning_relevant, repeated_shortfall, example_action_ids,
    recommended_action
  )
  SELECT
    v_snapshot_id, r.provider_id, r.home_id, 'repeated_action', r.action_theme,
    'Repeated Reg 44 action: ' || r.action_theme,
    r.action_count || ' similar actions across ' || r.report_count || ' reports. ' || r.overdue_count || ' are overdue.',
    r.action_count, r.report_count, r.first_seen_at, r.last_seen_at,
    CASE WHEN r.report_count >= 3 OR r.overdue_count > 0 THEN 'worsening' ELSE 'recurring' END,
    CASE WHEN r.overdue_count >= 2 THEN 'high' WHEN r.overdue_count = 1 OR r.action_count >= 3 THEN 'medium' ELSE 'low' END,
    true, true, true,
    COALESCE(r.action_ids, ARRAY[]::uuid[]),
    'Review repeated action, assign owner and evidence sustained completion before next Reg 44/Reg 45 review.'
  FROM public.vw_reg44_repeated_actions r
  WHERE (p_home_id IS NULL OR r.home_id = p_home_id)
    AND (p_provider_id IS NULL OR r.provider_id = p_provider_id);

  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE VIEW public.vw_reg44_latest_trend_snapshots AS
SELECT DISTINCT ON (snapshot_scope, COALESCE(provider_id, 0), COALESCE(home_id, 0))
  *
FROM public.reg44_trend_snapshots
ORDER BY snapshot_scope, COALESCE(provider_id, 0), COALESCE(home_id, 0), created_at DESC;

CREATE OR REPLACE VIEW public.vw_reg44_provider_risk_board AS
SELECT
  s.provider_id,
  s.home_id,
  s.risk_rating,
  s.reports_analysed,
  s.safeguarding_count,
  s.shortfall_count,
  s.overdue_action_count,
  s.reg45_relevant_count,
  s.summary,
  s.created_at AS snapshot_at,
  count(t.id) FILTER (WHERE t.severity = 'high') AS high_severity_trends,
  count(t.id) FILTER (WHERE t.repeated_shortfall) AS repeated_shortfall_trends,
  count(t.id) FILTER (WHERE t.good_practice) AS good_practice_trends
FROM public.vw_reg44_latest_trend_snapshots s
LEFT JOIN public.reg44_trend_items t ON t.snapshot_id = s.id
GROUP BY s.id, s.provider_id, s.home_id, s.risk_rating, s.reports_analysed, s.safeguarding_count,
         s.shortfall_count, s.overdue_action_count, s.reg45_relevant_count, s.summary, s.created_at;

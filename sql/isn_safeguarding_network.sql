CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.isn_safeguarding_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id INTEGER,
    home_id INTEGER,
    young_person_id INTEGER,
    signal_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    risk_level TEXT DEFAULT 'medium',
    location_text TEXT,
    postcode_prefix TEXT,
    transport_route TEXT,
    vehicle_description TEXT,
    alias_or_nickname TEXT,
    digital_handle TEXT,
    source_record_type TEXT,
    source_record_id TEXT,
    indicator_tags JSONB DEFAULT '[]'::jsonb,
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    intelligence_notes TEXT,
    anonymised_context JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isn_signal_type
ON public.isn_safeguarding_signals(signal_type);

CREATE INDEX IF NOT EXISTS idx_isn_postcode_prefix
ON public.isn_safeguarding_signals(postcode_prefix);

CREATE INDEX IF NOT EXISTS idx_isn_alias
ON public.isn_safeguarding_signals(alias_or_nickname);

CREATE INDEX IF NOT EXISTS idx_isn_transport_route
ON public.isn_safeguarding_signals(transport_route);

CREATE INDEX IF NOT EXISTS idx_isn_risk_level
ON public.isn_safeguarding_signals(risk_level);

CREATE TABLE IF NOT EXISTS public.isn_safeguarding_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    risk_level TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'new',
    linked_signal_ids JSONB DEFAULT '[]'::jsonb,
    hotspot_key TEXT,
    pattern JSONB DEFAULT '{}'::jsonb,
    recommended_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isn_alert_status
ON public.isn_safeguarding_alerts(status);

CREATE INDEX IF NOT EXISTS idx_isn_alert_risk
ON public.isn_safeguarding_alerts(risk_level);

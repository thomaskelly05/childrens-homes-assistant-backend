-- Idempotent Stripe webhook processing for ORB Residential billing only.

CREATE TABLE IF NOT EXISTS orb_stripe_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_stripe_events_stripe_event_id ON orb_stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_orb_stripe_events_event_type ON orb_stripe_events(event_type);

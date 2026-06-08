-- ORB OAuth CSRF state (one-time, short-lived; validated on API callback host).

CREATE TABLE IF NOT EXISTS orb_oauth_states (
    state_token TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    return_url TEXT NOT NULL,
    start_host TEXT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_oauth_states_expires_at
    ON orb_oauth_states (expires_at);

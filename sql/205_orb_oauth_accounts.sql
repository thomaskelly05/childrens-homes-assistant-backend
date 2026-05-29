-- ORB Residential OAuth provider linkage (standalone users only).

CREATE TABLE IF NOT EXISTS orb_oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_subject TEXT NOT NULL,
    email TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_orb_oauth_accounts_user_id ON orb_oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_oauth_accounts_email ON orb_oauth_accounts(lower(email));

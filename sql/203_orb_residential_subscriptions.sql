-- ORB Residential standalone subscription and safety acceptance
-- Separate from IndiCare OS billing fields on users table.

CREATE TABLE IF NOT EXISTS orb_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    orb_plan TEXT NOT NULL DEFAULT 'orb_residential_individual',
    subscription_status TEXT NOT NULL DEFAULT 'inactive',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    payment_failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_subscriptions_user_id ON orb_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_subscriptions_stripe_customer_id ON orb_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orb_subscriptions_stripe_subscription_id ON orb_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_orb_subscriptions_status ON orb_subscriptions(subscription_status);

CREATE TABLE IF NOT EXISTS orb_safety_acceptances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product TEXT NOT NULL DEFAULT 'orb_residential',
    version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orb_safety_acceptances_user_product_version
    ON orb_safety_acceptances(user_id, product, version);

CREATE INDEX IF NOT EXISTS idx_orb_safety_acceptances_user_id ON orb_safety_acceptances(user_id);

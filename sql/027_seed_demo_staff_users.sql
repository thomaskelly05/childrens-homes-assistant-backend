-- Demo auth users for local/staging validation.
-- Shared demo password: IndiCareDemo123!
-- These accounts are intentionally scoped to the canonical RBAC roles used by the app.

INSERT INTO users (
    email,
    password_hash,
    role,
    home_id,
    first_name,
    last_name,
    archived,
    is_active,
    created_at,
    updated_at
)
VALUES
    (
        'admin.demo@indicare.local',
        '$2b$12$SC8hBPuZKM6YbAi1c6xm9uECJgNx4ZFh1WZTZ2J1RfPAdgH.lEQZW',
        'admin',
        NULL,
        'Avery',
        'Admin',
        FALSE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'manager.demo@indicare.local',
        '$2b$12$q6OQ/9OLLwXW.XJgWPmOIeHvTMUjDzIdMd8gzBHzcpHPPBLmh5boC',
        'manager',
        1,
        'Ella',
        'Morgan',
        FALSE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'deputy.demo@indicare.local',
        '$2b$12$RYDspMkBhXI1FHUDEfk9TOzMv32FBdRNh.ni1MD.pEpRQRoqGemq.',
        'deputy_manager',
        1,
        'Morgan',
        'Reed',
        FALSE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'support.demo@indicare.local',
        '$2b$12$e6j8uYHU33L86doBr1V2TOOSVUqfnUTTYGdCEfjG2KDZtTRkAeVgi',
        'support_worker',
        1,
        'Abi',
        'Clarke',
        FALSE,
        TRUE,
        NOW(),
        NOW()
    ),
    (
        'viewer.demo@indicare.local',
        '$2b$12$RZ2TCKQ8Ha3FxsSOzPY1IeN3IU6uldnGQ/6X3Zfaj2IH2YjiJo2f6',
        'viewer',
        1,
        'Sam',
        'Viewer',
        FALSE,
        TRUE,
        NOW(),
        NOW()
    )
ON CONFLICT (email) DO UPDATE
SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    home_id = EXCLUDED.home_id,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    archived = FALSE,
    is_active = TRUE,
    updated_at = NOW();

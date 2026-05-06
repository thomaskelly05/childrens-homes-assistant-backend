CREATE TABLE IF NOT EXISTS home_setup_items (
    id SERIAL PRIMARY KEY,
    home_id INTEGER NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    item_key TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    required BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),
    due_at TIMESTAMP,
    completed_by INTEGER REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admissions (
    id SERIAL PRIMARY KEY,
    home_id INTEGER NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
    young_person_id INTEGER REFERENCES young_people(id),
    status TEXT NOT NULL DEFAULT 'referral_received',
    placing_authority TEXT,
    social_worker_name TEXT,
    social_worker_email TEXT,
    iro_name TEXT,
    legal_status TEXT,
    reason_for_placement TEXT,
    admission_date DATE,
    compatibility_decision TEXT,
    decision_reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admission_checklist_items (
    id SERIAL PRIMARY KEY,
    admission_id INTEGER NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    item_key TEXT NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    required BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),
    due_at TIMESTAMP,
    completed_by INTEGER REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS home_id INTEGER REFERENCES homes(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS admission_id INTEGER REFERENCES admissions(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist_item_id INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

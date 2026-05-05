CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    home_id INTEGER REFERENCES homes(id) ON DELETE CASCADE,
    young_person_id INTEGER REFERENCES young_people(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    body TEXT,
    notification_type TEXT NOT NULL DEFAULT 'system',
    priority TEXT NOT NULL DEFAULT 'normal',
    href TEXT,
    source TEXT,
    source_ref_type TEXT,
    source_ref_id INTEGER,
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at, dismissed_at);
CREATE INDEX IF NOT EXISTS idx_notifications_home_created ON notifications(home_id, created_at DESC);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS young_person_id INTEGER REFERENCES young_people(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_ref_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_ref_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_source_ref_unique
ON tasks(source, source_ref_type, source_ref_id)
WHERE source IS NOT NULL AND source_ref_type IS NOT NULL AND source_ref_id IS NOT NULL;

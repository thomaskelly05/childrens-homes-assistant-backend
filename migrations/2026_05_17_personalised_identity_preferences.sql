CREATE TABLE IF NOT EXISTS user_profile_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  profile_image_data TEXT,
  theme TEXT DEFAULT 'system',
  accent_color TEXT DEFAULT 'blue',
  assistant_default_mode TEXT DEFAULT 'ofsted',
  assistant_tone TEXT DEFAULT 'professional',
  compact_mode BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_profile_preferences
  ADD COLUMN IF NOT EXISTS role_title TEXT,
  ADD COLUMN IF NOT EXISTS operational_focus TEXT,
  ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pinned_widgets JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden_optional_widgets JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS widget_order JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS favourite_children JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS favourite_templates JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quick_actions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recent_activity JSONB DEFAULT '[]'::jsonb;

ALTER TABLE young_people
  ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_updated_at TIMESTAMPTZ;

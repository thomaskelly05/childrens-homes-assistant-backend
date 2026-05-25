-- Handover workspace drafts (metadata-safe shift notes; not formal handover_records)

CREATE TABLE IF NOT EXISTS public.handover_drafts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'home',
    shift_label TEXT,
    child_id INTEGER,
    child_name TEXT,
    home_id INTEGER,
    body TEXT,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by_user_id TEXT,
    created_by_name TEXT,
    reviewed_by_user_id TEXT,
    reviewed_at TIMESTAMPTZ,
    completed_by_user_id TEXT,
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handover_drafts_scope ON public.handover_drafts (scope);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_child_id ON public.handover_drafts (child_id);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_home_id ON public.handover_drafts (home_id);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_status ON public.handover_drafts (status);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_created_by ON public.handover_drafts (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_created_at ON public.handover_drafts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handover_drafts_updated_at ON public.handover_drafts (updated_at DESC);

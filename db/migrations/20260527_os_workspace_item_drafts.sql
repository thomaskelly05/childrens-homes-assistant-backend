-- IndiCare OS child workspace editable item persistence
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.os_workspace_item_drafts (
    id BIGSERIAL PRIMARY KEY,
    young_person_id INTEGER NOT NULL,
    home_id INTEGER NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    priority TEXT NOT NULL DEFAULT 'normal',
    evidence TEXT NULL,
    action TEXT NULL,
    owner TEXT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by INTEGER NULL,
    updated_by INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT os_workspace_item_drafts_young_person_item_unique UNIQUE (young_person_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_os_workspace_item_drafts_child
    ON public.os_workspace_item_drafts (young_person_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_os_workspace_item_drafts_home
    ON public.os_workspace_item_drafts (home_id, updated_at DESC)
    WHERE home_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_os_workspace_item_drafts_type
    ON public.os_workspace_item_drafts (young_person_id, item_type, status);

COMMENT ON TABLE public.os_workspace_item_drafts IS
    'Editable child workspace draft items used by IndiCare OS while records, plans, reviews and evidence routes are being connected to their canonical tables.';

COMMENT ON COLUMN public.os_workspace_item_drafts.payload IS
    'Extra structured data from the child workspace UI. Keep canonical care records in their specialist tables once the route is fully connected.';

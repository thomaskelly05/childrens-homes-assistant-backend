-- Unify orb_saved_outputs to canonical user-scoped rich schema (ORB Residential hardening).
-- Safe additive migration: detects 075 rich shape vs 200 premium shape vs already canonical.

CREATE TABLE IF NOT EXISTS orb_saved_outputs_orphaned (
    legacy_id TEXT PRIMARY KEY,
    legacy_shape TEXT NOT NULL,
    row_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'orb_saved_outputs'
    ) THEN
        CREATE TABLE orb_saved_outputs (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id TEXT,
            project_name TEXT,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'saved',
            profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
            tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            summary TEXT,
            content_markdown TEXT,
            content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            intelligence_output JSONB NOT NULL DEFAULT '{}'::jsonb,
            sources JSONB NOT NULL DEFAULT '[]'::jsonb,
            citations JSONB NOT NULL DEFAULT '[]'::jsonb,
            quality JSONB NOT NULL DEFAULT '{}'::jsonb,
            model_routing JSONB NOT NULL DEFAULT '{}'::jsonb,
            retrieval_context JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_from TEXT,
            created_from_id TEXT,
            standalone_only BOOLEAN NOT NULL DEFAULT TRUE,
            os_linked BOOLEAN NOT NULL DEFAULT FALSE,
            care_record_access BOOLEAN NOT NULL DEFAULT FALSE,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            archived_at TIMESTAMPTZ
        );
        RETURN;
    END IF;

    -- Premium / legacy shape (sql/200): workflow + output_type + BIGINT id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orb_saved_outputs' AND column_name = 'workflow'
    ) THEN
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS canonical_id TEXT;
        UPDATE orb_saved_outputs
        SET canonical_id = COALESCE(canonical_id, 'legacy-' || id::text)
        WHERE canonical_id IS NULL;

        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS type TEXT;
        UPDATE orb_saved_outputs
        SET type = COALESCE(NULLIF(output_type, ''), workflow, 'general_research')
        WHERE type IS NULL;

        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS content_markdown TEXT;
        UPDATE orb_saved_outputs
        SET content_markdown = COALESCE(content_markdown, content)
        WHERE content_markdown IS NULL AND content IS NOT NULL;

        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS intelligence_output JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS citations JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS quality JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS model_routing JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS retrieval_context JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'saved';
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS standalone_only BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS os_linked BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS care_record_access BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS project_name TEXT;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS created_from TEXT;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS created_from_id TEXT;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

        UPDATE orb_saved_outputs
        SET tags = COALESCE(
            to_jsonb(tags::text[]),
            '[]'::jsonb
        )
        WHERE tags IS NOT NULL
          AND pg_typeof(tags)::text LIKE '%[]';

        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS tags_jsonb JSONB NOT NULL DEFAULT '[]'::jsonb;
        UPDATE orb_saved_outputs
        SET tags_jsonb = CASE
            WHEN tags IS NULL THEN '[]'::jsonb
            WHEN pg_typeof(tags)::text LIKE '%[]' THEN to_jsonb(tags::text[])
            ELSE tags_jsonb
        END;

        INSERT INTO orb_saved_outputs_orphaned (legacy_id, legacy_shape, row_data, notes)
        SELECT
            canonical_id,
            '200_premium',
            to_jsonb(orb_saved_outputs.*),
            'Row lacked user_id during canonical migration'
        FROM orb_saved_outputs
        WHERE user_id IS NULL;

        DELETE FROM orb_saved_outputs WHERE user_id IS NULL;

        CREATE TABLE IF NOT EXISTS orb_saved_outputs_canonical (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            project_id TEXT,
            project_name TEXT,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'saved',
            profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
            tags JSONB NOT NULL DEFAULT '[]'::jsonb,
            summary TEXT,
            content_markdown TEXT,
            content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            intelligence_output JSONB NOT NULL DEFAULT '{}'::jsonb,
            sources JSONB NOT NULL DEFAULT '[]'::jsonb,
            citations JSONB NOT NULL DEFAULT '[]'::jsonb,
            quality JSONB NOT NULL DEFAULT '{}'::jsonb,
            model_routing JSONB NOT NULL DEFAULT '{}'::jsonb,
            retrieval_context JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_from TEXT,
            created_from_id TEXT,
            standalone_only BOOLEAN NOT NULL DEFAULT TRUE,
            os_linked BOOLEAN NOT NULL DEFAULT FALSE,
            care_record_access BOOLEAN NOT NULL DEFAULT FALSE,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            archived_at TIMESTAMPTZ
        );

        INSERT INTO orb_saved_outputs_canonical (
            id, user_id, project_id, project_name, title, type, status,
            profile_ids, tags, summary, content_markdown, content_json,
            intelligence_output, sources, citations, quality, model_routing,
            retrieval_context, created_from, created_from_id,
            standalone_only, os_linked, care_record_access, metadata,
            created_at, updated_at, archived_at
        )
        SELECT
            canonical_id,
            user_id,
            CASE WHEN project_id IS NOT NULL THEN project_id::text ELSE NULL END,
            NULL,
            COALESCE(title, 'ORB output'),
            COALESCE(type, 'general_research'),
            COALESCE(status, 'saved'),
            '[]'::jsonb,
            COALESCE(tags_jsonb, '[]'::jsonb),
            NULL,
            content_markdown,
            COALESCE(metadata, '{}'::jsonb),
            '{}'::jsonb,
            '[]'::jsonb,
            '[]'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb,
            workflow,
            NULL,
            TRUE,
            FALSE,
            FALSE,
            COALESCE(metadata, '{}'::jsonb),
            created_at,
            updated_at,
            NULL
        FROM orb_saved_outputs
        WHERE user_id IS NOT NULL
        ON CONFLICT (id) DO NOTHING;

        DROP TABLE orb_saved_outputs;
        ALTER TABLE orb_saved_outputs_canonical RENAME TO orb_saved_outputs;
    ELSE
        -- Rich 075 shape or partial canonical
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS project_name TEXT;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS profile_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS content_json JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS intelligence_output JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS citations JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS quality JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS model_routing JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS retrieval_context JSONB NOT NULL DEFAULT '{}'::jsonb;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS created_from TEXT;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS created_from_id TEXT;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS standalone_only BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS os_linked BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS care_record_access BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'orb_saved_outputs'
              AND column_name = 'id' AND data_type IN ('bigint', 'integer')
        ) THEN
            ALTER TABLE orb_saved_outputs ADD COLUMN IF NOT EXISTS text_id TEXT;
            UPDATE orb_saved_outputs SET text_id = COALESCE(text_id, 'legacy-' || id::text) WHERE text_id IS NULL;
        END IF;

        INSERT INTO orb_saved_outputs_orphaned (legacy_id, legacy_shape, row_data, notes)
        SELECT
            COALESCE(text_id, id::text, id),
            '075_rich',
            to_jsonb(orb_saved_outputs.*),
            'Row lacked user_id during canonical migration'
        FROM orb_saved_outputs
        WHERE user_id IS NULL;

        DELETE FROM orb_saved_outputs WHERE user_id IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_user_id ON orb_saved_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_user_project ON orb_saved_outputs(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_user_status ON orb_saved_outputs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_user_created ON orb_saved_outputs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orb_saved_outputs_tags_gin ON orb_saved_outputs USING GIN(tags);

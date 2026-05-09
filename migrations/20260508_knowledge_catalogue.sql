-- IndiCare AI knowledge catalogue
-- Run this once against the application PostgreSQL database.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS knowledge_catalogue (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    organisation TEXT,
    description TEXT,
    url TEXT,
    category TEXT,
    priority TEXT,
    content TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    source_type TEXT DEFAULT 'external_link',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_catalogue_category
    ON knowledge_catalogue (category);

CREATE INDEX IF NOT EXISTS idx_knowledge_catalogue_priority
    ON knowledge_catalogue (priority);

CREATE INDEX IF NOT EXISTS idx_knowledge_catalogue_active
    ON knowledge_catalogue (is_active);

CREATE INDEX IF NOT EXISTS idx_knowledge_catalogue_search
    ON knowledge_catalogue
    USING GIN (
        to_tsvector(
            'english',
            coalesce(title, '') || ' ' ||
            coalesce(organisation, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(content, '') || ' ' ||
            coalesce(array_to_string(tags, ' '), '')
        )
    );

-- Optional vector search support. This block only runs if pgvector is available.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not available; keyword search will still work.';
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        ALTER TABLE knowledge_catalogue
            ADD COLUMN IF NOT EXISTS embedding vector(1536);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add embedding column; keyword search will still work.';
END $$;

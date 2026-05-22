-- Standalone ORB Knowledge Library (reference documents only; no OS care records)

CREATE TABLE IF NOT EXISTS orb_knowledge_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    source_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'indexed',
    origin TEXT NOT NULL DEFAULT 'built_in',
    file_name TEXT,
    file_type TEXT,
    source_label TEXT,
    reliability TEXT,
    live_retrieved BOOLEAN NOT NULL DEFAULT FALSE,
    standalone_only BOOLEAN NOT NULL DEFAULT TRUE,
    os_linked BOOLEAN NOT NULL DEFAULT FALSE,
    care_record_access BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orb_knowledge_chunks (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES orb_knowledge_sources(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    title TEXT,
    text TEXT NOT NULL,
    section TEXT,
    page TEXT,
    token_estimate INTEGER,
    citation_label TEXT,
    source_type TEXT,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_type ON orb_knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_status ON orb_knowledge_sources(status);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_source_id ON orb_knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_chunk_index ON orb_knowledge_chunks(chunk_index);

CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_text_search
    ON orb_knowledge_chunks USING GIN (to_tsvector('english', text));

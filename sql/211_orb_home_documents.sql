-- Canonical ORB Home Documents — server-backed home policy/plan storage.
-- Converges localStorage prototype with permission-aware retrieval for ORB answers.

CREATE TABLE IF NOT EXISTS orb_home_documents (
    id TEXT PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    home_id TEXT,
    organisation_id TEXT,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    filename TEXT,
    mime_type TEXT,
    storage_uri TEXT,
    extracted_text TEXT,
    text_extract_status TEXT NOT NULL DEFAULT 'pending',
    indexing_status TEXT NOT NULL DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_classification TEXT NOT NULL DEFAULT 'home_operational',
    access_role_policy TEXT NOT NULL DEFAULT 'home_manager',
    audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orb_home_documents_owner
    ON orb_home_documents (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_orb_home_documents_home
    ON orb_home_documents (home_id, document_type)
    WHERE archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_orb_home_documents_org
    ON orb_home_documents (organisation_id, document_type)
    WHERE archived = FALSE;

CREATE TABLE IF NOT EXISTS orb_home_document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES orb_home_documents(id) ON DELETE CASCADE,
    home_id TEXT,
    document_type TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    source_title TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    embedding JSONB,
    embedding_model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orb_home_document_chunks_doc
    ON orb_home_document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_orb_home_document_chunks_home
    ON orb_home_document_chunks (home_id, document_type);

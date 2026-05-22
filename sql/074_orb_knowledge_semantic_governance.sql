-- Standalone ORB Knowledge Library: semantic embeddings + source governance

ALTER TABLE orb_knowledge_sources
    ADD COLUMN IF NOT EXISTS source_version TEXT,
    ADD COLUMN IF NOT EXISTS official_source BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS publisher TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confidence_level TEXT NOT NULL DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS governance_status TEXT NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS approved_by TEXT,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE orb_knowledge_chunks
    ADD COLUMN IF NOT EXISTS embedding JSONB,
    ADD COLUMN IF NOT EXISTS embedding_model TEXT,
    ADD COLUMN IF NOT EXISTS embedding_created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS semantic_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS canonical_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;

CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_official ON orb_knowledge_sources(official_source);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_governance ON orb_knowledge_sources(governance_status);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_confidence ON orb_knowledge_sources(confidence_level);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_expires ON orb_knowledge_sources(expires_at);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_review_due ON orb_knowledge_sources(review_due_at);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_semantic_keywords ON orb_knowledge_chunks USING GIN (semantic_keywords);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_canonical_terms ON orb_knowledge_chunks USING GIN (canonical_terms);

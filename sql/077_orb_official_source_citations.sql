-- Official source import, exact passage citations, and source governance (standalone ORB)

ALTER TABLE orb_knowledge_sources
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
    ADD COLUMN IF NOT EXISTS document_family TEXT,
    ADD COLUMN IF NOT EXISTS document_version_label TEXT,
    ADD COLUMN IF NOT EXISTS uploaded_by_user_id TEXT,
    ADD COLUMN IF NOT EXISTS approved_by_user_id TEXT,
    ADD COLUMN IF NOT EXISTS source_integrity TEXT DEFAULT 'summary_only',
    ADD COLUMN IF NOT EXISTS copyright_note TEXT,
    ADD COLUMN IF NOT EXISTS citation_style TEXT;

ALTER TABLE orb_knowledge_chunks
    ADD COLUMN IF NOT EXISTS heading_path JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS heading TEXT,
    ADD COLUMN IF NOT EXISTS subsection TEXT,
    ADD COLUMN IF NOT EXISTS paragraph_number TEXT,
    ADD COLUMN IF NOT EXISTS line_start INTEGER,
    ADD COLUMN IF NOT EXISTS line_end INTEGER,
    ADD COLUMN IF NOT EXISTS exact_excerpt TEXT,
    ADD COLUMN IF NOT EXISTS normalized_excerpt TEXT,
    ADD COLUMN IF NOT EXISTS citation_anchor TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS source_version TEXT,
    ADD COLUMN IF NOT EXISTS official_source BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS source_integrity TEXT,
    ADD COLUMN IF NOT EXISTS governance_status TEXT,
    ADD COLUMN IF NOT EXISTS confidence_level TEXT;

CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_document_family
    ON orb_knowledge_sources(document_family);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_sources_source_integrity
    ON orb_knowledge_sources(source_integrity);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_citation_anchor
    ON orb_knowledge_chunks(citation_anchor);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_heading
    ON orb_knowledge_chunks(heading);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_page
    ON orb_knowledge_chunks(page);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_paragraph_number
    ON orb_knowledge_chunks(paragraph_number);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_source_version
    ON orb_knowledge_chunks(source_version);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_official_source
    ON orb_knowledge_chunks(official_source);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_governance_status
    ON orb_knowledge_chunks(governance_status);
CREATE INDEX IF NOT EXISTS idx_orb_knowledge_chunks_confidence_level
    ON orb_knowledge_chunks(confidence_level);

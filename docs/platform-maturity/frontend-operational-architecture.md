# Frontend operational architecture

The frontend must render operational truth from typed backend contracts. Demo data and synthetic examples must never impersonate live safeguarding, chronology, audit, governance or inspection data.

## Canonical primitives

- operational timeline
- lifecycle panel
- audit timeline
- evidence panel
- chronology card
- safeguarding panel
- inspection panel
- governance review panel

## Contract rule

Frontend adapters should consume versioned DTOs and expose provenance using `OsApiSource` values: `live`, `synthetic` or `unavailable`.

## Migration notes

Next.js now has a provenance-ready `OsApiSource` union. Remaining work is to replace `Record<string, unknown>`, `Record<string, any>`, `OsApiResult<any>` and page-specific demo imports in regulated live flows with typed adapters.

## 2026-05 operational consolidation

Added replay-aware frontend DTOs in `frontend-next/lib/operational-memory/types.ts` and canonical primitives in `frontend-next/components/indicare/operational/canonical-operational-primitives.tsx`.

Frontend operational rendering should now migrate toward:

- `CanonicalChronologyTimeline` for chronology projections.
- `CanonicalOperationalQueue` for provider/home queue items.
- `CanonicalEvidenceTraversal` for why-linked evidence graph rendering.

Pages should not synthesize chronology, lifecycle, queue, or evidence relationships when canonical projections or traversals are available.

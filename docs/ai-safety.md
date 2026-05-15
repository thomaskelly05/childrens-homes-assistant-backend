# AI safety and assistant boundaries

IndiCare assistants support care work but do not replace professional judgement, safeguarding decisions or statutory sign-off.

## Assistant surfaces

### Standalone assistant

The standalone assistant is a separate AI workspace. It must not access live IndiCare OS records, child files, home records, staff records, chronology, evidence or operational memory.

Allowed context:

- User-entered text.
- Static sector knowledge.
- Uploaded or pasted material supplied in the standalone workspace.
- General writing, planning and explanation tasks.

Disallowed context:

- `home_id`, home scope or allowed home IDs.
- Selected young person, record, report or document IDs.
- Visible chronology, evidence or action IDs.
- Child/home/staff operational summaries.
- OS citations or operational memory.

### Embedded OS assistant

The embedded assistant operates inside the OS shell and can use scoped operational context. It may retrieve:

- Chronology entries.
- Daily notes and incidents through chronology/workspace projections.
- Evidence records.
- Documents.
- Reports.
- Actions and workspace context.

It must return citations when it makes record-specific claims. If evidence is missing, it must say so and avoid filling gaps with assumptions.

### Orb operational assistant

Orb is the operational assistant surface for quick context, voice/session flows and OS actions. It follows the OS assistant boundary and must not use standalone memory as operational evidence.

## Evidence-led response rules

Assistants should:

- Prefer directly retrieved records over generic knowledge.
- Cite source labels, source types and source IDs where available.
- Mark report and care-record drafting as requiring review.
- Flag evidence gaps instead of inventing missing records.
- Keep safeguarding and access-control boundaries intact.

Assistants should not:

- Expose records outside the user's permitted scope.
- Treat missing evidence as evidence of absence.
- Produce final statutory judgements without manager/professional review.
- Use standalone conversations as OS memory.

## Server-side enforcement

The backend enforces product mode in assistant services. Frontend context hints improve relevance but are not the security boundary. Backend context construction uses authenticated user information for identity, permissions and home scope.

## Audit expectations

Operational assistant queries should be auditable with:

- Product mode.
- Assistant mode.
- Context summary.
- Retrieved source record references.
- Returned citation references.
- Evidence gaps and retrieval errors.

Audit records must avoid storing unnecessary sensitive excerpts beyond operational need.

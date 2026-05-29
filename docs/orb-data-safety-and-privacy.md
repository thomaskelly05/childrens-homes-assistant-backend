# ORB data safety and privacy (standalone)

## Standalone ORB (/orb)

- Uses only **adult-provided** and **user-saved** context: typed messages, uploads, saved outputs, profiles, and feedback submitted in standalone ORB.
- Does **not** access IndiCare OS child, home, staff, chronology or care records.
- **Temporary chat** skips saved ORB profile context for that conversation.

## IndiCare OS ORB (/assistant/orb)

- May use **permissioned OS records** only where explicitly available and allowed for the signed-in user.

## AI providers

ORB may use trusted AI providers to generate responses. Those providers process the text/images you send in that request. They do not receive direct access to IndiCare OS records. Wording in the product avoids claiming providers never process data.

## Adults should

- Avoid unnecessary personal details; prefer initials or anonymised descriptions.
- Follow local safeguarding and emergency procedures when a child may be at risk.
- Use OS ORB when live operational context is required.

## Saved outputs and feedback

Stored so adults can reuse them and so ORB quality can improve through **human-reviewed** changes — not automatic care decisions.

Admin quality review (`/admin/orb-quality`) uses feedback metadata only — not raw OS records. Improvement candidates require explicit admin approval before any prompt or scenario changes.

## UI copy

Help and Settings on `/orb` include **“How ORB protects your data”** — clear, reassuring, and not overpromising (no “100% safe”).

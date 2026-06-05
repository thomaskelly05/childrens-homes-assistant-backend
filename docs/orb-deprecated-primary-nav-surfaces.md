# ORB Deprecated Primary Nav Surfaces

These surfaces are **hidden from the primary sidebar** but remain in the codebase for route compatibility and internal handoffs.

| Panel id | Former label | Status |
|---|---|---|
| `shift_builder` | Shift Builder | Deprecated from primary nav |
| `review` | Review | Deprecated from primary nav |
| `inspection_readiness` | Inspection Readiness | Deprecated from primary nav |
| `safeguarding_thinking` | Safeguarding Thinking | Deprecated from primary nav |
| `record_properly` | Record This Properly | Deprecated from primary nav |
| `knowledge` | Knowledge Library | Merged into Documents & Guidance |

## Future removal plan

1. Monitor redirect card usage and deep-link traffic
2. Migrate remaining internal `openPanel('shift_builder')` callers to Templates/Chat where appropriate
3. Keep panel ids one release cycle after nav simplification
4. Remove sidebar-only wiring first; delete components only when no callers remain

## Comments in code

Legacy panel components are marked: *Deprecated from primary nav; capability now lives in Chat/Templates/ORB Write/Documents.*

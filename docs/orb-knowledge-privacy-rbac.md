# ORB knowledge privacy and RBAC

## Source scopes

| Scope | Visibility |
|-------|------------|
| `global_builtin` | All premium ORB users (seeded built-ins) |
| `global_admin_approved` | All premium ORB users |
| `user_private` | Uploader only (`uploaded_by_user_id` / `owner_user_id`) |
| `organisation_private` | Reserved — not exposed cross-user yet |

## Routes

**Premium users:** health, summary, list/get source, search, citation health, ingest-file (private by default).

**Admin only:** create/update source, approve, archive, import official, rebuild citations, public evidence seed/import, pipeline seed.

## Migration

```bash
psql "$DATABASE_URL" -f sql/208_orb_knowledge_source_scope.sql
```

## Upload defaults

`POST /orb/standalone/knowledge/ingest-file` sets `source_scope=user_private` and `owner_user_id` from the authenticated user unless an admin path is used.

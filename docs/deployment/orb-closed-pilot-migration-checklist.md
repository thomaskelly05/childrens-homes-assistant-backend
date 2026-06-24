# ORB Closed Pilot Migration Checklist

Use this checklist before opening a controlled closed pilot. Migrations are **not** auto-applied at application startup.

---

## Pre-flight

- [ ] PostgreSQL 16+ running with SSL enabled (`sslmode=require` in `DATABASE_URL`)
- [ ] Base schema applied (`users`, `homes` tables exist)
- [ ] `.env` configured: `DATABASE_URL`, `SESSION_SECRET`, `OPENAI_API_KEY` (staging/production)
- [ ] First admin / pilot users created (`create_first_admin.py` or existing provisioning)
- [ ] `NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE` **not** set to `1` unless Communicate is in pilot scope

---

## Required migrations (this pilot)

### 1. Records workspace — `sql/210_orb_records_workspace.sql`

Creates `orb_records_workspace` for unified adult-scoped draft/record persistence.

```bash
psql "$DATABASE_URL" -f sql/210_orb_records_workspace.sql
```

Verify:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'orb_records_workspace';
```

Expected columns include: `owner_user_id`, `workspace_section`, `status`, `audit_trail`, `privacy_classification`.

### 2. Home documents — `sql/211_orb_home_documents.sql`

Creates `orb_home_documents` and `orb_home_document_chunks`.

```bash
psql "$DATABASE_URL" -f sql/211_orb_home_documents.sql
```

Verify:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('orb_home_documents', 'orb_home_document_chunks');
```

---

## Related migrations (may already be applied)

| File | Purpose | Required for pilot? |
|------|---------|---------------------|
| `sql/207_orb_saved_outputs_canonical.sql` | Legacy saved outputs | Yes if legacy outputs API used |
| `sql/210_provider_ai_settings.sql` | Provider AI settings | Recommended |
| `sql/211_ai_usage_audit.sql` | AI usage audit | Recommended |

---

## Automated readiness check

```bash
source .venv/bin/activate
export $(grep -v '^#' .env | xargs)
python scripts/check_orb_pilot_readiness.py
```

For local dev without DB tables (memory fallback):

```bash
python scripts/check_orb_pilot_readiness.py --allow-memory-fallback
```

JSON output:

```bash
python scripts/check_orb_pilot_readiness.py --json
```

Founder API (authenticated):

```
GET /orb/pilot/readiness
```

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | Yes | Session signing |
| `OPENAI_API_KEY` | Staging/pilot | Live ORB answers |
| `AI_PROVIDER_STRICT` | Production signoff | `true` when `ORB_LIVE_SIGN_OFF=true` |
| `ORB_LIVE_SIGN_OFF` | Optional | Blocks mock provider in signoff harness |
| `NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE` | No | Leave unset to hide Communicate |

---

## Post-migration smoke tests

1. **Records workspace health:** `GET /orb/records-workspace/health` → `persistence_status: "database"`
2. **Home documents health:** `GET /orb/home-documents/health` → `persistence_status: "database"`
3. **Save draft from Chat** → appears in Records & Drafts
4. **Upload home policy PDF** → `text_extract_status` progresses to `ready` or `failed`
5. **Run pytest:** `python -m pytest tests/test_orb_closed_pilot_readiness.py -q`

---

## Rollback notes

- Dropping `orb_records_workspace` loses workspace drafts (not legacy `orb_saved_outputs`).
- Dropping `orb_home_documents` loses uploaded home policy text and chunks.
- Take a DB snapshot before pilot go-live.

---

## Sign-off

| Role | Name | Date | Migrations applied | Readiness script pass |
|------|------|------|--------------------|-----------------------|
| Technical | | | ☐ 210 ☐ 211 | ☐ |
| Safeguarding lead | | | N/A | ☐ GOLD review |
| Registered manager | | | N/A | ☐ Pilot scope agreed |

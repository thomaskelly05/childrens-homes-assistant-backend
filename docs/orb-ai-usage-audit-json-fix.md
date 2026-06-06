# ORB AI Usage Audit JSON Fix

## Problem

`services/ai_usage_audit_service.py` inserted Python `dict` values into `metadata JSONB` without adaptation, causing:

`psycopg2.ProgrammingError: can't adapt type 'dict'`

## Fix

Metadata is wrapped with `psycopg2.extras.Json()` before insert. Nested dict values are supported.

## Schema

Table: `ai_usage_audit` (`sql/211_ai_usage_audit.sql`)

Column `metadata` type: `JSONB NOT NULL DEFAULT '{}'::jsonb`

## Behaviour

Audit failures remain best-effort — they must not break user-facing AI flows. One warning is logged server-side.

# ORB Provider / Admin Security Controls

Audit of provider-facing admin controls for AI trust and governance.

## AI trust settings

| Control | Route | Role | Audited |
|---------|-------|------|---------|
| Read effective AI settings | `GET /api/admin/ai-settings` | Manager+ | N/A |
| Update AI settings | `PATCH /api/admin/ai-settings` | **Admin only** | Yes — `write_settings_audit` |
| AI trust status | `GET /api/admin/ai-trust-status` | Manager+ | N/A |
| Usage audit (safe metadata) | `GET /api/admin/ai-usage-audit` | Manager+ | N/A |

### Settings fields (provider configuration dependent)

- `external_ai_enabled` — requires acknowledgement flags
- `redaction_mode` — strict / standard / off (off requires acknowledgement)
- `prompt_storage` / `transcript_storage` — default off; enabling requires acknowledgement
- `allowed_ai_features` — restricted features cannot be enabled via API
- `premium_tts_enabled` — requires external provider acknowledgement
- `data_retention_days`, `local_policy_sources_enabled`
- Home-level overrides cannot exceed provider minimums

## Role permissions

| Action | Staff | Manager | Admin |
|--------|-------|---------|-------|
| View AI settings | No | Yes | Yes |
| PATCH AI settings | **No** | **No** | **Yes** |
| View usage audit | No | Yes | Yes |
| ORB Residential product use | Per subscription | Per subscription | Per subscription |

Staff cannot update provider AI trust settings — enforced by `require_admin` on PATCH.

## ORB Residential access controls

- Login required for product UI (`OrbAuthGate` + Next middleware)
- Premium APIs require active subscription + safety acceptance
- Session revocation enforced on residential loader and WebSockets
- Saved outputs scoped per user

## Retention and storage toggles

Controlled via provider AI settings (see above). Defaults designed to minimise storage of sensitive AI content.

## Gaps (honest)

| Gap | Status |
|-----|--------|
| Full team management for standalone ORB providers | Not built — OS staff RBAC separate |
| Self-service provider security dashboard | Partial (`/api/admin/ai-trust-status`) |
| Automated retention purge jobs | Provider configuration dependent — verify operationally |
| Per-home staff AI settings delegation | Admin-only PATCH at provider level |

## Related docs

- `docs/orb-ai-privacy-security-controls.md`
- `docs/trust/orb-ai-and-data-use.md`
- `docs/security/access-control-model.md`

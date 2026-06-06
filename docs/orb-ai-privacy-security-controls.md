# ORB AI Privacy Security Controls

## Default posture

| Setting | Default |
|---------|---------|
| External AI | Off (until provider admin enables with acknowledgements) |
| Prompt storage | Off |
| Transcript storage | Off |
| Redaction mode | Strict |
| Usage audit | On (safe metadata only) |

## Services

| Service | Role |
|---------|------|
| `AIPrivacyDecisionService` | Allow/block external AI per provider settings |
| `AIGatewayService` | Single outbound OpenAI gateway with redaction |
| `AIRedactionService` | PII/safeguarding redaction |
| `AIUsageAuditService` | Durable audit; strips prompt/transcript/document text from metadata |
| `ai_external_call_governance` | Wrapper for dictate and legacy paths |

## ORB-specific paths

- **Chat:** `/orb/standalone/conversation` — governance events + privacy decision
- **Dictate:** `orb_dictate_service` via `ai_external_call_governance`
- **Voice TTS:** `orb_voice_provider_service.speak` → `ai_privacy_decision_service`
- **Documents:** Document intelligence routes under premium gate

## Admin visibility

- `GET /api/admin/ai-usage-audit` returns sanitised events via `list_safe()`
- Managers can read; only admins see `user_id` in audit rows
- No prompt/document text in API responses

## Frontend

- No `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, or Stripe secrets in client bundles
- `suppressProductionConsole()` in production auth provider

## Safeguarding-critical TTS

External TTS does not auto-speak safeguarding-critical content; `manual_speak` and privacy decision gates apply.

## Tests

- `tests/test_orb_ai_governance_no_raw_logging.py`
- `tests/test_orb_voice_tts_security.py`
- `tests/test_provider_ai_settings_permissions.py`

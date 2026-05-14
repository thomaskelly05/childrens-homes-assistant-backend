from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class AIProviderPolicy:
    external_processing_enabled: bool
    redaction_mode: str
    allow_identifiable_data: bool
    no_training_required: bool
    audit_prompts: bool
    store_prompts: bool
    store_transcripts: bool

    @classmethod
    def load(cls) -> "AIProviderPolicy":
        redaction_mode = os.getenv("AI_REDACTION_MODE", "strict").strip().lower()
        if redaction_mode not in {"strict", "balanced", "off"}:
            redaction_mode = "strict"
        return cls(
            external_processing_enabled=_env_bool("AI_EXTERNAL_PROCESSING_ENABLED", False),
            redaction_mode=redaction_mode,
            allow_identifiable_data=_env_bool("AI_ALLOW_IDENTIFIABLE_DATA", False),
            no_training_required=_env_bool("AI_PROVIDER_NO_TRAINING_REQUIRED", True),
            audit_prompts=_env_bool("AI_AUDIT_PROMPTS", True),
            store_prompts=_env_bool("AI_STORE_PROMPTS", False),
            store_transcripts=_env_bool("AI_STORE_TRANSCRIPTS", False),
        )

    def external_calls_allowed(self) -> bool:
        return self.external_processing_enabled and self.no_training_required


def current_ai_provider_policy() -> AIProviderPolicy:
    return AIProviderPolicy.load()

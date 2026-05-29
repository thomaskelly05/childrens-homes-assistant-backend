from __future__ import annotations

import re
from typing import Any

from services.ai_model_router_service import ai_model_router_service
from schemas.ai_models import AiRiskLevel

DATA_SAFETY_HELP = """
**How ORB protects your data (standalone /orb)**

- Standalone ORB does **not** access IndiCare OS child, home, staff, chronology or care records.
- ORB only uses what you type, upload, choose to save, or submit as feedback in standalone ORB.
- **Temporary chat** skips your saved ORB profile context for that conversation.
- ORB may use trusted AI providers to generate responses. Those providers process the text you send — they do not get direct access to IndiCare OS records.
- Please avoid unnecessary personal details. Use initials or anonymised details where you can.
- Saved outputs and feedback are stored so you can reuse them and so ORB can improve safely through **human review** — not automatic care decisions.

**Standalone vs IndiCare OS ORB**
- **Standalone ORB** (/orb): adult-provided and user-saved context only.
- **IndiCare OS ORB** (/assistant/orb): may use permissioned OS records only where explicitly available and allowed.

ORB does not replace safeguarding procedures, manager judgement, legal advice, medical advice or local authority decision-making.
""".strip()

VOICE_HELP = """
**Voice on standalone ORB**
- Tap the microphone to speak — ORB does not listen until you start input.
- Auto-speak reads completed answers aloud; you can turn this off in Settings → Voice.
- Voice uses your device/browser speech where available; check Settings for voice choice and speed.
""".strip()

PROFILE_HELP = """
**Profiles on standalone ORB**
- Set your role in Profile so ORB shapes tone and “What am I missing?” for your job.
- Profiles are stored in your workspace — they are not live OS staff records.
- Temporary chat ignores saved profile context for that chat only.
""".strip()

HOW_TO_USE_ORB = """
**How to use standalone ORB**
1. Choose a mode (Ask ORB, Safeguarding, Ofsted Lens, recording support, etc.).
2. Type or speak your question — use initials where you can.
3. Use **Copy**, **Save**, or follow-up chips under answers you want to keep.
4. Attach documents from Tools for document intelligence lenses.
5. Thumbs up/down on answers helps improve ORB safely (reviewed by humans, not automatic rule changes).

For live child/home records, use IndiCare OS ORB at /assistant/orb where your role allows.
""".strip()

STANDALONE_BOUNDARY = (
    "Standalone ORB at /orb uses only what you provide — typed messages, uploads, saved outputs and feedback. "
    "It cannot access IndiCare OS child, home, staff or chronology records. "
    "For permissioned operational context, use IndiCare OS ORB at /assistant/orb."
)

WHAT_ORB_CAN_DO = (
    "I'm ORB Care Companion on standalone /orb. I can help with recording quality, safeguarding thinking, "
    "Ofsted/SCCIF reflection, therapeutic interpretation, supervision prep, documents you upload, NVQ learning support, "
    "and general questions — without accessing live OS records. What would you like to work on?"
)


class OrbLocalResponseService:
    """Cost-safe template responses — no LLM call."""

    def try_local_response(
        self,
        message: str,
        *,
        mode: str | None = None,
    ) -> dict[str, Any] | None:
        lower = str(message or "").strip().lower()
        if not lower:
            return None

        if re.fullmatch(
            r"(hi|hello|hey|yo|thanks|thank you|thankyou|good morning|good afternoon|good evening)"
            r"(\s+there|\s+orb)?[!?.]*",
            lower,
        ):
            return self._payload(WHAT_ORB_CAN_DO, template="greeting")

        if any(p in lower for p in ("what can you do", "how can you help", "what do you do")) and len(lower.split()) <= 14:
            return self._payload(WHAT_ORB_CAN_DO, template="capabilities")

        if any(p in lower for p in ("data safety", "protect my data", "how is my data", "privacy", "is my data safe")):
            return self._payload(DATA_SAFETY_HELP, template="data_safety")

        if "standalone boundary" in lower or "standalone orb boundary" in lower:
            return self._payload(STANDALONE_BOUNDARY, template="standalone_boundary")

        if any(p in lower for p in ("voice help", "how does voice", "microphone", "auto-speak", "auto speak")):
            return self._payload(VOICE_HELP, template="voice_help")

        if any(p in lower for p in ("profile help", "what is profile", "orb profile")):
            return self._payload(PROFILE_HELP, template="profile_help")

        if any(p in lower for p in ("how to use orb", "how do i use orb", "getting started")):
            return self._payload(HOW_TO_USE_ORB, template="how_to_use")

        if "what is indicare" in lower or "about indicare" in lower:
            return None

        return None

    def budget_limited_response(
        self,
        *,
        safeguarding: bool,
        message: str | None = None,
        mode: str | None = None,
    ) -> dict[str, Any]:
        from services.orb_usage_budget_service import (
            GENERAL_LIMIT_TEMPLATE,
            SAFEGUARDING_LIMIT_TEMPLATE,
            orb_usage_budget_service,
        )

        risk = ai_model_router_service.classify_risk(message or "", mode=mode)
        if safeguarding or risk == AiRiskLevel.SAFEGUARDING_SENSITIVE:
            text = SAFEGUARDING_LIMIT_TEMPLATE
            template = "safeguarding_budget_fallback"
        else:
            text = GENERAL_LIMIT_TEMPLATE
            template = "budget_fallback"
        _ = orb_usage_budget_service
        return self._payload(text, template=template, prompt_tier="fast")

    def _payload(self, answer: str, *, template: str, prompt_tier: str = "fast") -> dict[str, Any]:
        return {
            "answer": answer,
            "sources": [],
            "citations": [],
            "context_used": {
                "surface": "standalone_orb",
                "os_linked": False,
                "care_record_access": False,
                "prompt_tier": prompt_tier,
                "local_template": template,
                "model_routing": {
                    "provider": "local",
                    "model": "template",
                    "task_type": "template",
                    "cost_tier": "none",
                    "reason": f"local_template:{template}",
                },
                "cognition_display_labels": ["ORB"],
            },
            "no_llm": True,
        }


orb_local_response_service = OrbLocalResponseService()

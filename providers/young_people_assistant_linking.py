import json
from typing import Any

class YoungPeopleAssistantLinkingService:
    def __init__(self, assistant_provider):
        self.assistant_provider = assistant_provider

    async def analyse_daily_note(self, daily_note: dict) -> dict[str, Any]:
        prompt = self._build_prompt(daily_note)

        response_text = await self.assistant_provider.generate(
            prompt=prompt,
            system_name="young_people_linked_records"
        )

        data = json.loads(response_text)

        return {
            "analysis_status": "completed",
            "extracted": data.get("extracted", {}),
            "suggestions": data.get("suggestions", [])
        }

    def _build_prompt(self, daily_note: dict) -> str:
        return f"""
You are the IndiCare assistant supporting children's home recording.

Analyse this Daily Note and return JSON only.

Goals:
- identify child voice
- identify risks
- identify strengths
- identify therapeutic strategies
- identify education issues
- identify health issues
- identify family themes
- identify safeguarding indicators
- identify behaviour themes
- identify actions required
- suggest draft-only linked records
- suggest key work strongly where meaningful child voice or important conversation is present

Rules:
- draft only
- do not finalise records
- be child-centred, therapeutic and non-stigmatising
- preserve direct child voice where present
- do not make final safeguarding judgements

Return JSON shape:
{{
  "extracted": {{
    "child_voice": [],
    "risks": [],
    "strengths": [],
    "therapeutic_strategies": [],
    "education_issues": [],
    "health_issues": [],
    "family_themes": [],
    "safeguarding_indicators": [],
    "behaviour_themes": [],
    "actions_required": [],
    "meaningful_conversation_detected": false
  }},
  "suggestions": [
    {{
      "action_type": "key_worker_session_draft",
      "title": "Create key worker session draft",
      "rationale": "Meaningful child voice identified",
      "confidence_score": 0.88,
      "evidence": []
    }}
  ]
}}

Daily Note:
{json.dumps(daily_note)}
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class SendIntelligenceDecision:
    active: bool
    considerations: list[str]
    prompts: list[str]
    source_anchors: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbSendCommunicationIntelligenceService:
    VERSION = 'orb-send-communication-intelligence-v1'

    TRIGGERS = (
        'autism','autistic','send','ehcp','adhd','learning disability',
        'sensory','communication','aac','processing','meltdown','overload'
    )

    def evaluate(self, text:str) -> SendIntelligenceDecision:
        lower=(text or '').lower()
        active=any(t in lower for t in self.TRIGGERS)
        if not active:
            return SendIntelligenceDecision(False,[],[],[])

        return SendIntelligenceDecision(
            True,
            [
                'Consider communication differences before interpreting behaviour.',
                'Consider sensory, processing and environmental factors.',
                'Check whether reasonable adjustments were available.',
                'Avoid assuming intentional non-compliance.'
            ],
            [
                'How does the child communicate distress?',
                'Were instructions accessible and understood?',
                'Were sensory factors relevant?',
                'Were reasonable adjustments used?'
            ],
            ['[SEND Code]','[Equality Act]','[Reasonable adjustments]']
        )

orb_send_communication_intelligence_service = OrbSendCommunicationIntelligenceService()

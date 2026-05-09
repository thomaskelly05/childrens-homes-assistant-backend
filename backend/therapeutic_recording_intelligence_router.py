from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.document_ai_service import review_document

router = APIRouter(prefix='/api/therapeutic-recording', tags=['Therapeutic Recording Intelligence'])


class RecordingReviewRequest(BaseModel):
    record_type: str = 'generic'
    payload: dict[str, Any] = Field(default_factory=dict)
    action: str = 'review'
    young_person_id: int | None = None
    home_id: int | None = None
    provider_id: int | None = None


BLAME_LANGUAGE = {
    'attention seeking': 'The young person may have been seeking connection, reassurance or co-regulation.',
    'manipulative': 'Describe the observable behaviour and possible unmet need rather than using a label.',
    'non compliant': 'Describe what the young person was not able to engage with and what support was offered.',
    'refused': 'Consider whether “declined”, “was not able to engage” or a factual description would be more helpful.',
    'kicked off': 'Use specific, factual wording about presentation, behaviour and context.',
    'naughty': 'Avoid judgemental language; describe the behaviour, context and adult response.',
    'challenging behaviour': 'Be specific about what happened and what the behaviour may have communicated.',
    'aggressive': 'If used, describe the specific behaviour, risk and context clearly.',
    'calmed down': 'Describe what helped the young person become more settled or regulated.',
}

RECORD_CALLBACKS = {
    'incident': ['Manager review', 'Child wellbeing check', 'Repair conversation', 'Risk review if patterns are emerging'],
    'missing_episode': ['Return home conversation', 'Contextual safeguarding review', 'Key work follow-up', 'Social worker notification check'],
    'physical_intervention': ['Child debrief', 'Staff debrief', 'Manager review', 'Repair and restorative work', 'Risk assessment review'],
    'daily_note': ['Handover actions', 'Manager review if safeguarding/significance is high'],
    'keywork': ['Review agreed actions', 'Update support plan if needed'],
    'education': ['Education follow-up', 'PEP target review if needed'],
    'family': ['Post-contact wellbeing check', 'Family time plan review if concerns are repeated'],
    'health': ['Health follow-up task', 'Medication/care plan update if needed'],
    'risk': ['Manager sign-off', 'Control measure review', 'Next review date reminder'],
    'safeguarding': ['DSL review', 'Manager escalation', 'External agency notification check', 'Chronology update'],
}


def flatten_text(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            parts.append(f'{key}: {value}')
        else:
            text = str(value).strip()
            if text:
                parts.append(f'{key}: {text}')
    return '\n'.join(parts)


def detect_language_flags(text: str) -> list[dict[str, str]]:
    flags = []
    lower = text.lower()
    for phrase, suggestion in BLAME_LANGUAGE.items():
        if phrase in lower:
            flags.append({'phrase': phrase, 'suggestion': suggestion, 'severity': 'medium'})
    return flags


def detect_missing_therapeutic_elements(record_type: str, payload: dict[str, Any]) -> list[dict[str, str]]:
    required_by_type = {
        'daily_note': [('young_person_voice', 'Capture the young person’s voice, wishes or presentation.'), ('positives', 'Include strengths, progress or positive moments.'), ('actions_required', 'Record any handover or follow-up actions, or state none.')],
        'incident': [('staff_response', 'Describe what adults did to support safety and regulation.'), ('child_voice', 'Capture the young person’s voice or presentation after the incident.'), ('follow_up_actions', 'Record repair, review and follow-up actions.')],
        'missing_episode': [('return_home_conversation', 'Record the return home conversation or why it was not possible.'), ('push_pull_factors', 'Capture known push/pull factors and contextual risks.'), ('follow_up_actions', 'Record safeguarding and key work follow-up.')],
        'physical_intervention': [('de_escalation', 'Record de-escalation attempted before intervention.'), ('child_debrief', 'Record child debrief/voice and emotional impact.'), ('staff_debrief', 'Record staff debrief and learning.')],
        'keywork': [('purpose', 'Record the purpose of the session.'), ('child_voice', 'Capture the young person’s voice.'), ('actions_agreed', 'Record agreed actions and next steps.')],
        'risk': [('triggers', 'Record triggers and early warning signs.'), ('protective_factors', 'Record protective factors.'), ('controls', 'Record clear control measures and ownership.')],
    }
    missing = []
    for field, message in required_by_type.get(record_type, []):
        value = payload.get(field) or payload.get(field.replace('young_person_', 'child_'))
        if value is None or str(value).strip() == '':
            missing.append({'field': field, 'message': message})
    return missing


def detect_safeguarding(text: str) -> list[dict[str, str]]:
    terms = {
        'missing': 'Consider missing-from-care procedures, return home conversation and notifications.',
        'self-harm': 'Consider immediate safety planning, health follow-up and risk review.',
        'disclosure': 'Record exact words where possible and safeguarding actions taken.',
        'injury': 'Consider body map, health review and manager oversight.',
        'restraint': 'Ensure physical intervention review, debrief and proportionality are evidenced.',
        'sexual': 'Consider safeguarding threshold, exploitation indicators and external agency notifications.',
        'exploitation': 'Consider contextual safeguarding review and professional network escalation.',
        'police': 'Record incident/reference numbers, notifications and follow-up actions.',
    }
    lower = text.lower()
    return [{'term': term, 'message': msg} for term, msg in terms.items() if term in lower]


def therapeutic_score(text: str, missing: list[dict[str, str]], flags: list[dict[str, str]], safeguarding: list[dict[str, str]]) -> dict[str, Any]:
    score = 100
    score -= len(missing) * 10
    score -= len(flags) * 12
    if safeguarding and len(text.split()) < 80:
        score -= 15
    score = max(0, min(100, score))
    if score >= 80:
        rating = 'strong'
    elif score >= 60:
        rating = 'developing'
    else:
        rating = 'needs_review'
    return {'score': score, 'rating': rating}


def suggested_callbacks(record_type: str, text: str, safeguarding: list[dict[str, str]]) -> list[str]:
    callbacks = list(RECORD_CALLBACKS.get(record_type, []))
    lower = text.lower()
    if safeguarding and 'DSL review' not in callbacks:
        callbacks.append('DSL review')
    if any(word in lower for word in ['upset', 'distressed', 'crying', 'dysregulated']) and 'Emotional wellbeing check' not in callbacks:
        callbacks.append('Emotional wellbeing check')
    if any(word in lower for word in ['school', 'education', 'pep']) and 'Education follow-up' not in callbacks:
        callbacks.append('Education follow-up')
    if any(word in lower for word in ['contact', 'family', 'mum', 'dad']) and 'Post-contact wellbeing check' not in callbacks:
        callbacks.append('Post-contact wellbeing check')
    return callbacks


@router.post('/review')
async def review_recording(payload: RecordingReviewRequest, request: Request):
    record_type = (payload.record_type or 'generic').replace('-', '_').lower()
    text = flatten_text(payload.payload)
    if not text.strip():
        raise HTTPException(status_code=400, detail='No record content supplied')

    existing_review = review_document(document_type=record_type, payload=payload.payload, actions=['therapeutic_review', 'safeguarding_check', 'linked_records'])
    language_flags = detect_language_flags(text)
    missing = detect_missing_therapeutic_elements(record_type, payload.payload)
    safeguarding = detect_safeguarding(text)
    score = therapeutic_score(text, missing, language_flags, safeguarding)
    callbacks = suggested_callbacks(record_type, text, safeguarding)

    return {
        'ok': True,
        'record_type': record_type,
        'therapeutic_quality': score,
        'language_flags': language_flags,
        'missing_elements': missing,
        'safeguarding_considerations': safeguarding,
        'suggested_callbacks': callbacks,
        'existing_document_ai_review': existing_review,
        'submission_guidance': {
            'can_submit': score['score'] >= 60 or payload.action != 'submit',
            'manager_review_recommended': score['rating'] != 'strong' or bool(safeguarding),
            'return_prompt_recommended': score['rating'] == 'needs_review',
        },
    }


@router.get('/form-prompts/{record_type}')
async def form_prompts(record_type: str):
    rt = record_type.replace('-', '_').lower()
    prompts = {
        'daily_note': ['What went well today?', 'How did the young person present emotionally?', 'What is the young person’s voice?', 'What actions need carrying forward?'],
        'incident': ['What happened factually?', 'What may the young person have been communicating?', 'What did adults do to support regulation?', 'What repair/follow-up is needed?'],
        'missing_episode': ['What were the push/pull factors?', 'What contextual risks were present?', 'What did the young person say on return?', 'What needs to change to reduce recurrence?'],
        'physical_intervention': ['What de-escalation was attempted?', 'Why was intervention necessary and proportionate?', 'What was the emotional impact?', 'What repair and debrief happened?'],
        'keywork': ['What was the purpose?', 'What did the young person say?', 'What was learned?', 'What actions were agreed?'],
        'risk': ['What are the triggers?', 'What are the protective factors?', 'What controls are in place?', 'When must this be reviewed?'],
    }
    return {'record_type': rt, 'prompts': prompts.get(rt, ['What happened?', 'What does this mean for the young person?', 'What support was offered?', 'What follow-up is needed?'])}

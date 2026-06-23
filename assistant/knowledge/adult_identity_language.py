"""Adult identity, record-heading and live-output wording discipline for ORB Residential."""

from __future__ import annotations

import re
from typing import Any

ADULT_IDENTITY_PRINCIPLE = (
    "Do not default to 'staff' in child records. Where adult initials are supplied, use Adult [initials] "
    "(for example Adult TK, Adult JS) consistently throughout — do not revert to 'staff' later in the record. "
    "Where initials are not supplied, use 'the adult' or 'adults'. "
    "Do not invent initials. Ask for initials or use generic adult wording. "
    "Do not use 'Staff on Duty' as a heading — use 'Adults involved: Adult TK, Adult JS' when needed, or omit. "
    "If roles are supplied without initials, use the waking night adult, the shift lead, the Registered Manager "
    "or the key worker only where appropriate."
)

CHILDRENS_HOME_SAFEGUARDING_TERMINOLOGY_PRINCIPLE = (
    "Use children's home safeguarding language, not education-sector terminology. "
    "Do not default to DSL, Designated Safeguarding Lead or school safeguarding lead. "
    "Prefer Registered Manager, responsible manager, manager, senior on shift, shift lead, responsible adult, "
    "local safeguarding procedure, placing authority / social worker where policy-led, and emergency services "
    "where immediate risk is indicated. "
    "Use DSL only when the user explicitly included DSL in their input and ORB is referring back to that term."
)

DAILY_RECORD_PROPORTIONALITY_PRINCIPLE = (
    "For ordinary daily records without safeguarding cues, do not add a Safeguarding Note, automatic manager "
    "escalation, local safeguarding procedure paragraph, or 'must escalate if mood does not improve'. "
    "Use proportionate routine follow-up or handover only. "
    "Safeguarding/pathway language belongs when cues include disclosure, allegation, missing from care, "
    "unexplained injury, exploitation, peer harm, immediate risk, substance concern, family contact risk pattern, "
    "repeated or escalating concern, or adult practice concern."
)

DAILY_RECORD_OUTPUT_DISCIPLINE_PRINCIPLE = (
    "Daily records should be clean, concise and record-like: Daily Record, factual narrative, child voice and "
    "adult response woven naturally, outcome or handover if relevant. "
    "Do not add unnecessary sections such as Safeguarding Note, Child Voice, Next Steps, Professional Reflection, "
    "Quality Assurance Note, Compliance Note, or self-commentary unless the user asked."
)

SELF_COMMENTARY_PRINCIPLE = (
    "When creating a record, provide the record itself. Do not add a self-assessment or explanation after the record "
    "unless the user explicitly asks why the wording is better or requests commentary."
)

RECORD_ONLY_OUTPUT_PRINCIPLE = (
    "When the user asks ORB to create a record, return the record only. Do not add commentary before or after the "
    "record. Do not explain why the record is factual, therapeutic or child-centred unless the user explicitly asks."
)

CHILD_VOICE_DISCIPLINE_PRINCIPLE = (
    "Preserve the child's direct words exactly — do not paraphrase, expand or interpret them as fact. "
    "Do not add motive, diagnosis, emotional conclusion or professional judgement after a direct quote. "
    "Avoid 'This indicates…', 'This statement indicated…' or similar after the child's words in simple daily records. "
    "Do not create a separate Child Voice section in simple daily records — weave quotes naturally into the narrative. "
    "If reflection is needed, use cautious wording such as 'may suggest' and mark what is not confirmed."
)

EMOTIONAL_IMPACT_DISCIPLINE_PRINCIPLE = (
    "Describe adult actions without claiming internal emotional impact unless the child said it or it was directly "
    "observed. Do not write that an adult's approach made the child feel safe, supported, reassured or regulated "
    "unless the child directly said this. Do not write 'allowed the child to feel safe and comfortable', "
    "'made the child feel reassured', 'helped the child regulate' or 'the child felt supported' unless supported "
    "by input. Describe what the adult did and what was observed instead. "
    "Prefer observable wording such as 'remained nearby', 'offered a calm adult presence', 'appeared calmer'."
)

OUTCOME_INTERPRETATION_DISCIPLINE_PRINCIPLE = (
    "Keep observed outcomes observed. Do not add phrases such as 'indicating a positive shift in mood', "
    "'showing emotional regulation' or 'suggesting they felt better'. Use observed presentation such as "
    "'appeared calmer' unless the input states mood improved. Do not convert presentation into internal mood state."
)

SENTENCE_PUNCTUATION_DISCIPLINE_PRINCIPLE = (
    "Use complete sentences in records. Do not join separate record sentences together without punctuation. "
    "End each factual sentence with a full stop before the next adult action, transition or child quote. "
    "Do not insert a full stop before Child A when Child A is the object of a verb or preposition "
    "(for example gave Child A space, offered Child A toast, checked in with Child A, sat nearby while Child A)."
)

INTERPRETIVE_FEELINGS_DISCIPLINE_PRINCIPLE = (
    "Do not use 'In response to Child A's feelings' or similar interpretive phrasing unless the child directly "
    "stated a feeling. Prefer 'In response,' followed by the adult action. Do not invent frustration, "
    "dissatisfaction or emotional state labels unless supported by the child's words or user input."
)

TIMELINE_DISCIPLINE_PRINCIPLE = (
    "Do not add unsupported timeline wording such as 'as the evening progressed', 'over the evening' or "
    "'throughout the evening' unless the user provided that chronology. Prefer timing from input "
    "(for example 'before bedtime') rather than expanding the timeline."
)

TRAILING_MARKDOWN_DISCIPLINE_PRINCIPLE = (
    "Do not end record outputs with markdown separator lines such as em dashes (—), underscores (___) or "
    "asterisks (***) unless the user requested formatted document separators."
)

DUPLICATE_HEADING_DISCIPLINE_PRINCIPLE = (
    "Do not duplicate Outcome and Outcome / Handover headings in simple daily records. Use one Outcome / Handover "
    "section. Do not add separate Follow-up or Next Steps when handover already states the next action."
)

REPEATED_OUTCOME_DISCIPLINE_PRINCIPLE = (
    "Do not repeat the same observed outcome in multiple sections. If Outcome / Handover already records a timed "
    "observation such as 'appeared calmer before bedtime', do not repeat it in Adult Response."
)

END_OF_RECORD_DISCIPLINE_PRINCIPLE = (
    "Do not include '[End of record]', 'END OF RECORD', '<end>' or any end marker in record outputs unless the "
    "user explicitly asked to include one."
)

DAILY_RECORD_SIMPLIFICATION_PRINCIPLE = (
    "For simple, low-risk daily records, prefer a short narrative record with no more than 2–3 content sections. "
    "Weave child voice naturally into the narrative — do not add a separate Child Voice section unless useful. "
    "Do not add a Follow-up section when Outcome / Handover already states the next action."
)

RECORD_HEADING_DISCIPLINE_PRINCIPLE = (
    "Match headings to the record type requested. Daily records use headings such as Daily Record, "
    "Presentation and Support, Adult Response, and Outcome / Handover. "
    "Weave child voice naturally into the narrative — a separate Child Voice section is optional, not default. "
    "Do not use Incident Summary, Incident or Behaviour Incident for daily records unless the user asked "
    "for an incident record."
)

DAILY_RECORD_HEADINGS: tuple[str, ...] = (
    "Daily Record",
    "Presentation and Support",
    "Adult Response",
    "Outcome / Handover",
)

INCIDENT_RECORD_HEADINGS: tuple[str, ...] = (
    "Incident Reflection",
    "Brief summary",
    "What was observed",
    "Adult response and de-escalation",
    "Outcome / follow-up",
)

HANDOVER_RECORD_HEADINGS: tuple[str, ...] = (
    "Handover Note",
    "Child's current presentation",
    "Risks or vulnerabilities for next shift",
    "What helped today",
    "Management or safeguarding notes",
)

THERAPEUTIC_RECORDING_PHRASES: tuple[str, ...] = (
    "gave Child A space",
    "did not place pressure on Child A to speak",
    "checked in gently",
    "remained nearby",
    "offered reassurance",
    "acknowledged what Child A shared",
    "supported Child A's sense of safety and choice",
    "appeared calmer",
    "this was handed over",
    "if Child A wishes to talk",
)

OBSERVATION_VS_INTERPRETATION_GUIDANCE: tuple[str, ...] = (
    "Use 'appeared calmer' rather than 'mood improved' unless the input states mood improved.",
    "Use 'appeared calmer' rather than 'seemed more relaxed', 'seemed relaxed' or 'seemed more settled'.",
    "Prefer 'appeared calmer before bedtime' where the input states this timing.",
    "Do not add 'indicating a positive shift in mood' or 'showing emotional regulation' after observed presentation.",
    "Do not state internal emotion as fact unless the child said it.",
    "Preserve direct quotes with 'said'.",
    "Use 'appeared', 'was observed', 'not yet known' for presentation.",
    "Use complete sentences — do not join record sentences without punctuation.",
)

_ADULT_INITIALS_PATTERN = re.compile(r"\bAdult\s+([A-Z]{1,3})\b")
_ROLE_WITHOUT_INITIALS_PATTERN = re.compile(
    r"\b(the waking night adult|the shift lead|the registered manager|the key worker)\b",
    re.I,
)
_DAILY_RECORD_REQUEST = re.compile(
    r"\b(?:create|write|draft|turn|make)\b.{0,40}\b(?:a\s+)?daily\s+record\b",
    re.I,
)
_RECORD_GENERATION_REQUEST = re.compile(
    r"\b(?:create|write|draft|turn|make|convert|generate|produce|help\s+me\s+(?:write|record|create))\b"
    r".{0,80}\b(?:daily\s+record|incident\s+(?:record|report|reflection)|handover(?:\s+note)?|"
    r"magic\s+notes?|behaviour\s+(?:record|reflection)|recording|(?:a\s+)?record)\b",
    re.I,
)
_MAGIC_NOTES_REQUEST = re.compile(r"\bmagic\s+notes?\b", re.I)
_INCIDENT_RECORD_REQUEST = re.compile(
    r"\b(?:incident\s+(?:record|report|reflection|summary)|behaviour\s+incident|record\s+an?\s+incident)\b",
    re.I,
)
_EXPLANATION_REQUEST = re.compile(
    r"\b(?:why\s+is\s+this\b.+?\bwording\s+better|why\s+is\s+this\s+better|"
    r"explain\s+(?:the\s+)?(?:wording|record)|why\s+did\s+you\s+(?:write|choose))\b",
    re.I,
)

_SELF_COMMENTARY_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\bthis\s+record\s+(?:maintains|uses|demonstrates|reflects|captures|ensures)\s+(?:a\s+)?(?:factual|child-centred|therapeutic|the\s+child)",
        re.I,
    ),
    re.compile(r"\bthe\s+(?:above\s+)?record\s+is\s+(?:factual|child-centred|therapeutic|professional|suitable)\b", re.I),
    re.compile(r"\bthis\s+(?:draft\s+)?(?:is|remains)\s+(?:factual|child-centred|therapeutic|suitable)\b", re.I),
    re.compile(r"\bI\s+have\s+(?:written|created|maintained)\s+(?:a\s+)?(?:factual|child-centred)\b", re.I),
    re.compile(r"\bthis\s+(?:approach|wording)\s+ensures\b", re.I),
    re.compile(r"\bthis\s+(?:demonstrates|supports)\s+(?:a\s+)?(?:child-centred|therapeutic|factual)\b", re.I),
    re.compile(r"\b(?:in\s+conclusion|overall),?\s+this\s+record\b", re.I),
    re.compile(r"\bthe\s+record\s+is\s+child-centred\s+because\b", re.I),
    re.compile(r"\bthis\s+is\s+suitable\s+because\b", re.I),
)

_SELF_COMMENTARY_STARTERS: tuple[str, ...] = (
    "this record captures",
    "this record maintains",
    "this record ensures",
    "this approach ensures",
    "this demonstrates",
    "this supports",
    "in conclusion",
    "overall,",
    "this wording",
    "this is suitable because",
    "the record is child-centred because",
)

_CHILD_QUOTE_INTERPRETATION_RE = re.compile(
    r'(["\'][\s\S]*?["\'])\.?\s+(?:This|That)\s+(?:statement\s+)?(?:indicates?|indicated|suggests?|suggested|'
    r"shows?|showed|demonstrates?|demonstrated|may\s+indicate|could\s+suggest|reflects?|reveals?)\s+[^.!?]*[.!?]",
    re.I,
)

_INVENTED_EMOTIONAL_IMPACT_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\b(?:this\s+approach|the\s+approach)\s+allowed\b[^.!?]*\b(?:feel|felt)\s+"
        r"(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]",
        re.I,
    ),
    re.compile(
        r"\b(?:allowing|enabled|helped|this\s+(?:allowed|helped|enabled))\s+[^.!?]*\b(?:feel|felt)\s+"
        r"(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]",
        re.I,
    ),
    re.compile(
        r"\b(?:helping|allowing|enabling)\s+[^.!?]*\b(?:feel|felt)\s+"
        r"(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]",
        re.I,
    ),
    re.compile(
        r"\b(?:made|making)\s+[^.!?]*\b(?:feel|felt)\s+"
        r"(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]",
        re.I,
    ),
    re.compile(
        r"\b(?:Child|Young person|The child)\s+[A-Z]?\s*(?:felt|feel)\s+"
        r"(?:safe|comfortable|supported|reassured|calm|secure|better)\b[^.!?]*[.!?]",
        re.I,
    ),
    re.compile(r"\b(?:helped|supporting|supported)\s+[^.!?]*\b(?:regulate|regulation)\b[^.!?]*[.!?]", re.I),
    re.compile(r"\b(?:allowed|enabling)\s+[^.!?]*\bto\s+regulate\b[^.!?]*[.!?]", re.I),
    re.compile(r"\bhelped\s+them\s+regulate\s+emotionally\b[^.!?]*[.!?]", re.I),
    re.compile(r"\b(?:was|were)\s+emotionally\s+settled\b[^.!?]*[.!?]", re.I),
    re.compile(r"\bfeel\s+safe\s+and\s+comfortable\b", re.I),
)

_EMOTIONAL_IMPACT_CLAUSE_RE = re.compile(
    r",?\s*(?:(?:this|the)\s+approach\s+)?(?:allowing|helping|enabling|which\s+(?:helped|allowed))\s+"
    r"[^.!?]*\b(?:to\s+)?(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*",
    re.I,
)

_CHILD_STATED_FEELING_RE = re.compile(
    r"\b(?:said|shared|told|communicated|explained|mentioned)\b[^.!?]*"
    r'(?:["\'][^"\']*(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure|better)[^"\']*["\']'
    r"|(?:they|he|she)\s+(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure|better))",
    re.I,
)

_OUTCOME_INTERPRETATION_CLAUSE_RES: tuple[re.Pattern[str], ...] = (
    re.compile(
        r",?\s*(?:indicating|suggesting|showing|demonstrating)\s+(?:a\s+)?(?:positive\s+)?shift\s+in\s+mood\b[^.!?]*",
        re.I,
    ),
    re.compile(
        r",?\s*(?:indicating|suggesting)\s+(?:their\s+)?mood\s+(?:had\s+)?improved\b[^.!?]*",
        re.I,
    ),
    re.compile(
        r",?\s*(?:suggesting|indicating)\s+(?:they\s+)?(?:were\s+)?(?:more\s+)?settled\s+emotionally\b[^.!?]*",
        re.I,
    ),
    re.compile(
        r",?\s*(?:showing|demonstrating|indicating)\s+emotional\s+regulation\b[^.!?]*",
        re.I,
    ),
    re.compile(
        r",?\s*(?:indicating|suggesting)\s+(?:they\s+)?felt\s+better\b[^.!?]*",
        re.I,
    ),
    re.compile(
        r",?\s*(?:showing|indicating)\s+(?:they\s+)?(?:were|felt)\s+(?:more\s+)?comfortable\b[^.!?]*",
        re.I,
    ),
    re.compile(r"\bthis\s+(?:showed|demonstrated|indicated)\s+emotional\s+regulation\b[^.!?]*[.!?]", re.I),
)

_OUTCOME_INTERPRETATION_SENTENCE_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"^[^.!?]*\b(?:indicating|suggesting|showing|demonstrating)\s+emotional\s+regulation\b[^.!?]*[.!?]$", re.I),
)


_OUTCOME_ONLY_HEADING_RE = re.compile(r"^(?:#+\s+)?Outcome\s*:?\s*$", re.I)
_OUTCOME_HANDOVER_HEADING_RE = re.compile(r"^(?:#+\s+)?Outcome\s*/\s*Handover\s*:?\s*$", re.I)
_REDUNDANT_FOLLOW_UP_HEADING_RE = re.compile(
    r"^(?:#+\s+)?(?:Follow-up(?:\s+for\s+next\s+shift)?|Next\s+Steps)\s*:?\s*$",
    re.I,
)

_EMOTION_LABELS_REQUIRING_SOURCE: tuple[str, ...] = (
    "frustration",
    "frustrated",
    "dissatisfaction",
    "dissatisfied",
    "feel safe and comfortable",
    "feel supported",
    "felt supported",
    "felt reassured",
    "felt safe",
    "felt comfortable",
    "helped regulate",
    "helped child regulate",
    "allowed to feel",
    "made feel",
    "emotionally settled",
)

_OUTCOME_INTERPRETATION_LABELS: tuple[str, ...] = (
    "positive shift in mood",
    "emotional regulation",
)

_FOLLOW_UP_HEADING_RE = re.compile(
    r"^#+\s*(?:Follow-up(?:\s+for\s+next\s+shift)?|Next\s+Steps)\s*$",
    re.I | re.M,
)
_HANDOVER_PRESENT_RE = re.compile(
    r"\b(?:hand(?:ed|over)|outcome\s*/\s*handover|next\s+(?:shift|adults?|team))\b",
    re.I,
)

_OBSERVATION_INTERPRETATION_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bmood\s+improved\b", re.I), "appeared calmer"),
    (re.compile(r"\bmood\s+seemed\s+better\b", re.I), "appeared calmer"),
    (re.compile(r"\bseemed\s+more\s+relaxed\b", re.I), "appeared calmer"),
    (re.compile(r"\bseemed\s+relaxed\b", re.I), "appeared calmer"),
    (re.compile(r"\bappeared\s+relaxed\b", re.I), "appeared calmer"),
    (re.compile(r"\bwas\s+relaxed\b", re.I), "appeared calmer"),
    (re.compile(r"\bseemed\s+calmer\b", re.I), "appeared calmer"),
    (re.compile(r"\bseemed\s+more\s+settled\b", re.I), "appeared calmer"),
    (re.compile(r"\bappeared\s+more\s+settled\b", re.I), "appeared calmer"),
    (re.compile(r"\bappeared\s+more\s+relaxed\b", re.I), "appeared calmer"),
    (re.compile(r"\bappeared\s+settled\s+emotionally\b", re.I), "appeared calmer"),
)

_UNSUPPORTED_TIMELINE_PHRASES: tuple[str, ...] = (
    "as the evening progressed",
    "over the evening",
    "throughout the evening",
    "later in the evening",
)

_INTERPRETIVE_FEELINGS_SOURCE_LABELS: tuple[str, ...] = (
    "in response to child a's feelings",
    "in response to child a's emotions",
    "in response to child a's emotional state",
    "responding to child a's frustration",
    "responding to child a's dissatisfaction",
)

_INTERPRETIVE_FEELINGS_RES: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "in response to child a's feelings",
        re.compile(
            r"\bIn response to (?:Child|Young person|The child)\s+[A-Z]'s feelings,?\s*",
            re.I,
        ),
    ),
    (
        "in response to child a's emotions",
        re.compile(
            r"\bIn response to (?:Child|Young person|The child)\s+[A-Z]'s emotions,?\s*",
            re.I,
        ),
    ),
    (
        "in response to child a's emotional state",
        re.compile(
            r"\bIn response to (?:Child|Young person|The child)\s+[A-Z]'s emotional state,?\s*",
            re.I,
        ),
    ),
    (
        "responding to child a's frustration",
        re.compile(
            r"\b[Rr]esponding to (?:Child|Young person|The child)\s+[A-Z]'s frustration,?\s*",
            re.I,
        ),
    ),
    (
        "responding to child a's dissatisfaction",
        re.compile(
            r"\b[Rr]esponding to (?:Child|Young person|The child)\s+[A-Z]'s dissatisfaction,?\s*",
            re.I,
        ),
    ),
)

_ADULT_LABEL_BOUNDARY_RE = re.compile(
    r'(?<=[a-z\d"\)])(?<![A-Z])\s+(Adult\s+[A-Z]{1,3})\b'
)
_QUOTE_ADULT_BOUNDARY_RE = re.compile(
    r'((?:said|shared|stated|communicated),?\s*["\'][^"\']*["\'])\s+(Adult\s+[A-Z]{1,3}\b)',
    re.I,
)
_TRANSITION_BOUNDARY_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?<=[a-z])\s+(Later,)\s*"),
    re.compile(r"(?<=[a-z])\s+(During this time,)\s*", re.I),
)
_CHILD_OBJECT_PROTECTED_PHRASE_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bchecked\s+in\s+(?:gently\s+)?with\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\bcheck\s+in\s+gently\s+with\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\bsat\s+nearby\s+while\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\bhanded\s+over\b[^.!?]*?\bwith\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\blistened\s+to\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\bgave\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\boffered\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\bsupport(?:ed)?\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\breassured\s+Child\s+[A-Z]\b", re.I),
    re.compile(r"\backnowledged\s+Child\s+[A-Z]\b", re.I),
)

_BROKEN_CHILD_OBJECT_REPAIRS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bgave\.\s+Child\s+([A-Z])\b", re.I), r"gave Child \1"),
    (re.compile(r"\boffered\.\s+Child\s+([A-Z])\b", re.I), r"offered Child \1"),
    (re.compile(r"\bwith\.\s+Child\s+([A-Z])\b", re.I), r"with Child \1"),
    (re.compile(r"\bwhile\.\s+Child\s+([A-Z])\b", re.I), r"while Child \1"),
    (re.compile(r"\bthat\.\s+Child\s+([A-Z])\b", re.I), r"that Child \1"),
    (re.compile(r"\band\.\s+Child\s+([A-Z])\b", re.I), r"and Child \1"),
    (re.compile(r"\bsupport\.\s+Child\s+([A-Z])\b", re.I), r"support Child \1"),
    (re.compile(r"\bto\.\s+Child\s+([A-Z])\b", re.I), r"to Child \1"),
)

_ACCEPTED_TOAST_CHILD_BOUNDARY_RE = re.compile(
    r"(accepted the toast)\s+(Child\s+[A-Z])\b", re.I
)
_WATCHED_TV_CHILD_BOUNDARY_RE = re.compile(
    r"(watched television)\s+(Child\s+[A-Z])\b", re.I
)
_WATCHED_TV_SHORT_CHILD_BOUNDARY_RE = re.compile(
    r"(watched TV)\s+(Child\s+[A-Z])\b", re.I
)
_ACCEPTED_TOAST_BEFORE_BEDTIME_RE = re.compile(
    r"(accepted the toast)\s+(Before\s+bedtime)\b", re.I
)
_SECTION_HEADING_INLINE_BOUNDARY_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"(?<=[a-z])\s+(Next\s+Steps)\s*:", re.I),
    re.compile(r"(?<=[a-z])\s+(Follow-up)\s*:", re.I),
    re.compile(r"(?<=[a-z])\s+(Recommendations)\s*:", re.I),
    re.compile(r"(?<=[a-z])\s+(Outcome\s*/\s*Handover)\s*:", re.I),
)
_TRAILING_MD_ARTIFACTS_RE = re.compile(r"(?:[\n\r\s]*(?:—|___|\*\*\*)\s*)+$")
_TRAILING_HR_ARTIFACTS_RE = re.compile(r"(?:[\n\r\s]*^---+\s*)+$", re.M)
_END_OF_RECORD_ARTEFACT_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"\[End of record\]", re.I),
    re.compile(r"\[End record\]", re.I),
    re.compile(r"\bEnd of record\.?\s*$", re.I | re.M),
    re.compile(r"\bEND OF RECORD\b"),
    re.compile(r"[–-]\s*end\s*[–-]", re.I),
    re.compile(r"<end>", re.I),
)
_REDUNDANT_NEXT_STEPS_HEADING_RE = re.compile(
    r"^(?:#+\s+)?(?:Next\s+Steps|Follow-up(?:\s+for\s+next\s+shift)?|Recommendations)\s*:?\s*$",
    re.I,
)
_INLINE_REDUNDANT_NEXT_STEPS_RE = re.compile(
    r"^(?:#+\s+)?(?:Next\s+Steps|Follow-up|Recommendations)\s*:\s*(?:-\s*.+)+$",
    re.I | re.M,
)
_APPEARED_CALMER_RE = re.compile(r"\bappeared\s+calmer(?:\s+before\s+bedtime)?\b", re.I)
_ADULT_RESPONSE_HEADING_RE = re.compile(
    r"^(?:#+\s+)?Adult\s+Response\s*:?\s*$", re.I
)
_ACTION_PLAN_REQUEST_RE = re.compile(
    r"\b(?:action\s+plan|follow-up\s+action|recommendations?\s+section|"
    r"include\s+(?:next\s+steps|follow-up|action\s+plan)|end\s+of\s+record|end\s+marker|<end>)\b",
    re.I,
)
_HANDOVER_ACTION_RE = re.compile(
    r"\b(?:hand(?:ed|over)|check\s+in|monitor|tomorrow(?:'s)?\s+adults?|next\s+(?:shift|adults?))\b",
    re.I,
)

_STAFF_TO_ADULT_RE = re.compile(r"\b[Ss]taff\b")
_STAFF_ON_DUTY_RE = re.compile(r"\bStaff\s+on\s+Duty\b", re.I)
_DSL_USER_PROVIDED_RE = re.compile(r"\b(?:DSL|Designated\s+Safeguarding\s+Lead)\b", re.I)

_DSL_DEFAULT_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bManager\s*/\s*DSL\b", re.I), "manager"),
    (re.compile(r"\bDSL\s*/\s*manager\b", re.I), "manager"),
    (re.compile(r"\bDSL\s+and\s+manager\b", re.I), "manager"),
    (re.compile(r"\bmanager\s+and\s+DSL\b", re.I), "manager"),
    (re.compile(r"\bDSL\s+pathway\b", re.I), "local safeguarding procedure"),
    (re.compile(r"\bpathway\s+to\s+DSL\b", re.I), "local safeguarding procedure"),
    (re.compile(r"\bDesignated\s+Safeguarding\s+Lead\b", re.I), "responsible manager"),
    (re.compile(r"\bDSL\b"), "manager"),
)

_LOW_RISK_DAILY_RECORDING_RE = re.compile(
    r"\b(?:refused\s+breakfast|difficult\s+morning|routine\s+refusal|refused\s+food|quiet\s+evening|"
    r"calm\s+breakfast|settled\s+shift|played\s+football|early\s+night|chose\s+toast)\b",
    re.I,
)

_DISPROPORTIONATE_SAFETY_OPENING_RES: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"^(?:#+\s*)?(?:Immediate\s+)?Safety(?:\s+first)?\s*\n+"
        r"(?:First,\s+)?check\s+(?:everyone|everyone\s+nearby)\s+(?:is|are)\s+safe\.?\s*\n*",
        re.I | re.M,
    ),
    re.compile(
        r"^First,\s+check\s+(?:the\s+young\s+person|child\s+[A-Za-z]|\[[^\]]+\])\s+and\s+everyone\s+nearby\s+are\s+safe\.?\s*\n*",
        re.I | re.M,
    ),
    re.compile(r"^First,\s+check\s+everyone\s+(?:is|are)\s+safe\.?\s*\n*", re.I | re.M),
    re.compile(r"^Check\s+everyone\s+(?:is|are)\s+safe(?:\s+now)?\.?\s*\n*", re.I | re.M),
)

_CLUNKY_PLACEHOLDER_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\[Young Person'?s Name\]", re.I), "the young person"),
    (re.compile(r"\[Staff Names?\]", re.I), "staff"),
    (re.compile(r"\[Direct quote if available\]", re.I), "record the young person's exact words where known"),
    (re.compile(r"\[Child'?s words not stated\]", re.I), "record the young person's exact words where known"),
)

_GENERIC_RESIDENTIAL_ENDING_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bBy following these guidelines[^.!?]*[.!?]", re.I),
    re.compile(r"\bThis approach ensures[^.!?]*[.!?]", re.I),
    re.compile(r"\bcomprehensive account[^.!?]*[.!?]", re.I),
)

_RESIDENTIAL_PREFERRED_CLOSER = (
    "This helps the record show what happened, how the child was supported, "
    "and what needs to happen next."
)

_UNNECESSARY_DAILY_SECTION_HEADINGS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^(?:#+\s*)?Safeguarding\s+Note\s*:?\s*$", re.I | re.M),
    re.compile(r"^(?:#+\s*)?Child(?:'s|\s)Voice(?:\s*/\s*Presentation)?\s*:?\s*$", re.I | re.M),
    re.compile(r"^(?:#+\s*)?Next\s+Steps\s*:?\s*$", re.I | re.M),
    re.compile(r"^(?:#+\s*)?Professional\s+Reflection\s*:?\s*$", re.I | re.M),
    re.compile(r"^(?:#+\s*)?Quality\s+Assurance\s+Note\s*:?\s*$", re.I | re.M),
    re.compile(r"^(?:#+\s*)?Compliance\s+Note\s*:?\s*$", re.I | re.M),
    re.compile(r"^(?:#+\s*)?Follow-up(?:\s+for\s+next\s+shift)?\s*:?\s*$", re.I | re.M),
)

_EXPLANATORY_DAILY_RECORD_CLAUSE_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r",?\s*(?:This|That)\s+statement\s+indicated\b[^.!?]*[.!?]?", re.I),
    re.compile(r",?\s*(?:This|That)\s+(?:indicates?|indicated|suggests?|suggested)\b[^.!?]*[.!?]?", re.I),
    re.compile(r",?\s*\bprocessing\s+some\s+feelings\b[^.!?]*[.!?]?", re.I),
    re.compile(r",?\s*\bfeelings\s+related\s+to\b[^.!?]*[.!?]?", re.I),
    re.compile(r",?\s*This\s+provided\s+a\s+calm\s+and\s+supportive\s+environment\b[.!?]?", re.I),
    re.compile(r",?\s*This\s+approach\s+aims\b[^.!?]*[.!?]?", re.I),
    re.compile(r",?\s*\bencourage\s+open\s+communication\b[^.!?]?", re.I),
    re.compile(r",?\s*Child\s+[A-Z]'s\s+emotional\s+needs\b[^.!?]*[.!?]?", re.I),
    re.compile(r",?\s*\bto\s+see\s+how\s+they\s+were\s+feeling\b[.!?]?", re.I),
    re.compile(r",?\s*Child\s+[A-Z]\s+was\s*$", re.I),
)

_ORPHAN_FRAGMENT_CLEANUP_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bChild\s+[A-Z]\s+was\s*\.?\s*$", re.I | re.M),
    re.compile(r"\bthat\.\s*$", re.I | re.M),
)

_EXPLANATORY_INLINE_BOUNDARY_RES: tuple[re.Pattern[str], ...] = (
    re.compile(r"(watched television)\s+(This)\b", re.I),
    re.compile(r"(to talk)\s+(This)\b", re.I),
    re.compile(r"(environment)\s+(Child)\b", re.I),
)

_SAFEGUARDING_CUE_PATTERN = re.compile(
    r"\b(?:disclos\w*|allegat\w*|missing\s+from\s+care|went\s+missing|exploit\w*|"
    r"self[\s-]?harm|suicid\w*|unexplained\s+injur\w*|bruise|abuse|unsafe|inappropriat\w*|"
    r"sexualis\w*|weapon|peer[\s-]?on[\s-]?peer|substance|immediate\s+risk|"
    r"historic\s+harm|safeguarding\s+concern|lado|mash|police\s+called|999)\b",
    re.I,
)


def extract_supplied_adult_initials(text: str) -> list[str]:
    """Return Adult XX initials explicitly supplied in input — never invent."""
    seen: list[str] = []
    for match in _ADULT_INITIALS_PATTERN.finditer(str(text or "")):
        initial = match.group(1).upper()
        if initial not in seen:
            seen.append(initial)
    return seen


def resolve_adult_reference(*, initials: list[str], index: int = 0, plural: bool = False) -> str:
    if initials:
        label = f"Adult {initials[index % len(initials)]}"
        return label
    return "adults" if plural else "the adult"


def user_provided_dsl_term(text: str) -> bool:
    """True when the user explicitly included DSL or Designated Safeguarding Lead."""
    return bool(_DSL_USER_PROVIDED_RE.search(str(text or "")))


def is_low_risk_daily_recording(text: str) -> bool:
    """Routine daily recording prompts without safeguarding risk indicators."""
    source = str(text or "")
    return bool(_LOW_RISK_DAILY_RECORDING_RE.search(source)) and not has_safeguarding_cue(source)


def replace_clunky_placeholders(text: str) -> str:
    """Prefer natural residential wording over bracketed name/quote placeholders."""
    result = str(text or "")
    for pattern, replacement in _CLUNKY_PLACEHOLDER_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def strip_disproportionate_safety_opening(text: str, *, source_text: str = "") -> str:
    """Remove emergency safety-first openers from low-risk daily recording answers."""
    if has_safeguarding_cue(source_text):
        return str(text or "")
    if not (is_low_risk_daily_recording(source_text) or is_daily_record_request(source_text)):
        return str(text or "")
    result = str(text or "")
    for pattern in _DISPROPORTIONATE_SAFETY_OPENING_RES:
        result = pattern.sub("", result)
    return result.lstrip()


def strip_generic_residential_endings(text: str) -> str:
    """Remove overused generic essay endings from residential recording guidance."""
    result = str(text or "").rstrip()
    for pattern in _GENERIC_RESIDENTIAL_ENDING_RES:
        result = pattern.sub("", result).rstrip()
    return result


def sanitize_residential_answer_polish(text: str, *, source_text: str = "") -> str:
    """Apply live RM polish: terminology, medication-error guard, placeholders, proportionality."""
    from assistant.knowledge.residential_safeguarding_terminology import sanitize_medication_error_wording

    cleaned = sanitize_childrens_home_terminology(text, source_text=source_text)
    cleaned = sanitize_medication_error_wording(cleaned, source_text=source_text)
    cleaned = replace_clunky_placeholders(cleaned)
    cleaned = strip_disproportionate_safety_opening(cleaned, source_text=source_text)
    cleaned = strip_generic_residential_endings(cleaned)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def has_safeguarding_cue(text: str) -> bool:
    """Whether input or context includes safeguarding cues warranting pathway language."""
    return bool(_SAFEGUARDING_CUE_PATTERN.search(str(text or "")))


def contains_generic_staff_with_initials(text: str, *, supplied_initials: list[str]) -> bool:
    """Detect generic staff wording when Adult initials were supplied."""
    if not supplied_initials:
        return False
    return bool(_STAFF_TO_ADULT_RE.search(str(text or "")))


def sanitize_childrens_home_terminology(text: str, *, source_text: str = "") -> str:
    """Replace education-sector DSL defaults with children's home terminology unless user provided DSL."""
    if user_provided_dsl_term(source_text):
        return str(text or "")
    result = str(text or "")
    for pattern, replacement in _DSL_DEFAULT_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def strip_unnecessary_daily_record_sections(text: str, *, source_text: str = "") -> str:
    """Remove disproportionate daily-record section headings unless safeguarding cues are present."""
    if has_safeguarding_cue(source_text):
        return str(text or "")
    patterns = _UNNECESSARY_DAILY_SECTION_HEADINGS
    if user_requested_action_plan_or_end_marker(source_text):
        patterns = tuple(
            pattern
            for pattern in _UNNECESSARY_DAILY_SECTION_HEADINGS
            if "Next" not in pattern.pattern and "Follow-up" not in pattern.pattern
        )
    result = str(text or "")
    for pattern in patterns:
        result = pattern.sub("", result)
    return re.sub(r"\n{3,}", "\n\n", result).strip()


def _split_paragraphs(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"\n\s*\n", str(text or "")) if part.strip()]


def _join_paragraphs(paragraphs: list[str]) -> str:
    return "\n\n".join(paragraphs).strip()


def strip_trailing_self_commentary(text: str, *, source_text: str = "") -> str:
    """Remove post-record self-assessment paragraphs unless the user asked for explanation."""
    if user_explicitly_requests_explanation(source_text):
        return str(text or "")
    paragraphs = _split_paragraphs(text)
    if not paragraphs:
        return str(text or "")
    while paragraphs:
        tail = paragraphs[-1]
        tail_lower = tail.lower().strip()
        if is_self_commentary_paragraph(tail):
            paragraphs.pop()
            continue
        if any(tail_lower.startswith(starter) for starter in _SELF_COMMENTARY_STARTERS):
            paragraphs.pop()
            continue
        break
    return _join_paragraphs(paragraphs)


def strip_child_quote_interpretation(text: str, *, source_text: str = "") -> str:
    """Remove interpretive sentences immediately after direct child quotes in simple daily records."""
    if has_safeguarding_cue(source_text) or user_explicitly_requests_explanation(source_text):
        return str(text or "")
    if not is_daily_record_request(source_text):
        return str(text or "")
    result = _CHILD_QUOTE_INTERPRETATION_RE.sub(r"\1", str(text or ""))
    return re.sub(r"\n{3,}", "\n\n", result).strip()


def _source_supports_emotion_label(source_text: str, label: str) -> bool:
    return label.lower() in str(source_text or "").lower()


def _sentence_contains_child_stated_feeling(sentence: str) -> bool:
    """True when the sentence preserves a child-stated feeling in direct speech or reported speech."""
    return bool(_CHILD_STATED_FEELING_RE.search(str(sentence or "")))


def _trim_emotional_impact_clauses(sentence: str) -> str:
    """Strip trailing invented emotional-impact clauses while preserving adult-action lead-in."""
    trimmed = _EMOTIONAL_IMPACT_CLAUSE_RE.sub("", str(sentence or ""))
    return re.sub(r"\s{2,}", " ", trimmed).strip(" ,;.")


def strip_invented_emotional_impact(text: str, *, source_text: str = "") -> str:
    """Remove or trim invented internal emotional impact unless supported by input."""
    result = str(text or "")
    for pattern in _INVENTED_EMOTIONAL_IMPACT_PATTERNS:
        result = pattern.sub("", result)
    paragraphs = re.split(r"\n\s*\n", result)
    cleaned_paragraphs: list[str] = []
    for paragraph in paragraphs:
        stripped = paragraph.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            cleaned_paragraphs.append(stripped)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", stripped)
        kept: list[str] = []
        for sentence in sentences:
            if _sentence_contains_child_stated_feeling(sentence):
                kept.append(sentence)
                continue
            unsupported_emotion = False
            for label in _EMOTION_LABELS_REQUIRING_SOURCE:
                if label.lower() in sentence.lower() and not _source_supports_emotion_label(source_text, label):
                    unsupported_emotion = True
                    break
            trimmed = _trim_emotional_impact_clauses(sentence)
            if unsupported_emotion:
                if trimmed and not any(
                    label.lower() in trimmed.lower()
                    for label in _EMOTION_LABELS_REQUIRING_SOURCE
                    if not _source_supports_emotion_label(source_text, label)
                ):
                    kept.append(trimmed)
                elif trimmed and any(
                    label.lower() in trimmed.lower() for label in _OUTCOME_INTERPRETATION_LABELS
                ):
                    kept.append(trimmed)
                continue
            if trimmed:
                kept.append(trimmed)
        if kept:
            cleaned_paragraphs.append(" ".join(kept))
    return re.sub(r"\n{3,}", "\n\n", "\n\n".join(cleaned_paragraphs)).strip()


def strip_outcome_interpretation(text: str, *, source_text: str = "") -> str:
    """Remove outcome interpretation clauses while preserving observed presentation."""
    if has_safeguarding_cue(source_text) and not is_daily_record_request(source_text):
        return str(text or "")
    result = str(text or "")
    for pattern in _OUTCOME_INTERPRETATION_SENTENCE_RES:
        result = pattern.sub("", result)
    paragraphs = re.split(r"\n\s*\n", result)
    cleaned_paragraphs: list[str] = []
    for paragraph in paragraphs:
        stripped = paragraph.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            cleaned_paragraphs.append(stripped)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", stripped)
        kept: list[str] = []
        for sentence in sentences:
            cleaned = sentence
            for pattern in _OUTCOME_INTERPRETATION_CLAUSE_RES:
                cleaned = pattern.sub("", cleaned)
            cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,;.")
            if cleaned:
                kept.append(cleaned)
        if kept:
            cleaned_paragraphs.append(" ".join(kept))
    return re.sub(r"\n{3,}", "\n\n", "\n\n".join(cleaned_paragraphs)).strip()



def _is_outcome_only_heading(line: str) -> bool:
    return bool(_OUTCOME_ONLY_HEADING_RE.match(line.strip()))


def _is_outcome_handover_heading(line: str) -> bool:
    return bool(_OUTCOME_HANDOVER_HEADING_RE.match(line.strip()))


def _is_redundant_follow_up_heading(line: str) -> bool:
    return bool(_REDUNDANT_FOLLOW_UP_HEADING_RE.match(line.strip()))


def _content_similarity(a: str, b: str) -> bool:
    """Rough check whether two section bodies repeat the same handover content."""
    norm_a = re.sub(r"\s+", " ", (a or "").lower().strip())
    norm_b = re.sub(r"\s+", " ", (b or "").lower().strip())
    if not norm_a or not norm_b:
        return False
    if norm_a == norm_b:
        return True
    shorter, longer = (norm_a, norm_b) if len(norm_a) <= len(norm_b) else (norm_b, norm_a)
    return shorter in longer and len(shorter) >= 24


def normalize_duplicate_daily_record_headings(text: str, *, source_text: str = "") -> str:
    """Merge duplicate Outcome / Outcome / Handover headings in simple daily records."""
    if has_safeguarding_cue(source_text) or not is_daily_record_request(source_text):
        return str(text or "")
    preserve_follow_up = user_requested_action_plan_or_end_marker(source_text)
    lines = str(text or "").splitlines()
    sections: list[tuple[str, list[str]]] = []
    current_heading = ""
    current_body: list[str] = []
    for line in lines:
        stripped = line.strip()
        is_heading = bool(re.match(r"^#+\s+\S", stripped)) or (
            stripped
            and not stripped.startswith("-")
            and re.match(r"^(?:Outcome|Follow-up|Next Steps)(?:\s*/\s*Handover)?\s*:?\s*$", stripped, re.I)
        )
        if is_heading:
            if current_heading or current_body:
                sections.append((current_heading, current_body))
            current_heading = stripped
            current_body = []
            continue
        current_body.append(line)
    if current_heading or current_body:
        sections.append((current_heading, current_body))

    outcome_idx: int | None = None
    handover_idx: int | None = None
    for idx, (heading, _body) in enumerate(sections):
        if _is_outcome_only_heading(heading):
            outcome_idx = idx
        if _is_outcome_handover_heading(heading):
            handover_idx = idx

    if outcome_idx is not None and handover_idx is not None and outcome_idx != handover_idx:
        outcome_body = "\n".join(sections[outcome_idx][1]).strip()
        handover_body = "\n".join(sections[handover_idx][1]).strip()
        merged_body = outcome_body
        if handover_body and not _content_similarity(outcome_body, handover_body):
            merged_body = f"{outcome_body}\n\n{handover_body}".strip() if outcome_body else handover_body
        elif handover_body:
            merged_body = handover_body or outcome_body
        handover_heading = sections[handover_idx][0]
        if not re.match(r"^#+\s+", handover_heading.strip()):
            handover_heading = "## Outcome / Handover"
        sections[handover_idx] = (handover_heading, merged_body.splitlines())
        del sections[outcome_idx]
        if outcome_idx < handover_idx:
            handover_idx -= 1

    resolved_handover_idx = next(
        (idx for idx, (heading, _body) in enumerate(sections) if _is_outcome_handover_heading(heading)),
        None,
    )
    if resolved_handover_idx is not None:
        handover_body = "\n".join(sections[resolved_handover_idx][1]).strip()
        filtered: list[tuple[str, list[str]]] = []
        for heading, body in sections:
            if (
                not preserve_follow_up
                and _is_redundant_follow_up_heading(heading)
                and _content_similarity("\n".join(body).strip(), handover_body)
            ):
                continue
            filtered.append((heading, body))
        sections = filtered

    output_lines: list[str] = []
    for heading, body in sections:
        if heading:
            output_lines.append(heading)
        output_lines.extend(body)
        if body and body[-1].strip():
            output_lines.append("")
    return re.sub(r"\n{3,}", "\n\n", "\n".join(output_lines)).strip()


def strip_unnecessary_follow_up_section(text: str, *, source_text: str = "") -> str:
    """Remove redundant Follow-up sections when handover already covers next action."""
    if has_safeguarding_cue(source_text) or user_requested_action_plan_or_end_marker(source_text):
        return str(text or "")
    if not _HANDOVER_PRESENT_RE.search(str(text or "")):
        return str(text or "")
    lines = str(text or "").splitlines()
    output: list[str] = []
    skip_until_heading = False
    for line in lines:
        if _FOLLOW_UP_HEADING_RE.match(line.strip()):
            skip_until_heading = True
            continue
        if skip_until_heading and re.match(r"^#+\s+\S", line.strip()):
            skip_until_heading = False
        if not skip_until_heading:
            output.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(output)).strip()


def count_content_sections(text: str) -> int:
    """Count markdown section headings excluding the main record title."""
    headings = re.findall(r"^#+\s+(.+)$", str(text or ""), re.M)
    if not headings:
        return 0
    main_titles = {"daily record", "incident reflection", "handover note", "magic notes"}
    content = [
        heading
        for heading in headings
        if heading.strip().lower() not in main_titles
        and not heading.strip().lower().startswith("daily record")
    ]
    return len(content)


def is_record_generation_request(text: str) -> bool:
    """Whether the user asked ORB to create or draft a record."""
    value = str(text or "")
    if _RECORD_GENERATION_REQUEST.search(value):
        return True
    if _MAGIC_NOTES_REQUEST.search(value):
        return True
    if is_daily_record_request(value):
        return True
    if is_incident_record_request(value):
        return True
    lowered = value.lower()
    if "rough notes" in lowered and any(
        verb in lowered for verb in ("create", "write", "draft", "turn", "convert", "record")
    ):
        return True
    return False


def apply_adult_identity_language(text: str, *, supplied_initials: list[str] | None = None) -> str:
    """Replace generic Staff defaults with supplied Adult XX or the adult/adults."""
    value = str(text or "")
    if not value.strip():
        return value
    value = _STAFF_ON_DUTY_RE.sub(
        lambda m: (
            f"Adults involved: {', '.join(f'Adult {i}' for i in (supplied_initials or extract_supplied_adult_initials(value)))}"
            if (supplied_initials or extract_supplied_adult_initials(value))
            else "Adults involved"
        ),
        value,
    )
    initials = supplied_initials if supplied_initials is not None else extract_supplied_adult_initials(value)
    if initials:
        staff_index = 0

        def _replace_staff(_match: re.Match[str]) -> str:
            nonlocal staff_index
            label = f"Adult {initials[staff_index % len(initials)]}"
            staff_index += 1
            return label

        return _STAFF_TO_ADULT_RE.sub(_replace_staff, value)
    return _STAFF_TO_ADULT_RE.sub("The adult", value)


def sanitize_observation_interpretation_language(text: str, *, source_text: str = "") -> str:
    """Reframe over-interpretive presentation wording into factual observation language."""
    result = str(text or "")
    source_lower = str(source_text or "").lower()
    bedtime_timing = "before bedtime" in source_lower
    for pattern, replacement in _OBSERVATION_INTERPRETATION_REPLACEMENTS:
        resolved = "appeared calmer before bedtime" if bedtime_timing and replacement == "appeared calmer" else replacement
        result = pattern.sub(resolved, result)
    return result


def _source_supports_interpretive_feeling(source_text: str, label: str) -> bool:
    return label.lower() in str(source_text or "").lower()


def strip_interpretive_feelings_phrases(text: str, *, source_text: str = "") -> str:
    """Remove interpretive 'Child A's feelings' phrasing unless supported by user input."""
    result = str(text or "")
    for label, pattern in _INTERPRETIVE_FEELINGS_RES:
        if _source_supports_interpretive_feeling(source_text, label):
            continue
        result = pattern.sub("In response, ", result)
    result = re.sub(r"\bIn response,\s*,", "In response,", result, flags=re.I)
    result = re.sub(r"\bIn response,\s*$", "In response", result, flags=re.I)
    return result


def strip_unsupported_timeline_expansion(text: str, *, source_text: str = "") -> str:
    """Remove invented evening timeline wording unless the user provided that chronology."""
    result = str(text or "")
    source_lower = str(source_text or "").lower()
    for phrase in _UNSUPPORTED_TIMELINE_PHRASES:
        if phrase in source_lower:
            continue
        result = re.sub(rf",?\s*{re.escape(phrase)}", "", result, flags=re.I)
    lines = [re.sub(r"  +", " ", line).strip() for line in result.splitlines()]
    return "\n".join(lines).strip()


def user_requested_action_plan_or_end_marker(text: str) -> bool:
    """True when the user explicitly asked for action-plan or end-marker sections."""
    return bool(_ACTION_PLAN_REQUEST_RE.search(str(text or "")))


def user_requested_end_marker(text: str) -> bool:
    """True when the user explicitly asked to include an end-of-record marker."""
    lower = str(text or "").lower()
    return any(
        marker in lower
        for marker in ("end of record", "[end of record]", "end marker", "<end>", "end record")
    )


def _parse_record_sections(text: str) -> list[tuple[str, list[str]]]:
    lines = str(text or "").splitlines()
    sections: list[tuple[str, list[str]]] = []
    current_heading = ""
    current_body: list[str] = []
    for line in lines:
        stripped = line.strip()
        is_heading = bool(re.match(r"^#+\s+\S", stripped)) or (
            stripped
            and not stripped.startswith("-")
            and re.match(
                r"^(?:Presentation and Support|Adult Response|Outcome|Follow-up|Next Steps|Recommendations)"
                r"(?:\s*/\s*Handover)?\s*:?\s*$",
                stripped,
                re.I,
            )
        )
        if is_heading:
            if current_heading or current_body:
                sections.append((current_heading, current_body))
            current_heading = stripped
            current_body = []
            continue
        current_body.append(line)
    if current_heading or current_body:
        sections.append((current_heading, current_body))
    return sections


def _sections_to_text(sections: list[tuple[str, list[str]]]) -> str:
    output_lines: list[str] = []
    for heading, body in sections:
        if heading:
            output_lines.append(heading)
        output_lines.extend(body)
        if body and body[-1].strip():
            output_lines.append("")
    return re.sub(r"\n{3,}", "\n\n", "\n".join(output_lines)).strip()


def strip_repeated_observed_outcome(text: str, *, source_text: str = "") -> str:
    """Remove duplicate observed outcomes from Adult Response when Outcome / Handover already records them."""
    if has_safeguarding_cue(source_text) or not is_daily_record_request(source_text):
        return str(text or "")
    sections = _parse_record_sections(text)
    adult_idx: int | None = None
    outcome_idx: int | None = None
    for idx, (heading, _body) in enumerate(sections):
        if _ADULT_RESPONSE_HEADING_RE.match(heading.strip()):
            adult_idx = idx
        if _is_outcome_handover_heading(heading) or _is_outcome_only_heading(heading):
            outcome_idx = idx
    if adult_idx is None or outcome_idx is None:
        return str(text or "")
    outcome_body = "\n".join(sections[outcome_idx][1]).strip()
    adult_body = "\n".join(sections[adult_idx][1]).strip()
    if not _APPEARED_CALMER_RE.search(outcome_body) or not _APPEARED_CALMER_RE.search(adult_body):
        return str(text or "")
    cleaned_adult = re.sub(
        r",?\s+and\s+appeared\s+calmer(?:\s+before\s+bedtime)?",
        "",
        adult_body,
        flags=re.I,
    )
    cleaned_adult = re.sub(
        r",?\s+appeared\s+calmer(?:\s+before\s+bedtime)?",
        "",
        cleaned_adult,
        flags=re.I,
    )
    cleaned_adult = re.sub(r"\s{2,}", " ", cleaned_adult).strip(" ,;.")
    if not cleaned_adult:
        return str(text or "")
    sections[adult_idx] = (sections[adult_idx][0], cleaned_adult.splitlines())
    return _sections_to_text(sections)


def strip_redundant_next_steps_in_daily_record(text: str, *, source_text: str = "") -> str:
    """Remove redundant Next Steps / Follow-up / Recommendations when handover already covers next action."""
    if has_safeguarding_cue(source_text) or not is_daily_record_request(source_text):
        return str(text or "")
    if user_requested_action_plan_or_end_marker(source_text):
        return str(text or "")
    value = str(text or "")
    if not _HANDOVER_PRESENT_RE.search(value) or not _HANDOVER_ACTION_RE.search(value):
        return value
    result = _INLINE_REDUNDANT_NEXT_STEPS_RE.sub("", value)
    lines = result.splitlines()
    output: list[str] = []
    skip_until_heading = False
    for line in lines:
        stripped = line.strip()
        if _REDUNDANT_NEXT_STEPS_HEADING_RE.match(stripped):
            skip_until_heading = True
            continue
        if skip_until_heading:
            if re.match(r"^#+\s+\S", stripped) or re.match(
                r"^(?:Presentation and Support|Adult Response|Outcome|Daily Record)\b", stripped, re.I
            ):
                skip_until_heading = False
            elif stripped.startswith("-") or stripped.startswith("•") or not stripped:
                continue
            else:
                skip_until_heading = False
        if not skip_until_heading:
            output.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(output)).strip()


def strip_end_of_record_artefacts(text: str, *, source_text: str = "") -> str:
    """Remove trailing end-of-record markers from record-generation outputs."""
    if user_requested_end_marker(source_text):
        return str(text or "")
    result = str(text or "").rstrip()
    for pattern in _END_OF_RECORD_ARTEFACT_RES:
        result = pattern.sub("", result)
    result = _TRAILING_HR_ARTIFACTS_RE.sub("", result.rstrip())
    return result.rstrip()


def _trim_explanatory_clauses(sentence: str) -> str:
    """Remove explanatory AI clauses while preserving factual narrative lead-in."""
    result = str(sentence or "")
    for pattern in _EXPLANATORY_DAILY_RECORD_CLAUSE_RES:
        result = pattern.sub("", result)
    return re.sub(r"\s{2,}", " ", result).strip(" ,;.")


def strip_explanatory_daily_record_phrases(text: str, *, source_text: str = "") -> str:
    """Remove explanatory AI commentary from simple daily records unless safeguarding cues present."""
    if has_safeguarding_cue(source_text) or user_explicitly_requests_explanation(source_text):
        return str(text or "")
    if not is_daily_record_request(source_text):
        return str(text or "")
    paragraphs = re.split(r"\n\s*\n", str(text or ""))
    cleaned_paragraphs: list[str] = []
    for paragraph in paragraphs:
        stripped = paragraph.strip()
        if not stripped:
            continue
        if stripped.startswith("#") or re.match(
            r"^(?:Presentation and Support|Adult Response|Outcome|Daily Record)(?:\s*/\s*Handover)?\s*:?\s*$",
            stripped,
            re.I,
        ):
            cleaned_paragraphs.append(stripped)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", stripped)
        kept: list[str] = []
        for sentence in sentences:
            trimmed = _trim_explanatory_clauses(sentence)
            if not trimmed:
                continue
            if re.search(r"\bemotional\s+state\b", trimmed, re.I) and not _source_supports_emotion_label(
                source_text, "emotional state"
            ):
                continue
            kept.append(trimmed)
        if kept:
            cleaned_paragraphs.append(" ".join(kept))
    result = re.sub(r"\n{3,}", "\n\n", "\n\n".join(cleaned_paragraphs)).strip()
    for pattern in _ORPHAN_FRAGMENT_CLEANUP_RES:
        result = pattern.sub("", result)
    return re.sub(r"\n{3,}", "\n\n", result).strip()


def _repair_broken_child_object_punctuation(line: str) -> str:
    """Repair sanitizer damage such as 'gave. Child A' back to 'gave Child A'."""
    result = str(line or "")
    for pattern, replacement in _BROKEN_CHILD_OBJECT_REPAIRS:
        result = pattern.sub(replacement, result)
    return result


def _repair_sentence_boundaries_in_line(line: str) -> str:
    """Insert conservative full stops where record sentences were joined."""
    result = _repair_broken_child_object_punctuation(str(line or ""))
    result = _QUOTE_ADULT_BOUNDARY_RE.sub(r"\1. \2", result)
    result = re.sub(r"\bwatched TV\b", "watched television", result, flags=re.I)
    result = _WATCHED_TV_SHORT_CHILD_BOUNDARY_RE.sub(r"\1. \2", result)
    result = _WATCHED_TV_CHILD_BOUNDARY_RE.sub(r"\1. \2", result)
    result = _ACCEPTED_TOAST_BEFORE_BEDTIME_RE.sub(r"\1. \2", result)
    result = _ACCEPTED_TOAST_CHILD_BOUNDARY_RE.sub(r"\1. \2", result)
    for pattern in _EXPLANATORY_INLINE_BOUNDARY_RES:
        result = pattern.sub(r"\1. \2", result)
    result = _ADULT_LABEL_BOUNDARY_RE.sub(r". \1", result)
    for pattern in _TRANSITION_BOUNDARY_RES:
        result = pattern.sub(r". \1 ", result)
    for pattern in _SECTION_HEADING_INLINE_BOUNDARY_RES:
        result = pattern.sub(r". \1:", result)
    result = re.sub(r"\.{2,}", ".", result)
    return result.strip()


def repair_record_sentence_boundaries(text: str) -> str:
    """Conservative sentence-boundary repair for record-generation outputs."""
    if not str(text or "").strip():
        return str(text or "")
    lines = str(text).splitlines()
    repaired: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or re.match(r"^[A-Za-z][^:]{0,40}:\s*$", stripped):
            repaired.append(line)
            continue
        repaired.append(_repair_sentence_boundaries_in_line(stripped))
    return "\n".join(repaired).strip()


def strip_trailing_markdown_artefacts(text: str, *, source_text: str = "") -> str:
    """Remove trailing markdown separator lines from record outputs when not user-provided."""
    result = str(text or "").rstrip()
    source = str(source_text or "").rstrip()
    user_provided_trailing_rule = any(source.endswith(artifact) for artifact in ("—", "___", "***"))
    if user_provided_trailing_rule:
        return result
    for artifact in ("—", "___", "***"):
        if result.endswith(artifact):
            result = re.sub(rf"[\n\r\s]*{re.escape(artifact)}\s*$", "", result)
    return _TRAILING_MD_ARTIFACTS_RE.sub("", result).rstrip()


def sanitize_live_record_output(text: str, *, source_text: str = "") -> str:
    """Apply adult identity, terminology, proportionality and observation discipline to record output."""
    cleaned = str(text or "")
    initials = extract_supplied_adult_initials(source_text)

    # 1. record-only stripping
    if is_record_generation_request(source_text) and not user_explicitly_requests_explanation(source_text):
        cleaned = strip_trailing_self_commentary(cleaned, source_text=source_text)

    # Supporting pre-steps before content repairs
    cleaned = strip_interpretive_feelings_phrases(cleaned, source_text=source_text)
    cleaned = strip_unsupported_timeline_expansion(cleaned, source_text=source_text)

    # 2. safeguarding/proportionality stripping
    cleaned = sanitize_childrens_home_terminology(cleaned, source_text=source_text)
    cleaned = strip_disproportionate_safety_opening(cleaned, source_text=source_text)
    cleaned = replace_clunky_placeholders(cleaned)
    if is_daily_record_request(source_text) and not has_safeguarding_cue(source_text):
        cleaned = strip_unnecessary_daily_record_sections(cleaned, source_text=source_text)

    # 3. child quote interpretation stripping
    cleaned = strip_child_quote_interpretation(cleaned, source_text=source_text)
    cleaned = strip_explanatory_daily_record_phrases(cleaned, source_text=source_text)

    # 4. invented emotional impact stripping
    cleaned = strip_invented_emotional_impact(cleaned, source_text=source_text)

    # 5. outcome interpretation stripping
    cleaned = strip_outcome_interpretation(cleaned, source_text=source_text)
    cleaned = sanitize_observation_interpretation_language(cleaned, source_text=source_text)

    # 6. adult identity sanitisation
    if initials or _STAFF_TO_ADULT_RE.search(cleaned):
        cleaned = apply_adult_identity_language(cleaned, supplied_initials=initials)

    # 7. daily section simplification
    if is_daily_record_request(source_text) and not has_safeguarding_cue(source_text):
        cleaned = strip_redundant_next_steps_in_daily_record(cleaned, source_text=source_text)
        cleaned = strip_unnecessary_follow_up_section(cleaned, source_text=source_text)

    # 8. duplicate heading normalisation
    cleaned = normalize_duplicate_daily_record_headings(cleaned, source_text=source_text)

    # 9. repeated observed-outcome clean-up
    if is_daily_record_request(source_text) and not has_safeguarding_cue(source_text):
        cleaned = strip_repeated_observed_outcome(cleaned, source_text=source_text)

    # 10. sentence-boundary repair
    if is_record_generation_request(source_text):
        cleaned = repair_record_sentence_boundaries(cleaned)

    # 11. trailing artefact removal including [End of record]
    if is_record_generation_request(source_text) and not user_explicitly_requests_explanation(source_text):
        cleaned = strip_trailing_self_commentary(cleaned, source_text=source_text)
        cleaned = strip_end_of_record_artefacts(cleaned, source_text=source_text)
        cleaned = strip_trailing_markdown_artefacts(cleaned, source_text=source_text)

    return cleaned


def is_daily_record_request(text: str) -> bool:
    lowered = str(text or "").lower()
    if _DAILY_RECORD_REQUEST.search(text or ""):
        return True
    if "daily record" in lowered and any(
        verb in lowered for verb in ("create", "write", "draft", "from the following", "rough notes")
    ):
        return True
    return False


def is_incident_record_request(text: str) -> bool:
    return bool(_INCIDENT_RECORD_REQUEST.search(str(text or "")))


def user_explicitly_requests_explanation(text: str) -> bool:
    return bool(_EXPLANATION_REQUEST.search(str(text or "")))


def is_self_commentary_paragraph(text: str) -> bool:
    """Detect post-record self-assessment paragraphs that should not appear by default."""
    value = str(text or "").strip()
    if not value:
        return False
    return any(pattern.search(value) for pattern in _SELF_COMMENTARY_PATTERNS)


def headings_for_record_context(
    *,
    prompt_text: str = "",
    record_type: str | None = None,
) -> list[str]:
    rt = (record_type or "").strip().lower()
    if rt in {"daily_record", "general_dictation"} or (
        not rt and is_daily_record_request(prompt_text) and not is_incident_record_request(prompt_text)
    ):
        return list(DAILY_RECORD_HEADINGS)
    if rt in {"incident_report", "behaviour_reflection", "physical_intervention"} or is_incident_record_request(
        prompt_text
    ):
        return list(INCIDENT_RECORD_HEADINGS)
    if rt == "handover":
        return list(HANDOVER_RECORD_HEADINGS)
    return list(DAILY_RECORD_HEADINGS)


def build_adult_identity_prompt_block() -> str:
    lines = [
        "============================================================",
        "ADULT IDENTITY LANGUAGE",
        "",
        ADULT_IDENTITY_PRINCIPLE,
        "",
        CHILDRENS_HOME_SAFEGUARDING_TERMINOLOGY_PRINCIPLE,
        "",
        DAILY_RECORD_PROPORTIONALITY_PRINCIPLE,
        "",
        DAILY_RECORD_OUTPUT_DISCIPLINE_PRINCIPLE,
        "",
        "Examples:",
        "• Adult TK gave Child A space and did not place pressure on them to speak before they were ready.",
        "• Adult JS checked in later in a calm and gentle way.",
        "• Adults continued to offer reassurance.",
        "• The adult handed over to the next shift that tomorrow's adults should check in gently if Child A wishes to talk.",
        "",
        RECORD_HEADING_DISCIPLINE_PRINCIPLE,
        "",
        "Daily record headings (when a daily record is requested):",
        *[f"• {heading}" for heading in DAILY_RECORD_HEADINGS],
        "",
        SELF_COMMENTARY_PRINCIPLE,
        "",
        RECORD_ONLY_OUTPUT_PRINCIPLE,
        "",
        CHILD_VOICE_DISCIPLINE_PRINCIPLE,
        "",
        EMOTIONAL_IMPACT_DISCIPLINE_PRINCIPLE,
        "",
        OUTCOME_INTERPRETATION_DISCIPLINE_PRINCIPLE,
        "",
        SENTENCE_PUNCTUATION_DISCIPLINE_PRINCIPLE,
        "",
        INTERPRETIVE_FEELINGS_DISCIPLINE_PRINCIPLE,
        "",
        TIMELINE_DISCIPLINE_PRINCIPLE,
        "",
        TRAILING_MARKDOWN_DISCIPLINE_PRINCIPLE,
        "",
        DUPLICATE_HEADING_DISCIPLINE_PRINCIPLE,
        "",
        REPEATED_OUTCOME_DISCIPLINE_PRINCIPLE,
        "",
        END_OF_RECORD_DISCIPLINE_PRINCIPLE,
        "",
        DAILY_RECORD_SIMPLIFICATION_PRINCIPLE,
        "",
        "Therapeutic relational wording (use where supported by input — do not invent):",
        *[f"• {phrase}" for phrase in THERAPEUTIC_RECORDING_PHRASES],
        "",
        "Observation vs interpretation:",
        *[f"• {rule}" for rule in OBSERVATION_VS_INTERPRETATION_GUIDANCE],
        "",
        "Children's home safeguarding terminology (do not default to education terms):",
        "• manager / responsible manager / senior on shift / Registered Manager",
        "• local safeguarding procedure / placing authority / social worker where policy-led",
        "• Do not default to DSL unless the user supplied that term",
    ]
    return "\n".join(lines)


def scaffold_heading_for_scenario(scenario: dict[str, Any]) -> str:
    record_type = str(scenario.get("record_type") or "")
    family = str(scenario.get("scenario_family") or "")
    title = str(scenario.get("title") or scenario.get("id") or "Record")
    if record_type == "daily_record" or family == "daily_care":
        if re.search(r"\bincident\b", title, re.I):
            return "Daily Record"
        return title if re.search(r"\bdaily\s+record\b", title, re.I) else "Daily Record"
    if record_type in {"incident_report", "behaviour_reflection", "physical_intervention"}:
        return title
    if record_type == "handover" or family == "handover":
        return "Handover Note" if "handover" not in title.lower() else title
    return title


def daily_scaffold_section_headings() -> list[tuple[str, str]]:
    """Section key to heading label for daily_care scaffold outputs."""
    return [
        ("presentation", "Presentation and Support"),
        ("adult_response", "Adult Response"),
        ("outcome", "Outcome / Handover"),
    ]

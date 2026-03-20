import os
import logging

from openai import AsyncOpenAI

from assistant.assistant_engine import AssistantRequest, build_assistant_prompt_package
from assistant.web_search import web_search

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

GUIDANCE_KEYWORDS = [
    "regulation",
    "regulations",
    "law",
    "legal",
    "policy",
    "guidance",
    "statutory",
    "ofsted",
    "inspection",
    "framework",
    "standard",
    "procedure",
    "quality standard",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "sccif",
]


def normalise_response_mode(response_mode: str | None, speed: str | None) -> str:
    value = (response_mode or speed or "balanced").strip().lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    return "balanced"


def trim_history(history: list[dict], selected_mode: str) -> list[dict]:
    if not history:
        return []

    if selected_mode == "quick":
        limit = 4
    elif selected_mode == "deep":
        limit = 8
    else:
        limit = 6

    trimmed = history[-limit:]

    # Avoid sending the latest user message twice if the route has already
    # inserted it into history before we append the final user message below.
    if trimmed and trimmed[-1].get("role") == "user":
        trimmed = trimmed[:-1]

    cleaned = []
    for item in trimmed:
        role_name = item.get("role")
        content = (item.get("message") or "").strip()
        if role_name in {"user", "assistant"} and content:
            cleaned.append({
                "role": role_name,
                "content": content
            })
    return cleaned


def trim_document_text(document_text: str | None, selected_mode: str) -> str | None:
    if not document_text:
        return None

    text = document_text.strip()
    if not text:
        return None

    if selected_mode == "quick":
        limit = 12000
    elif selected_mode == "deep":
        limit = 40000
    else:
        limit = 22000

    return text[:limit]


def should_search_guidance(message: str, mode: str, safeguarding_level: str, response_mode: str) -> bool:
    text = (message or "").lower()

    # Quick mode should stay fast unless you later choose to explicitly force search.
    if response_mode == "quick":
        return False

    # In urgent safeguarding, speed and clear action matter more than live search.
    if safeguarding_level in {"heightened", "urgent"}:
        return False

    # For direct drafting tasks, avoid slowing the response unless the user is
    # clearly asking for guidance/regulatory content.
    if mode in {"handover", "recording", "incident_summary", "rewrite", "chronology"}:
        return any(keyword in text for keyword in GUIDANCE_KEYWORDS)

    return any(keyword in text for keyword in GUIDANCE_KEYWORDS)


def choose_model(mode: str, safeguarding_level: str, response_mode: str, has_document: bool) -> str:
    # Fastest practical path
    if safeguarding_level == "urgent":
        return "gpt-4o-mini"

    if response_mode == "quick":
        return "gpt-4o-mini"

    # Deep review gets the stronger model
    if response_mode == "deep":
        return "gpt-4o"

    # Balanced mode: use stronger model only where the work benefits from it
    if mode in {"support_planning", "manager_review", "supervision"}:
        return "gpt-4o"

    if has_document and mode in {"document_review", "rewrite"}:
        return "gpt-4o"

    return "gpt-4o-mini"


def choose_temperature(mode: str, response_mode: str) -> float:
    if response_mode == "quick":
        return 0.2
    if mode in {"incident_summary", "recording", "chronology", "handover"}:
        return 0.15
    if response_mode == "deep":
        return 0.35
    return 0.25


def choose_max_tokens(mode: str, response_mode: str) -> int:
    if response_mode == "quick":
        return 500
    if response_mode == "deep":
        return 1400
    if mode in {"incident_summary", "recording", "handover", "chronology"}:
        return 700
    return 1000


async def generate_ai_stream(
    message: str,
    session_id: str,
    history=None,
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "residential care staff",
    ld_lens: bool = False,
    training_mode: bool = False,
    speed: str = "balanced",
    user_context: dict | None = None,
    response_mode: str = "balanced",
):
    history = history or []
    user_context = user_context or {}

    selected_mode = normalise_response_mode(response_mode, speed)
    trimmed_document_text = trim_document_text(document_text, selected_mode)

    prompt_package = build_assistant_prompt_package(
        AssistantRequest(
            message=message,
            session_id=session_id,
            history=history[-8:],
            role=role,
            document_text=trimmed_document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=selected_mode,
            user_context=user_context,
        )
    )

    system_prompt = prompt_package.system_prompt
    user_message = prompt_package.user_message
    mode = prompt_package.runtime.mode
    safeguarding_level = prompt_package.runtime.safeguarding_level

    search_results = ""
    if should_search_guidance(message, mode, safeguarding_level, selected_mode):
        try:
            search_results = web_search(message)
        except Exception as e:
            logger.exception("Guidance search failed for session %s: %s", session_id, e)
            search_results = ""

    if search_results:
        system_prompt += f"""

============================================================
LIVE WEB GUIDANCE CONTEXT

The following trusted guidance excerpts were retrieved for this request:

{search_results}

Use this only where it genuinely improves accuracy.
Prefer statutory guidance, legislation, Ofsted, and official frameworks where relevant.
Do not let this stop you completing practical drafting tasks directly.
"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(trim_history(history, selected_mode))
    messages.append({
        "role": "user",
        "content": user_message
    })

    model = choose_model(
        mode=mode,
        safeguarding_level=safeguarding_level,
        response_mode=selected_mode,
        has_document=bool(trimmed_document_text),
    )
    temperature = choose_temperature(mode, selected_mode)
    max_tokens = choose_max_tokens(mode, selected_mode)

    logger.info(
        "Starting OpenAI stream for session %s | mode=%s | safeguarding=%s | response_mode=%s | model=%s | max_tokens=%s",
        session_id,
        mode,
        safeguarding_level,
        selected_mode,
        model,
        max_tokens,
    )

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta
        content = getattr(delta, "content", None)

        if content:
            yield content

    logger.info("Completed OpenAI stream for session %s", session_id)

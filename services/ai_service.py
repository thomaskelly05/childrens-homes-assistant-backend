import asyncio
import logging
import os

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

LEADERSHIP_TRIGGER_KEYWORDS = [
    "registered manager",
    "manager review",
    "manager oversight",
    "audit",
    "quality assurance",
    "qa",
    "inspection",
    "ofsted",
    "responsible individual",
    "provider oversight",
    "governance",
    "action plan",
    "service issue",
    "pattern",
]

SEARCH_TIMEOUT_SECONDS = float(os.getenv("GUIDANCE_SEARCH_TIMEOUT_SECONDS", "3.0"))


def normalise_response_mode(response_mode: str | None, speed: str | None) -> str:
    value = (response_mode or speed or "balanced").strip().lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    return "balanced"


def trim_history(history: list[dict], selected_mode: str) -> list[dict]:
    if not history:
        return []

    if selected_mode == "quick":
        limit = 3
    elif selected_mode == "deep":
        limit = 8
    else:
        limit = 5

    trimmed = history[-limit:]

    if trimmed and trimmed[-1].get("role") == "user":
        trimmed = trimmed[:-1]

    cleaned: list[dict] = []
    for item in trimmed:
        role_name = item.get("role")
        content = (item.get("message") or item.get("content") or "").strip()

        if role_name in {"user", "assistant"} and content:
            cleaned.append(
                {
                    "role": role_name,
                    "content": content[:12000],
                }
            )

    return cleaned


def trim_document_text(document_text: str | None, selected_mode: str) -> str | None:
    if not document_text:
        return None

    text = document_text.strip()
    if not text:
        return None

    if selected_mode == "quick":
        limit = 6000
    elif selected_mode == "deep":
        limit = 24000
    else:
        limit = 12000

    return text[:limit]


def should_search_guidance(message: str, mode: str, safeguarding_level: str, response_mode: str) -> bool:
    text = (message or "").lower()

    if response_mode == "quick":
        return False

    if safeguarding_level in {"heightened", "urgent"}:
        return False

    if mode in {"handover", "recording", "incident_summary", "rewrite", "chronology"}:
        return any(keyword in text for keyword in GUIDANCE_KEYWORDS)

    return any(keyword in text for keyword in GUIDANCE_KEYWORDS)


def should_use_leadership_grade_reasoning(message: str, mode: str, response_mode: str) -> bool:
    text = (message or "").lower()

    if response_mode == "quick":
        return any(keyword in text for keyword in LEADERSHIP_TRIGGER_KEYWORDS)

    if mode in {"manager_review", "supervision", "support_planning", "document_review", "reflective"}:
        return True

    return any(keyword in text for keyword in LEADERSHIP_TRIGGER_KEYWORDS)


def choose_model(mode: str, safeguarding_level: str, response_mode: str, has_document: bool, message: str) -> str:
    if safeguarding_level == "urgent":
        return "gpt-4o-mini"

    if response_mode == "quick":
        return "gpt-4o-mini"

    if response_mode == "deep":
        return "gpt-4o"

    if should_use_leadership_grade_reasoning(message, mode, response_mode):
        return "gpt-4o"

    if has_document and mode in {"document_review", "rewrite"}:
        return "gpt-4o"

    return "gpt-4o-mini"


def choose_temperature(mode: str, response_mode: str) -> float:
    if response_mode == "quick":
        return 0.15

    if mode in {"incident_summary", "recording", "chronology", "handover"}:
        return 0.1

    if response_mode == "deep":
        return 0.3

    return 0.2


def choose_max_tokens(mode: str, response_mode: str) -> int:
    if response_mode == "quick":
        return 350

    if response_mode == "deep":
        return 1200

    if mode in {"incident_summary", "recording", "handover", "chronology"}:
        return 600

    if mode in {"manager_review", "supervision", "support_planning", "document_review"}:
        return 1000

    return 850


async def maybe_run_guidance_search(
    message: str,
    mode: str,
    safeguarding_level: str,
    response_mode: str,
) -> str:
    if not should_search_guidance(message, mode, safeguarding_level, response_mode):
        return ""

    try:
        return await asyncio.wait_for(
            asyncio.to_thread(web_search, message),
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
    except TimeoutError:
        logger.warning("Guidance search timed out")
        return ""
    except Exception:
        logger.exception("Guidance search failed")
        return ""


def build_messages(
    system_prompt: str,
    user_message: str,
    history: list[dict],
    selected_mode: str,
) -> list[dict]:
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(trim_history(history, selected_mode))
    messages.append({"role": "user", "content": user_message})
    return messages


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

    search_results = await maybe_run_guidance_search(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        response_mode=selected_mode,
    )

    if search_results:
        system_prompt += f"""

LIVE GUIDANCE CONTEXT

The following trusted guidance excerpts were retrieved for this request:

{search_results}

Use this only where it genuinely improves accuracy.
Prefer statutory guidance, legislation, Ofsted, and official frameworks where relevant.
Do not let this stop you completing practical drafting tasks directly.
"""

    messages = build_messages(
        system_prompt=system_prompt,
        user_message=user_message,
        history=history,
        selected_mode=selected_mode,
    )

    model = choose_model(
        mode=mode,
        safeguarding_level=safeguarding_level,
        response_mode=selected_mode,
        has_document=bool(trimmed_document_text),
        message=message,
    )
    temperature = choose_temperature(mode, selected_mode)
    max_tokens = choose_max_tokens(mode, selected_mode)

    logger.info(
        "Starting OpenAI stream session_id=%s mode=%s safeguarding=%s response_mode=%s model=%s max_tokens=%s history_count=%s has_document=%s",
        session_id,
        mode,
        safeguarding_level,
        selected_mode,
        model,
        max_tokens,
        len(messages),
        bool(trimmed_document_text),
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

    logger.info("Completed OpenAI stream session_id=%s", session_id)

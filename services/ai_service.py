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
    "sccif",
]


def should_search_guidance(message: str, mode: str, safeguarding_level: str) -> bool:
    text = (message or "").lower()

    # Skip live web search for most fast operational tasks
    if safeguarding_level in {"heightened", "urgent"}:
        return False

    if mode in {"handover", "recording", "incident_summary", "rewrite", "chronology"}:
        return False

    return any(keyword in text for keyword in GUIDANCE_KEYWORDS)


def choose_model(mode: str, safeguarding_level: str, speed: str) -> str:
    if speed == "slow":
        return "gpt-4o"

    if mode in {"support_planning", "manager_review", "supervision"}:
        return "gpt-4o"

    if safeguarding_level in {"heightened", "urgent"}:
        return "gpt-4o-mini"

    return "gpt-4o-mini"


async def generate_ai_stream(
    message: str,
    session_id: str,
    history=None,
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "residential care staff",
    ld_lens: bool = False,
    training_mode: bool = False,
    speed: str = "normal",
    user_context: dict | None = None,
):
    history = history or []
    user_context = user_context or {}

    prompt_package = build_assistant_prompt_package(
        AssistantRequest(
            message=message,
            session_id=session_id,
            history=history[-6:],
            role=role,
            document_text=document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=speed,
            user_context=user_context,
        )
    )

    system_prompt = prompt_package.system_prompt
    user_message = prompt_package.user_message
    mode = prompt_package.runtime.mode
    safeguarding_level = prompt_package.runtime.safeguarding_level

    search_results = ""
    if should_search_guidance(message, mode, safeguarding_level):
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

    history_to_use = history[-6:]
    if history_to_use and history_to_use[-1].get("role") == "user":
        history_to_use = history_to_use[:-1]

    for m in history_to_use:
        role_name = m.get("role")
        content = (m.get("message") or "").strip()

        if role_name in {"user", "assistant"} and content:
            messages.append({
                "role": role_name,
                "content": content
            })

    messages.append({"role": "user", "content": user_message})

    model = choose_model(mode, safeguarding_level, speed)

    logger.info(
        "Starting OpenAI stream for session %s | mode=%s | safeguarding=%s | model=%s",
        session_id,
        mode,
        safeguarding_level,
        model,
    )

    stream = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        temperature=0.4,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta
        content = getattr(delta, "content", None)

        if content:
            yield content

    logger.info("Completed OpenAI stream for session %s", session_id)

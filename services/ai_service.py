import os
import logging

from openai import AsyncOpenAI

from assistant.assistant_engine import AssistantRequest, build_assistant_prompt_package
from assistant.web_search import web_search

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)

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
    "safeguarding",
    "framework",
    "standard",
    "procedure",
]


def should_search_guidance(message: str) -> bool:
    text = message.lower()
    return any(keyword in text for keyword in GUIDANCE_KEYWORDS)


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

    search_results = ""
    try:
        if should_search_guidance(message):
            search_results = web_search(message)
    except Exception as e:
        logger.exception("Guidance search failed for session %s: %s", session_id, e)
        search_results = ""

    prompt_package = build_assistant_prompt_package(
        AssistantRequest(
            message=message,
            session_id=session_id,
            history=history,
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

    history_to_use = history
    if history and history[-1].get("role") == "user":
        history_to_use = history[:-1]

    for m in history_to_use:
        role_name = m.get("role")
        content = (m.get("message") or "").strip()

        if role_name in {"user", "assistant"} and content:
            messages.append({
                "role": role_name,
                "content": content
            })

    messages.append({
        "role": "user",
        "content": user_message
    })

    logger.info(
        "Starting OpenAI stream for session %s | mode=%s | safeguarding=%s",
        session_id,
        prompt_package.runtime.mode,
        prompt_package.runtime.safeguarding_level,
    )

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
    )

    async for chunk in stream:
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta
        content = getattr(delta, "content", None)

        if content:
            yield content

    logger.info("Completed OpenAI stream for session %s", session_id)

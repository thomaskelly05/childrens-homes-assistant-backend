import os
import asyncio

from openai import AsyncOpenAI

from assistant.mode_detector import detect_mode
from assistant.prompts import build_chat_prompt
from assistant.web_search import web_search
from assistant.memory import save_message, load_recent_messages


client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


# keywords that trigger guidance search
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
    "procedure"
]


def should_search_guidance(message: str) -> bool:

    text = message.lower()

    return any(keyword in text for keyword in GUIDANCE_KEYWORDS)


async def generate_ai_stream(message: str, session_id: str):

    # Load conversation history from database
    history = load_recent_messages(session_id)

    # Detect response mode
    mode = detect_mode(message)

    # Decide whether to run web search
    search_results = ""

    if should_search_guidance(message):
        search_results = web_search(message)

    # Build system prompt
    system_prompt, user_message = build_chat_prompt(
        message=message,
        role="residential care staff",
        ld_lens=False,
        training_mode=False,
        speed="normal"
    )

    # Add guidance context if available
    if search_results:

        system_prompt += f"""

------------------------------------------------------------
INDICARE WEB GUIDANCE CONTEXT

The following trusted guidance excerpts were retrieved:

{search_results}

------------------------------------------------------------
GUIDANCE REASONING INSTRUCTIONS

Before answering the user:

1. Review the guidance excerpts.
2. Identify the most authoritative sources.
3. Prefer statutory guidance, legislation, and Ofsted frameworks.
4. Use practice guidance only when statutory guidance is not available.

Authority ranking:

1. Legislation or statutory guidance
2. Ofsted inspection frameworks
3. National safeguarding organisations
4. Practice research sources

When helpful, reference the guidance source naturally in your explanation.

If guidance may vary across organisations, encourage the user to check:

• their organisation's policies  
• current statutory guidance  
• their safeguarding lead or manager  

Do not treat retrieved sources as definitive instructions.
They are supporting context only.
"""

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Add conversation history
    for m in history:

        messages.append({
            "role": m["role"],
            "content": m["message"]
        })

    messages.append({
        "role": "user",
        "content": user_message
    })

    # Save the user message to memory
    save_message(session_id, "user", message)

    # Stream response
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True
    )

    response_text = ""

    async for chunk in stream:

        if chunk.choices[0].delta.content:

            content = chunk.choices[0].delta.content

            response_text += content

            yield content

            await asyncio.sleep(0.01)

    # Save assistant response to memory
    save_message(session_id, "assistant", response_text)

import os

from openai import AsyncOpenAI

from assistant.prompts import build_chat_prompt
from assistant.web_search import web_search

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
    "procedure"
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
):
    history = history or []

    search_results = ""
    if should_search_guidance(message):
        search_results = web_search(message)

    system_prompt, user_message = build_chat_prompt(
        message=message,
        role="residential care staff",
        ld_lens=False,
        training_mode=False,
        speed="normal"
    )

    if search_results:
        system_prompt += f"""

------------------------------------------------------------
INDICARE WEB GUIDANCE CONTEXT

The following trusted guidance excerpts were retrieved:

{search_results}

------------------------------------------------------------
GUIDANCE USE INSTRUCTIONS

Use this guidance only where it genuinely helps answer the user's question.
Prefer statutory guidance, legislation, and Ofsted frameworks where relevant.
Do not let guidance context prevent practical task completion.
If the user is asking for a draft, plan, handover, or summary, complete that task directly and use guidance only to support accuracy where needed.
If guidance may vary across organisations, say so clearly.
"""

    if document_text:
        trimmed_document_text = document_text[:30000]

        system_prompt += f"""

------------------------------------------------------------
UPLOADED DOCUMENT CONTEXT

The user has uploaded a document for this conversation.

Document name:
{document_name or "Uploaded document"}

Use the uploaded document as working context when relevant.

Rules for using the uploaded document:
• read it as source material
• help complete, review, rewrite, structure, or improve it when the user asks
• do not invent facts that are not present in the document or the user's instructions
• if sections are incomplete, identify gaps clearly
• where safe drafting assumptions are needed, label them clearly
• distinguish between facts already in the document and proposed wording
• if the user asks you to complete a document, do so provisionally and transparently where information is missing

Uploaded document text:
{trimmed_document_text}
"""

    messages = [{"role": "system", "content": system_prompt}]

    for m in history:
        if m["role"] in {"user", "assistant"} and m["message"].strip():
            messages.append({
                "role": m["role"],
                "content": m["message"]
            })

    messages.append({
        "role": "user",
        "content": user_message
    })

    stream = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True
    )

    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield content

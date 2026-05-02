from assistant.llm_provider import get_llm_provider, ChatStreamRequest

async def generate_partner_response(message: str) -> str:
    provider = get_llm_provider()

    messages = [
        {"role": "system", "content": "You are IndiCare Assistant for residential care. Provide clear, safeguarding-aware answers."},
        {"role": "user", "content": message},
    ]

    result_text = ""

    async for chunk in provider.stream_chat(ChatStreamRequest(messages=messages)):
        if isinstance(chunk, str):
            result_text += chunk

    return result_text.strip()

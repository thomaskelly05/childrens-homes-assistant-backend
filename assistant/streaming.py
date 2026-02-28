# assistant/streaming.py

from openai import OpenAI

client = OpenAI()

def run_chat_stream(system_prompt: str, user_prompt: str):
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        stream=True,
    )

    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.get("content"):
            yield chunk.choices[0].delta["content"]

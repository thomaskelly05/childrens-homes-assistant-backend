from openai import OpenAI

client = OpenAI()

def run_chat_stream(system_prompt: str, user_prompt: str):
    stream = client.chat.completions.create(
        model="gpt-4o-mini",   # ← THIS FIXES THE FLUFF
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        stream=True,
    )

    for chunk in stream:
        if (
            chunk.choices
            and chunk.choices[0].delta
            and chunk.choices[0].delta.content
        ):
            yield chunk.choices[0].delta.content

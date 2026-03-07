from openai import OpenAI

client = OpenAI()


def run_chat_stream(messages):

    # Convert simple message format into OpenAI's typed format
    formatted_messages = []

    for m in messages:
        formatted_messages.append({
            "role": m["role"],
            "content": [
                {"type": "text", "text": m["content"]}
            ]
        })

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=formatted_messages,
        stream=True,
    )

    for chunk in stream:

        if (
            chunk.choices
            and chunk.choices[0].delta
            and chunk.choices[0].delta.content
        ):
            yield chunk.choices[0].delta.content

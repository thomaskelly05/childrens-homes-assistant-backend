from openai import OpenAI

client = OpenAI()

def generate_title(message):

    prompt = f"""
    Create a very short conversation title (max 6 words).

    Message:
    {message}
    """

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"user","content":prompt}]
    )

    return res.choices[0].message.content.strip()

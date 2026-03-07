from openai import OpenAI

client = OpenAI()

async def generate_incident_text(description):

    prompt = f"""
    Write a professional residential children's home incident report.

    Incident description:
    {description}

    Include:
    - description
    - action taken
    - outcome
    """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content

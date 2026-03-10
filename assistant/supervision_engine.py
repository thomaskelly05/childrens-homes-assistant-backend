import openai
import os

client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def generate_supervision_summary(conversation):

    prompt = f"""
You are assisting with reflective supervision preparation
for staff working in a UK children's home.

Below is a reflective conversation between a staff member
and a reflection assistant.

Your task is to generate a short supervision reflection summary.

Important rules:

• do NOT analyse children
• do NOT interpret behaviour
• do NOT describe incidents
• focus only on staff reflection
• keep tone neutral and professional

Conversation:

{conversation}

Write a supervision reflection summary including:

1. reflection overview
2. key reflection themes
3. possible supervision discussion points
"""

    response = client.chat.completions.create(

        model="gpt-4o-mini",

        messages=[
            {"role": "system", "content": "You support reflective supervision."},
            {"role": "user", "content": prompt}
        ]

    )

    return response.choices[0].message.content

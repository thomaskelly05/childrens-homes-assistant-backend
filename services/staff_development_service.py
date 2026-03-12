from providers.openai_provider import ask_llm


async def generate_staff_pdp(entries):

    reflections = "\n\n".join([
        f"""
Date: {e.get('created_at')}

Reflection:
{e.get('reflection_today')}

Analysis:
{e.get('analysis')}

Action Plan:
{e.get('action_plan')}
"""
        for e in entries
    ])

    prompt = f"""
You are a leadership coach for adults working in a UK children's home.

Below are reflective journal entries from a staff member.

Use them to create a Personal Development Plan.

Focus on:

1. Strengths in practice
2. Areas for development
3. Leadership growth
4. Relationship practice (PACE)
5. Emotional resilience
6. Practical actions for the next 3 months

Journal entries:

{reflections}

Create a structured development plan.
"""

    result = await ask_llm(prompt)

    return result

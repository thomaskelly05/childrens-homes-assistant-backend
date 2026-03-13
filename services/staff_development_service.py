from services.openai_service import ask_openai


def _build_reflection_text(entries):
    parts = []

    for e in entries:
        parts.append(
            f"""
Date: {e.get("created_at", "")}

Overview:
- Holding today: {e.get("holding_today", "")}
- Practice today: {e.get("practice_today", "")}
- Reflection today: {e.get("reflection_today", "")}

Gibbs:
- Description: {e.get("description", "")}
- Feelings: {e.get("feelings", "")}
- Evaluation: {e.get("evaluation", "")}
- Analysis: {e.get("analysis", "")}
- Conclusion: {e.get("conclusion", "")}
- Action plan: {e.get("action_plan", "")}

PACE:
- Playfulness: {e.get("playfulness", "")}
- Acceptance: {e.get("acceptance", "")}
- Curiosity: {e.get("curiosity", "")}
- Empathy: {e.get("empathy", "")}

Leadership:
- Leadership style: {e.get("leadership_style", "")}
- Leadership reflection: {e.get("leadership_reflection", "")}

Impact:
- Child impact: {e.get("child_impact", "")}
- Team impact: {e.get("team_impact", "")}
- Safeguarding considerations: {e.get("safeguarding_considerations", "")}
- Support needed: {e.get("support_needed", "")}
"""
        )

    return "\n\n".join(parts)


def build_journal_summary(journal: dict) -> str:
    fields = [
        ("Holding Today", journal.get("holding_today")),
        ("Practice Today", journal.get("practice_today")),
        ("Reflection Today", journal.get("reflection_today")),
        ("Description", journal.get("description")),
        ("Feelings", journal.get("feelings")),
        ("Evaluation", journal.get("evaluation")),
        ("Analysis", journal.get("analysis")),
        ("Conclusion", journal.get("conclusion")),
        ("Action Plan", journal.get("action_plan")),
        ("Playfulness", journal.get("playfulness")),
        ("Acceptance", journal.get("acceptance")),
        ("Curiosity", journal.get("curiosity")),
        ("Empathy", journal.get("empathy")),
        ("Leadership Style", journal.get("leadership_style")),
        ("Leadership Reflection", journal.get("leadership_reflection")),
        ("Impact on Young Person", journal.get("child_impact")),
        ("Impact on Team", journal.get("team_impact")),
        ("Safeguarding Considerations", journal.get("safeguarding_considerations")),
        ("Support Needed", journal.get("support_needed")),
    ]

    lines = []

    for label, value in fields:
        if value and str(value).strip():
            lines.append(f"{label}:\n{value}\n")

    return "\n".join(lines).strip()


async def generate_staff_pdp(entries):
    reflections = _build_reflection_text(entries)

    prompt = f"""
You are an experienced supervisor supporting adults who work in a children's home in the UK.

Use the reflective journal entries below to produce a Personal Development Plan for the staff member.

Write in clear professional British English.

Focus on:
1. Strengths in practice
2. Areas for development
3. PACE-informed relationship practice
4. Leadership development
5. Emotional resilience and self-awareness
6. Three practical development goals for the next 3 months
7. Specific actions the adult can take
8. Support the manager/supervisor should provide

Journal entries:
{reflections}

Return the response in this exact structure:

Personal Development Plan

Summary
[short paragraph]

Strengths
- ...
- ...
- ...

Areas for Development
- ...
- ...
- ...

PACE Reflection Themes
- ...
- ...
- ...

Leadership Development Themes
- ...
- ...
- ...

Emotional Resilience / Self-Awareness
- ...
- ...
- ...

3-Month Development Goals
1. ...
2. ...
3. ...

Actions for the Adult
- ...
- ...
- ...

Support from Manager / Supervision
- ...
- ...
- ...
"""
    return await ask_openai(prompt)


async def generate_supervision_pack(entries):
    reflections = _build_reflection_text(entries)

    prompt = f"""
You are an experienced supervisor for adults working in a UK children's home.

Use the journal entries below to create a professional supervision pack.

The tone should be supportive, reflective, strengths-based, and suitable for adult supervision in residential childcare in the UK.

Journal entries:
{reflections}

Create the supervision pack using exactly these headings:

Supervision Pack

1. Overview of Reflection
Write one short paragraph summarising the main themes across the entries.

2. Strengths in Practice
Provide 4-6 bullet points.

3. Areas for Development
Provide 4-6 bullet points.

4. PACE Themes
Provide 3-5 bullet points showing what stands out about playfulness, acceptance, curiosity and empathy.

5. Leadership and Team Practice
Provide 3-5 bullet points.

6. Emotional Wellbeing and Resilience
Provide 3-5 bullet points.

7. Safeguarding / Risk / Professional Curiosity
Provide 3-5 bullet points, but only include concerns if the entries actually suggest them.

8. Recommended Supervision Discussion Questions
Provide 6 reflective supervision questions.

9. Suggested Training / Coaching Priorities
Provide 3-5 bullet points.

10. Agreed Actions for the Next 4-8 Weeks
Provide 5 practical actions.

11. Draft Development Goals for the Next 3 Months
Provide 3 numbered goals.

Keep it concise, useful, and grounded in the reflections provided.
"""
    return await ask_openai(prompt)

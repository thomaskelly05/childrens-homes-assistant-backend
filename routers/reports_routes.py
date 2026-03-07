from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter(prefix="/reports", tags=["Reports"])

client = OpenAI()


class IncidentRequest(BaseModel):
    description: str


@router.post("/incident")
def generate_incident_report(payload: IncidentRequest):

    prompt = f"""
You help residential children's home staff write structured incident reports.

Write a professional, neutral incident report using the structure below.

Do NOT invent details. Use only the information provided.

Sections:

Incident Summary
Immediate Context
Staff Response
Safeguarding Considerations
Reflection
Next Steps

Incident description:
{payload.description}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    return {
        "report": response.choices[0].message.content
    }

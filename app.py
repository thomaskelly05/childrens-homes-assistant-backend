from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
from pypdf import PdfReader
import logging

# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------
logger = logging.getLogger("uvicorn.error")

# ---------------------------------------------------------
# OPENAI CLIENT (new API)
# ---------------------------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------
# FASTAPI APP
# ---------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    role: str
    mode: str  # "ask" or "training"
    speed: str | None = "fast"  # "fast" or "deep"

# ---------------------------------------------------------
# LOAD PDFs
# ---------------------------------------------------------
def load_pdf_pages(path: str):
    try:
        reader = PdfReader(path)
        return [{"index": i, "text": (p.extract_text() or "")} for i, p in enumerate(reader.pages)]
    except Exception as e:
        logger.error(f"Error loading PDF {path}: {e}")
        return []

PDF_GUIDE_PAGES = load_pdf_pages("childrens_home_guide.pdf")
PDF_REGS_PAGES = load_pdf_pages("childrens_homes_regulations_2015.pdf")

# ---------------------------------------------------------
# SIMPLE RETRIEVAL
# ---------------------------------------------------------
def simple_retrieve(pages, query: str, top_k: int = 3):
    terms = [w.lower() for w in query.split() if len(w) > 3]
    scored = []
    for page in pages:
        text_lower = page["text"].lower()
        score = sum(text_lower.count(t) for t in terms)
        if score > 0:
            scored.append((score, page))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p["text"] for score, p in scored[:top_k]]

# ---------------------------------------------------------
# PROMPT BLOCKS
# ---------------------------------------------------------

STYLE_BLOCK = """
WRITING STYLE (BRITISH + THERAPEUTIC):
Use British spelling, grammar, and phrasing at all times.
Tone is calm, steady, warm but professional, and emotionally attuned.
Be reflective rather than directive. Support confidence and clarity.
Avoid Americanisms, avoid jargon unless sector‑standard, avoid judgemental language.
Focus on the child’s lived experience, emotional safety, and relational practice.
Model curiosity, empathy, and good professional boundaries.
"""

ROLE_BLOCK = """
ROLE BEHAVIOUR:

SUPPORT WORKER:
Focuses on safe, consistent, child‑centred practice. Needs clarity, reassurance, and practical steps. Benefits from understanding the “why” behind decisions without being overloaded.

SENIOR SUPPORT WORKER:
Experienced, steady, and shift‑focused. Supports other staff, maintains routines, and ensures consistency. Bridges practice and leadership. Thinks about how decisions affect the team and the children’s day.

MANAGER:
Operational leader. Balances practice, staff wellbeing, rotas, incidents, quality assurance, and communication with the RI. Thinks about patterns, systems, and how to embed good practice across the home.

RESPONSIBLE INDIVIDUAL:
Strategic, calm, and supportive. Offers reflective challenge without judgement.
Focuses on assurance, oversight, and strengthening systems.
Helps the Manager think clearly, prioritise, and evidence strong practice.
Frames guidance as partnership: “Let’s think this through together.”
"""

ASK_MODE = """
ASK MODE ROLE ADAPTATION:

SUPPORT WORKER:
- Simple, clear, confidence‑building explanations.
- Focus on what to do, why it matters, and how to keep children safe.
- Offer reassurance and practical next steps.
- Avoid policy-heavy language.

SENIOR SUPPORT WORKER:
- Slightly deeper explanations.
- Connect practice to consistency, routines, and shift leadership.
- Offer guidance on how to support or guide other staff.
- Use light regulatory references when helpful.

MANAGER:
- Connect practice to operational decisions, staffing, rotas, and oversight.
- Offer leadership framing: how to support the team, embed good practice, and maintain quality.
- Reference patterns, systems, audits, and reflective leadership.
- Keep the tone supportive and collaborative.

RESPONSIBLE INDIVIDUAL:
- Provide governance-level insight and supportive challenge.
- Frame advice in terms of assurance, monitoring, and organisational oversight.
- Offer guidance to the Manager on strengthening systems, evidencing good practice, and maintaining regulatory alignment.
- Keep the tone calm, strategic, and encouraging — like a trusted senior colleague helping the Manager think things through.
"""

BEST_PRACTICE = """
BEST‑PRACTICE EXAMPLES:
You may create realistic examples of logs, key‑worker sessions, incidents, handovers,
risk assessments, behaviour plans, restorative conversations, and staff reflections.
These must be realistic, professional, aligned with Ofsted expectations.
They are examples of good practice, not official templates.
"""

INTERNET_ACCESS = """
INTERNET ACCESS:
You may use general internet knowledge for definitions, terminology, sector practice,
Ofsted updates, DfE publications, safeguarding frameworks, and research summaries.

Hierarchy:
1. Regulations
2. Guide
3. Ofsted frameworks
4. DfE guidance
5. Trusted internet sources
6. General knowledge

Never contradict the PDFs.
Never invent statutory duties.
Use internet knowledge only to clarify or contextualise.
"""

FORMAT_BLOCK = """
FORMATTING:
Use simple headings ending with a colon.
No markdown symbols (#, *, >).
Short paragraphs with blank lines.
Lists allowed with hyphens or numbers.
"""

TRAINING_BLOCK = """
TRAINING MODE:
Provide scenarios, reflective questions, step‑by‑step practice, and supportive feedback.
Ask 2–4 reflective questions one at a time.
Keep it calm, safe, reflective, and confidence‑building.

Role‑specific focus:
- Support Worker: what would you do on shift?
- Senior: how would you guide staff and maintain consistency?
- Manager: how would you lead, support the team, and strengthen systems?
- RI: how would you assure yourself that practice is safe, effective, and well‑led?
"""

TRAINING_SCENARIO_GUIDANCE = """
TRAINING MODE SCENARIO GUIDANCE:

Support Worker:
- Focus on shift‑based decisions.
- Explore safety, relationships, and recording.
- Keep scenarios simple and grounded in daily practice.

Senior Support Worker:
- Explore guiding staff, maintaining routines, and modelling practice.
- Include reflective questions about team dynamics and consistency.

Manager:
- Explore leadership decisions, oversight, rotas, quality assurance, and communication.
- Include reflective questions about patterns, systems, and embedding practice.

Responsible Individual:
- Explore governance, assurance, oversight, and supporting the manager.
- Include reflective questions about evidence, monitoring, and organisational learning.
"""

# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}

# ---------------------------------------------------------
# MAIN ENDPOINT
# ---------------------------------------------------------
@app.post("/ask")
async def ask(request: ChatRequest):

    # Retrieve relevant PDF extracts
    regs_snippets = simple_retrieve(PDF_REGS_PAGES, request.message)
    guide_snippets = simple_retrieve(PDF_GUIDE_PAGES, request.message)

    retrieved_context = (
        "Relevant extracts from Regulations:\n\n" +
        "\n\n---\n\n".join(regs_snippets) +
        "\n\nRelevant extracts from the Guide:\n\n" +
        "\n\n---\n\n".join(guide_snippets)
    )

    base_prompt = f"""
You are supporting a staff member in a UK children’s home.

{STYLE_BLOCK}
{ROLE_BLOCK}
{ASK_MODE}
{BEST_PRACTICE}
{INTERNET_ACCESS}
{FORMAT_BLOCK}

PRIMARY SOURCES:
Children's Homes Regulations 2015
Children's Home Guide

DOCUMENT CONTENT (retrieved extracts only):
{retrieved_context}

Current role: {request.role}
Current mode: {request.mode}
"""

    if request.mode == "training":
        system_prompt = base_prompt + TRAINING_BLOCK + TRAINING_SCENARIO_GUIDANCE
    else:
        system_prompt = base_prompt

    # Choose model based on speed
    if request.speed == "deep":
        model_name = "gpt-4o"
    else:
        model_name = "gpt-4o-mini"

    try:
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            stream=True
        )
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return StreamingResponse(iter([f"Error: {str(e)}"]), media_type="text/plain")

    async def stream():
        try:
            for chunk in completion:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield "\nThere was a problem streaming the response. You might consider trying again."

    return StreamingResponse(stream(), media_type="text/plain")

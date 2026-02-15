from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import chromadb
from openai import OpenAI
import os

# -----------------------------
# FASTAPI SETUP
# -----------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# OPENAI CLIENT
# -----------------------------
client = OpenAI()

# -----------------------------
# SYSTEM PROMPT FOR EXPANDED ANSWERS
# -----------------------------
SYSTEM_PROMPT = """
You are a specialist assistant for children's homes.

Your current persona is: {role}

If role=new_starter:
    Be gentle, encouraging, and confidence-building.
    Break things down simply.
    Normalise uncertainty.

If role=manager:
    Be structured, decisive, and operational.
    Focus on risk, proportionality, and oversight.

If role=ri:
    Think strategically and reflectively.
    Focus on governance, culture, quality, and reliability.

If role=ofsted:
    Be objective, curious, and evidence-focused.
    Reflect on SCCIF, regulation, and lived experience.

If role=standard:
    Be warm, balanced, and professional.

Always give expanded, structured answers with headings, paragraphs, and bullet points.
"""

# -----------------------------
# CONNECT TO CHROMA
# -----------------------------
CHROMA_DIR = "chroma_db"

chroma_client = chromadb.PersistentClient(
    path=CHROMA_DIR,
    settings=chromadb.config.Settings(chroma_server_nofile=4096)
)

collection = chroma_client.get_or_create_collection(
    name="children_home_docs",
    metadata={"hnsw:space": "cosine"}
)

# -----------------------------
# STREAMING ENDPOINT
# -----------------------------
@app.post("/ask")
async def ask_question(payload: dict):
    question = payload["question"]
    role = payload.get("role", "standard")

    # Retrieve relevant context from Chroma
    results = collection.query(
        query_texts=[question],
        n_results=4
    )

    context_chunks = results["documents"][0] if results["documents"] else []
    context = "\n\n".join(context_chunks)

    # Build the messages for the model
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(role=role)},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
    ]

    # Generator for streaming
    def generate():
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            stream=True
        )

        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.get("content"):
                yield chunk.choices[0].delta["content"]


    return StreamingResponse(generate(), media_type="text/plain")




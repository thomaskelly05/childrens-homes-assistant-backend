# assistant/retrieval.py

import os
import psycopg2
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def get_db_connection():

    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        database=os.environ.get("DB_NAME", "indicare"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "postgres")
    )


def embed_query(text: str):

    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )

    return response.data[0].embedding


def retrieve_knowledge(query: str, limit: int = 5):

    conn = get_db_connection()
    cur = conn.cursor()

    embedding = embed_query(query)

    cur.execute(
        """
        SELECT
            content,
            document_title,
            section,
            page_number
        FROM indicare_knowledge
        ORDER BY embedding <-> %s
        LIMIT %s
        """,
        (embedding, limit)
    )

    rows = cur.fetchall()

    cur.close()
    conn.close()

    if not rows:
        return ""

    context = []
    citations = []

    for i, row in enumerate(rows):

        content, doc, section, page = row

        context.append(f"[{i+1}] {content}")
        citations.append(f"[{i+1}] {doc} – {section} (p.{page})")

    context_text = "\n\n".join(context)
    citation_text = "\n".join(citations)

    return f"""
Guidance excerpts:

{context_text}

Sources:
{citation_text}
"""

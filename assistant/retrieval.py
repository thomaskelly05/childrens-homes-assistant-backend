import json
import os


KNOWLEDGE_FILE = "assistant/knowledge_store.json"


def load_knowledge():

    if not os.path.exists(KNOWLEDGE_FILE):
        return []

    with open(KNOWLEDGE_FILE, "r") as f:
        return json.load(f)


def search_knowledge(query: str, limit: int = 5):

    knowledge = load_knowledge()

    query_words = query.lower().split()

    results = []

    for item in knowledge:

        text = item["text"].lower()

        score = sum(word in text for word in query_words)

        if score > 0:
            results.append((score, item["text"]))

    results.sort(reverse=True)

    return [r[1] for r in results[:limit]]

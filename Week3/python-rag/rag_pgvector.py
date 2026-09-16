from __future__ import annotations

import argparse
import hashlib
import math
import os
import re
from pathlib import Path
from typing import List, Sequence

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector


ROOT = Path(__file__).parent
OFFLINE_DIMENSIONS = 128
STOP_WORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "the", "to", "what", "when", "where", "who", "why", "with"}


def chunk_text(text: str, chunk_size: int = 120, overlap: int = 20) -> List[str]:
    words = text.split()
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")
    step = chunk_size - overlap
    return [" ".join(words[start : start + chunk_size]).strip() for start in range(0, len(words), step) if words[start : start + chunk_size]]


def words(value: str) -> set[str]:
    return {word for word in re.findall(r"[a-z0-9]+", value.lower()) if word not in STOP_WORDS}


def deterministic_embedding(text: str) -> List[float]:
    """Create a repeatable local vector when OpenAI quota is unavailable."""
    vector = [0.0] * OFFLINE_DIMENSIONS
    for token in words(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % OFFLINE_DIMENSIONS
        vector[index] += 1.0 if digest[4] % 2 else -1.0
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


def openai_embeddings(client, values: Sequence[str]) -> List[List[float]]:
    response = client.embeddings.create(model="text-embedding-3-small", input=list(values))
    return [item.embedding for item in response.data]


def local_answer(question: str, context: Sequence[str]) -> str:
    question_words = words(question)
    sentences = [sentence.strip() for chunk in context for sentence in re.split(r"(?<=[.!?])\s+", chunk) if sentence.strip()]
    ranked = sorted(sentences, key=lambda sentence: len(question_words & words(sentence)), reverse=True)
    if not ranked or not (question_words & words(ranked[0])):
        return "I could not find an answer in the knowledge base."
    return ranked[0]


def generate_answer(client, question: str, context: Sequence[str]) -> str:
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.2,
        messages=[
            {"role": "system", "content": "Answer only from the supplied context. Say you do not know when the context is insufficient."},
            {"role": "user", "content": f"Context:\n{chr(10).join(context)}\n\nQuestion: {question}"},
        ],
    )
    return response.choices[0].message.content or "The model returned an empty answer."


def ensure_schema(connection: psycopg.Connection) -> None:
    connection.execute("CREATE EXTENSION IF NOT EXISTS vector")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS rag_chunks (
            id BIGSERIAL PRIMARY KEY,
            source TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding vector NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (source, content)
        )
    """)
    connection.commit()


def ingest(connection: psycopg.Connection, source: str, chunks: Sequence[str], embeddings: Sequence[Sequence[float]]) -> None:
    connection.execute("DELETE FROM rag_chunks WHERE source = %s", (source,))
    for chunk, embedding in zip(chunks, embeddings):
        connection.execute("INSERT INTO rag_chunks (source, content, embedding) VALUES (%s, %s, %s)", (source, chunk, list(embedding)))
    connection.commit()


def retrieve(connection: psycopg.Connection, embedding: Sequence[float], top_k: int) -> List[str]:
    rows = connection.execute(
        "SELECT content FROM rag_chunks ORDER BY embedding <=> %s::vector LIMIT %s",
        (list(embedding), top_k),
    ).fetchall()
    return [row[0] for row in rows]


def main() -> None:
    parser = argparse.ArgumentParser(description="PostgreSQL pgvector RAG demo")
    parser.add_argument("--question", required=True)
    parser.add_argument("--file", type=Path, default=ROOT / "knowledge.txt")
    parser.add_argument("--top-k", type=int, default=3)
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    database_url = os.getenv("DATABASE_URL", "postgresql://admin:password@localhost:5432/user_management")
    chunks = chunk_text(args.file.read_text(encoding="utf-8"))
    client = None
    warning = ""

    if os.getenv("OPENAI_API_KEY"):
        from openai import OpenAI

        client = OpenAI()

    with psycopg.connect(database_url) as connection:
        register_vector(connection)
        ensure_schema(connection)
        try:
            embeddings = openai_embeddings(client, chunks) if client else [deterministic_embedding(chunk) for chunk in chunks]
            query_embedding = openai_embeddings(client, [args.question])[0] if client else deterministic_embedding(args.question)
        except Exception as error:
            warning = f"OpenAI embeddings unavailable ({type(error).__name__}); using deterministic local vectors."
            client = None
            embeddings = [deterministic_embedding(chunk) for chunk in chunks]
            query_embedding = deterministic_embedding(args.question)

        ingest(connection, args.file.name, chunks, embeddings)
        context = retrieve(connection, query_embedding, args.top_k)

    print(f"Stored {len(chunks)} chunk(s) in pgvector.")
    print(f"Retrieved {len(context)} nearest chunk(s) with cosine distance.\n")
    for index, chunk in enumerate(context, start=1):
        print(f"[{index}] {chunk}\n")

    if client:
        try:
            print("Answer:\n")
            print(generate_answer(client, args.question, context))
        except Exception as error:
            warning = f"OpenAI generation unavailable ({type(error).__name__}); using local grounded answer."
            print("Answer (local grounded fallback):\n")
            print(local_answer(args.question, context))
    else:
        print("Answer (local grounded fallback):\n")
        print(local_answer(args.question, context))

    if warning:
        print(f"\nNote: {warning}")


if __name__ == "__main__":
    main()
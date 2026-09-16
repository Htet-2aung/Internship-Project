from __future__ import annotations

import argparse
import math
import os
import re
from pathlib import Path
from typing import List, Sequence

from dotenv import load_dotenv


ROOT = Path(__file__).parent
STOP_WORDS = {"a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "the", "to", "what", "when", "where", "who", "why", "with"}


def content_words(value: str) -> set[str]:
    return {word for word in re.findall(r"[a-z0-9]+", value.lower()) if word not in STOP_WORDS}


def chunk_text(text: str, chunk_size: int = 120, overlap: int = 20) -> List[str]:
    words = text.split()
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")
    chunks = []
    step = chunk_size - overlap
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_size]).strip()
        if chunk:
            chunks.append(chunk)
    return chunks


def lexical_score(query: str, document: str) -> int:
    query_words = content_words(query)
    document_words = content_words(document)
    return len(query_words & document_words)


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def retrieve_with_lexical_search(query: str, chunks: Sequence[str], top_k: int) -> List[str]:
    ranked = sorted(chunks, key=lambda chunk: lexical_score(query, chunk), reverse=True)
    return list(ranked[:top_k])


def generate_local_answer(question: str, context: Sequence[str]) -> str:
    """Return a grounded extractive answer when no hosted LLM is configured."""
    question_words = content_words(question)
    sentences = [
        sentence.strip()
        for chunk in context
        for sentence in re.split(r"(?<=[.!?])\s+", chunk)
        if sentence.strip()
    ]
    ranked = sorted(
        sentences,
        key=lambda sentence: len(question_words & content_words(sentence)),
        reverse=True,
    )
    if not ranked or not lexical_score(question, ranked[0]):
        return "I could not find an answer in the knowledge base."
    return ranked[0]


def retrieve_with_embeddings(client, query: str, chunks: Sequence[str], top_k: int) -> List[str]:
    chunk_response = client.embeddings.create(model="text-embedding-3-small", input=list(chunks))
    query_response = client.embeddings.create(model="text-embedding-3-small", input=[query])
    query_embedding = query_response.data[0].embedding
    ranked = sorted(
        zip(chunks, (item.embedding for item in chunk_response.data)),
        key=lambda item: cosine_similarity(query_embedding, item[1]),
        reverse=True,
    )
    return [chunk for chunk, _ in ranked[:top_k]]


def generate_answer(client, question: str, context: Sequence[str]) -> str:
    joined_context = "\n\n".join(context)
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": "Answer only from the supplied context. If the answer is not present, say you do not know.",
            },
            {
                "role": "user",
                "content": f"Context:\n{joined_context}\n\nQuestion: {question}",
            },
        ],
    )
    return response.choices[0].message.content or "The model returned an empty answer."


def main() -> None:
    parser = argparse.ArgumentParser(description="Small retrieval-augmented generation demo")
    parser.add_argument("--question", required=True, help="Question to ask about the knowledge file")
    parser.add_argument("--file", type=Path, default=ROOT / "knowledge.txt")
    parser.add_argument("--top-k", type=int, default=3)
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    text = args.file.read_text(encoding="utf-8")
    chunks = chunk_text(text)
    api_key = os.getenv("OPENAI_API_KEY")

    client = None
    api_warning = ""
    if api_key:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        try:
            retrieved = retrieve_with_embeddings(client, args.question, chunks, args.top_k)
        except Exception as error:
            api_warning = f"OpenAI retrieval unavailable ({type(error).__name__}); using local retrieval instead."
            client = None
            retrieved = retrieve_with_lexical_search(args.question, chunks, args.top_k)
    else:
        retrieved = retrieve_with_lexical_search(args.question, chunks, args.top_k)

    print(f"Retrieved {len(retrieved)} context chunk(s):\n")
    for index, chunk in enumerate(retrieved, start=1):
        print(f"[{index}] {chunk}\n")

    if client:
        try:
            print("Answer:\n")
            print(generate_answer(client, args.question, retrieved))
        except Exception as error:
            api_warning = f"OpenAI generation unavailable ({type(error).__name__}); using a local grounded answer instead."
            print("Answer (local grounded fallback):\n")
            print(generate_local_answer(args.question, retrieved))
    else:
        print("Answer (local grounded fallback):\n")
        print(generate_local_answer(args.question, retrieved))

    if api_warning:
        print(f"\nNote: {api_warning}")


if __name__ == "__main__":
    main()

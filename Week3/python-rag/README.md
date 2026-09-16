# Python RAG Demo

This demo implements the Week 3 pipeline:

1. Read a text file.
2. Split it into overlapping chunks.
3. Retrieve the most relevant chunks.
4. Generate an answer from retrieved context.

The upgraded `rag_pgvector.py` version adds a real PostgreSQL vector store:

1. Enables the PostgreSQL `vector` extension.
2. Stores chunks and embeddings in `rag_chunks`.
3. Retrieves nearest chunks with pgvector cosine distance.
4. Sends the retrieved context to GPT-4o-mini when OpenAI is available.

With `OPENAI_API_KEY`, retrieval uses `text-embedding-3-small` and generation uses `gpt-4o-mini`. Without a key, the demo uses lexical retrieval and a local extractive answer generator, so the complete pipeline still runs offline.

## Run

```bash
cd Week3/python-rag
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python rag_demo.py --question "What is RAG?"
```

Run the pgvector version against the Docker database:

```bash
docker compose up -d db
docker compose --profile rag build
docker compose --profile rag run --rm rag
```

The pgvector demo uses OpenAI embeddings when `OPENAI_API_KEY` is available. If OpenAI returns a quota or rate-limit error, it uses deterministic local vectors so storage and nearest-neighbor retrieval can still be demonstrated.

To enable embeddings and answer generation, create a local `.env` file:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

The `.env` file should not be committed. The original `rag_demo.py` is the lightweight file-only version; `rag_pgvector.py` is the database-backed Week 3 implementation.

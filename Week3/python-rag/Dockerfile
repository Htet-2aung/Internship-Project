FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY knowledge.txt rag_demo.py rag_pgvector.py ./

CMD ["python", "rag_demo.py", "--question", "What is RAG?"]